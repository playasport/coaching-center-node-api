/**
 * Delete all batches from MongoDB whose center matches coaching centre IDs from a JSON file.
 *
 * This is a HARD DELETE (permanent removal from the database).
 *
 * Usage:
 *   npm run delete:batches-by-centers -- <path-to-json>
 *   npm run delete:batches-by-centers -- --dry-run <path-to-json>
 *
 * The JSON file should have the format produced by export-center-ids-from-mysql.ts:
 *   { "centers": [{ "id": "uuid", "name": "..." }, ...] }
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { CoachingCenterModel } from '../src/models/coachingCenter.model';
import { BatchModel } from '../src/models/batch.model';
import { Types } from 'mongoose';

const DRY_RUN = process.argv.includes('--dry-run');
const LOGS_DIR = path.join(process.cwd(), 'logs');

function getJsonPath(): string {
  const args = process.argv.filter((a) => !a.startsWith('--'));
  const filePath = args[args.length - 1];

  if (!filePath || filePath.endsWith('.ts') || filePath.endsWith('.js')) {
    console.error('❌ Please provide the JSON file path');
    console.error('   Usage: npm run delete:batches-by-centers -- <path-to-json>');
    console.error('   Example: npm run delete:batches-by-centers -- ./exports/center-ids-2026-02-27.json');
    process.exit(1);
  }

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`❌ File not found: ${resolved}`);
    process.exit(1);
  }
  return resolved;
}

async function main() {
  const jsonPath = getJsonPath();

  console.log(`\n🗑️  Delete batches by center IDs`);
  console.log(`   File: ${jsonPath}`);
  if (DRY_RUN) console.log('   🔍 DRY RUN - no changes will be made');
  console.log('');

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const parsed = JSON.parse(raw);

  const centers: Array<{ id: string; name: string }> = parsed.centers;
  if (!centers || !Array.isArray(centers) || centers.length === 0) {
    console.error('❌ No centers found in JSON file');
    process.exit(1);
  }

  console.log(`  📦 Center IDs from file: ${centers.length}\n`);

  await connectDatabase();
  console.log('✅ Database connected\n');

  const centerUuids = centers.map((c) => c.id);

  // Resolve MySQL UUIDs → MongoDB ObjectIds
  console.log('  🔍 Resolving center IDs in MongoDB...');
  const mongoCenters = await CoachingCenterModel.find({ id: { $in: centerUuids } })
    .select('_id id center_name')
    .lean();

  const centerMap = new Map<string, { _id: Types.ObjectId; name: string }>();
  for (const mc of mongoCenters as any[]) {
    centerMap.set(mc.id, { _id: mc._id, name: mc.center_name });
  }

  console.log(`    → Found ${centerMap.size} / ${centerUuids.length} centers in MongoDB\n`);

  const notFound = centerUuids.filter((id) => !centerMap.has(id));
  if (notFound.length > 0) {
    console.log(`  ⚠️  ${notFound.length} center(s) not found in MongoDB (skipped)`);
  }

  if (centerMap.size === 0) {
    console.log('  ℹ️  No matching centers in MongoDB. Nothing to delete.\n');
    await disconnectDatabase();
    process.exit(0);
  }

  const centerObjectIds = [...centerMap.values()].map((c) => c._id);

  // Count batches that will be affected
  const totalBatches = await BatchModel.countDocuments({ center: { $in: centerObjectIds } });
  console.log(`  📊 Total batches to delete: ${totalBatches}\n`);

  if (totalBatches === 0) {
    console.log('  ℹ️  No batches found for these centers. Nothing to delete.\n');
    await disconnectDatabase();
    process.exit(0);
  }

  // Collect details for the log before deleting
  const batchesToDelete = await BatchModel.find({ center: { $in: centerObjectIds } })
    .select('_id name center sport')
    .lean();

  const logEntries = batchesToDelete.map((b: any) => {
    const centerInfo = [...centerMap.entries()].find(
      ([, v]) => v._id.toString() === b.center.toString()
    );
    return {
      batch_id: b._id.toString(),
      batch_name: b.name,
      center_uuid: centerInfo?.[0] ?? 'unknown',
      center_name: centerInfo?.[1]?.name ?? 'unknown',
    };
  });

  if (!DRY_RUN) {
    const result = await BatchModel.deleteMany({ center: { $in: centerObjectIds } });
    console.log(`  ✅ Deleted ${result.deletedCount} batches\n`);
  } else {
    console.log(`  🔍 Would delete ${totalBatches} batches (dry run)\n`);
  }

  // Save log
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFilename = DRY_RUN
    ? `delete-batches-by-centers-dry-run-${timestamp}.json`
    : `delete-batches-by-centers-${timestamp}.json`;
  const logPath = path.join(LOGS_DIR, logFilename);

  const logOutput = {
    run_at: new Date().toISOString(),
    dry_run: DRY_RUN,
    source_file: jsonPath,
    centers_in_file: centers.length,
    centers_found_in_mongo: centerMap.size,
    centers_not_found: notFound,
    total_batches_deleted: DRY_RUN ? 0 : totalBatches,
    total_batches_would_delete: totalBatches,
    batches: logEntries,
  };

  fs.writeFileSync(logPath, JSON.stringify(logOutput, null, 2), 'utf-8');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`  Centers in file:         ${centers.length}`);
  console.log(`  Centers found in Mongo:  ${centerMap.size}`);
  console.log(`  Batches ${DRY_RUN ? 'would delete' : 'deleted'}:     ${totalBatches}`);
  console.log(`\n  📁 Log saved: ${logPath}\n`);

  await disconnectDatabase();
}

main().catch(async (err) => {
  console.error('\n❌ Error:', err instanceof Error ? err.message : err);
  await disconnectDatabase();
  process.exit(1);
});
