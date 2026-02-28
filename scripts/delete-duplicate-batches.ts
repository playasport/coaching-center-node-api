/**
 * Script to delete duplicate batches in MongoDB.
 *
 * Duplicate = same center + name + sport + start_date + base_price + admission_fee + individual_timings
 * For each duplicate group: keeps the first batch, soft-deletes the rest.
 *
 * Run: npm run delete:duplicate-batches
 * or:  tsx scripts/delete-duplicate-batches.ts
 *
 * Options:
 *   --dry-run   Preview what would be deleted without making changes
 */

import * as fs from 'fs';
import * as path from 'path';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { CoachingCenterModel } from '../src/models/coachingCenter.model';
import { BatchModel } from '../src/models/batch.model';
import { SportModel } from '../src/models/sport.model';

const OUTPUT_DIR = path.join(process.cwd(), 'logs');
const DRY_RUN = process.argv.includes('--dry-run');

interface DeletedBatchLog {
  batch_id: string;
  center_id: string;
  center_name: string;
  sport_id: string;
  sport_name: string;
  batch_name: string;
  start_date: string;
  base_price: number;
  admission_fee: number;
  kept_batch_id: string;
  duplicate_group_key: string;
}

function timingsToKey(timings: Array<{ day: string; start_time: string; end_time: string }> | null | undefined): string {
  if (!timings || timings.length === 0) return 'default';
  return timings
    .map((t) => `${t.day}:${t.start_time}-${t.end_time}`)
    .sort()
    .join('|');
}

