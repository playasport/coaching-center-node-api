/**
 * Script to find duplicate batches in MongoDB.
 *
 * Duplicate = same center + name + sport + start_date + base_price + admission_fee + individual_timings
 *
 * Run: npm run log:duplicate-batches
 * or:  tsx scripts/log-duplicate-batches.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { CoachingCenterModel } from '../src/models/coachingCenter.model';
import { BatchModel } from '../src/models/batch.model';
import { SportModel } from '../src/models/sport.model';

const OUTPUT_DIR = path.join(process.cwd(), 'logs');

interface DuplicateGroup {
  center_id: string;
  center_name: string;
  sport_id: string;
  sport_name: string;
  batch_name: string;
  start_date: string;
  base_price: number;
  admission_fee: number;
  timings_key: string;
  count: number;
  batch_ids: string[];
}

function timingsToKey(timings: Array<{ day: string; start_time: string; end_time: string }> | null | undefined): string {
  if (!timings || timings.length === 0) return 'default';
  return timings
    .map((t) => `${t.day}:${t.start_time}-${t.end_time}`)
    .sort()
    .join('|');
}

async function logDuplicateBatches() {
  try {
    console.log('\n🔍 Scanning for duplicate batches...\n');

    await connectDatabase();
    console.log('✅ Database connected\n');

    const batches = await BatchModel.find({ is_deleted: false })
      .select('_id center name sport scheduled base_price admission_fee')
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

    const groupMap = new Map<string, Array<{ _id: string; center: any; sport: any; name: string; start_date: Date; base_price: number; admission_fee: number; timings_key: string }>>();

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
      });
    }

    const duplicateGroups: DuplicateGroup[] = [];
    for (const [key, items] of groupMap) {
      if (items.length > 1) {
        const first = items[0];
        duplicateGroups.push({
          center_id: (first.center as any)?.id || (first.center as any)?._id?.toString(),
          center_name: (first.center as any)?.center_name || 'Unknown',
          sport_id: (first.sport as any)?.custom_id || (first.sport as any)?._id?.toString(),
          sport_name: (first.sport as any)?.name || 'Unknown',
          batch_name: first.name,
          start_date: first.start_date ? new Date(first.start_date).toISOString().slice(0, 10) : 'null',
          base_price: first.base_price,
          admission_fee: first.admission_fee,
          timings_key: first.timings_key,
          count: items.length,
          batch_ids: items.map((i) => i._id),
        });
      }
    }

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(OUTPUT_DIR, `duplicate-batches-${timestamp}.json`);

    const output = {
      generated_at: new Date().toISOString(),
      total_batches_checked: batches.length,
      duplicate_groups_count: duplicateGroups.length,
      total_duplicate_batches: duplicateGroups.reduce((sum, g) => sum + g.count, 0),
      data: duplicateGroups,
    };

    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf-8');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Total batches checked:     ${batches.length}`);
    console.log(`Duplicate groups found:    ${duplicateGroups.length}`);
    console.log(`Total duplicate batches:   ${output.total_duplicate_batches}`);
    console.log(`\n📁 JSON log saved to: ${outputFile}\n`);

    if (duplicateGroups.length > 0) {
      console.log('Sample duplicate groups:');
      duplicateGroups.slice(0, 10).forEach((g, i) => {
        console.log(`  ${i + 1}. ${g.center_name} | ${g.batch_name} | ${g.sport_name} | ₹${g.base_price} | count: ${g.count}`);
        console.log(`     Batch IDs: ${g.batch_ids.slice(0, 3).join(', ')}${g.count > 3 ? '...' : ''}`);
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

logDuplicateBatches();