async function deleteDuplicateBatches() {
  try {
    if (DRY_RUN) {
      console.log('\n🔍 DRY RUN - No changes will be made\n');
    } else {
      console.log('\n🗑️  Deleting duplicate batches...\n');
    }

    await connectDatabase();
    console.log('✅ Database connected\n');

    const batches = await BatchModel.find({ is_deleted: false })
      .select('_id center name sport scheduled base_price admission_fee createdAt')
      .lean();

    const centerIds = [...new Set(batches.map((b) => (b as any).center?.toString()).filter(Boolean))];
    const sportIds = [...new Set(batches.map((b) => (b as any).sport?.toString()).filter(Boolean))];

    const [centers, sports] = await Promise.all([
      CoachingCenterModel.find({ _id: { $in: centerIds } }).select('_id id center_name').lean(),
      SportModel.find({ _id: { $in: sportIds } }).select('_id custom_id name').lean(),
    ]);

    const centerMap = new Map(centers.map((c: any) => [c._id.toString(), { id: c.id, center_name: c.center_name }]));
    const sportMap = new Map(sports.map((s: any) => [s._id.toString(), { custom_id: s.custom_id, name: s.name }]));

    console.log(`📊 Total batches (not deleted): ${batches.length}\n`);

    const groupMap = new Map<
      string,
      Array<{
        _id: string;
        center: { id: string; center_name: string };
        sport: { custom_id: string; name: string };
        name: string;
        start_date: Date;
        base_price: number;
        admission_fee: number;
        timings_key: string;
        createdAt: Date;
      }>
    >();

    for (const b of batches) {
      const center = centerMap.get((b as any).center?.toString());
      const sport = sportMap.get((b as any).sport?.toString());
      const centerId = center?.id || (b as any).center?.toString() || 'unknown';
      const centerName = center?.center_name ?? centerId;
      const sportId = sport?.custom_id || (b as any).sport?.toString() || 'unknown';
      const sportName = sport?.name ?? sportId;

      const startDate = b.scheduled?.start_date ? new Date(b.scheduled.start_date).toISOString().slice(0, 10) : 'null';
      const timingsKey = timingsToKey(b.scheduled?.individual_timings);
      const admissionFee = b.admission_fee ?? 0;

      const key = `${centerId}|${b.name}|${sportId}|${startDate}|${b.base_price}|${admissionFee}|${timingsKey}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push({
        _id: (b as any)._id.toString(),
        center: { id: centerId, center_name: centerName },
        sport: { custom_id: sportId, name: sportName },
        name: b.name,
        start_date: b.scheduled?.start_date,
        base_price: b.base_price,
        admission_fee: admissionFee,
        timings_key: timingsKey,
        createdAt: (b as any).createdAt ? new Date((b as any).createdAt) : new Date(0),
      });
    }

    const toDelete: DeletedBatchLog[] = [];
    let totalToDelete = 0;

    for (const [groupKey, items] of groupMap) {
      if (items.length > 1) {
        // Sort by createdAt to keep oldest; first stays, rest get deleted
        items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const [kept, ...duplicates] = items;
        const keptId = kept._id;

        for (const dup of duplicates) {
          toDelete.push({
            batch_id: dup._id,
            center_id: dup.center.id,
            center_name: dup.center.center_name,
            sport_id: dup.sport.custom_id,
            sport_name: dup.sport.name,
            batch_name: dup.name,
            start_date: dup.start_date ? new Date(dup.start_date).toISOString().slice(0, 10) : 'null',
            base_price: dup.base_price,
            admission_fee: dup.admission_fee,
            kept_batch_id: keptId,
            duplicate_group_key: groupKey,
          });
          totalToDelete++;
        }
      }
    }

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (totalToDelete === 0) {
      console.log('✅ No duplicate batches found. Nothing to delete.\n');
      await disconnectDatabase();
      process.exit(0);
      return;
    }

    if (!DRY_RUN) {
      let deletedCount = 0;
      for (const d of toDelete) {
        try {
          await BatchModel.findByIdAndUpdate(d.batch_id, {
            $set: {
              is_deleted: true,
              deletedAt: new Date(),
            },
          });
          deletedCount++;
          if (deletedCount % 50 === 0) {
            console.log(`  Soft-deleted ${deletedCount}/${totalToDelete} batches...`);
          }
        } catch (err) {
          console.error(`  ❌ Failed to delete batch ${d.batch_id}:`, err);
        }
      }
      console.log(`\n  Soft-deleted ${deletedCount} duplicate batches.\n`);
    }

    const logFilename = DRY_RUN
      ? `deleted-duplicate-batches-dry-run-${timestamp}.json`
      : `deleted-duplicate-batches-${timestamp}.json`;
    const logPath = path.join(OUTPUT_DIR, logFilename);

    const logOutput = {
      run_at: new Date().toISOString(),
      dry_run: DRY_RUN,
      total_batches_scanned: batches.length,
      duplicate_groups_found: new Set(toDelete.map((d) => d.duplicate_group_key)).size,
      total_deleted: DRY_RUN ? 0 : totalToDelete,
      would_delete: DRY_RUN ? totalToDelete : 0,
      deleted_batches: toDelete,
    };

    fs.writeFileSync(logPath, JSON.stringify(logOutput, null, 2), 'utf-8');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Total batches scanned:      ${batches.length}`);
    console.log(`Duplicate groups found:     ${new Set(toDelete.map((d) => d.duplicate_group_key)).size}`);
    if (DRY_RUN) {
      console.log(`Would delete:               ${totalToDelete} (dry run - no changes made)`);
    } else {
      console.log(`Deleted:                    ${totalToDelete}`);
    }
    console.log(`\n📁 Log saved to: ${logPath}\n`);

    if (toDelete.length > 0 && toDelete.length <= 20) {
      console.log('Deleted batches:');
      toDelete.forEach((d, i) => {
        console.log(`  ${i + 1}. ${d.batch_id} | ${d.center_name} | ${d.batch_name} | ${d.sport_name} | kept: ${d.kept_batch_id}`);
      });
    } else if (toDelete.length > 20) {
      console.log('Sample (first 10) deleted batches:');
      toDelete.slice(0, 10).forEach((d, i) => {
        console.log(`  ${i + 1}. ${d.batch_id} | ${d.center_name} | ${d.batch_name} | kept: ${d.kept_batch_id}`);
      });
    }

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    await disconnectDatabase();
    process.exit(1);
  }
}

deleteDuplicateBatches();
