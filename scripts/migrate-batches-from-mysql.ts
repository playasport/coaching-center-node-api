/**
 * Migration Script: MySQL (playasport) batches -> MongoDB batches
 *
 * Reads from MySQL:
 *   - batches
 *   - fee_structures, fee_structure_details (for base_price, admission_fee, discounted_price)
 *   - batch_timings (for individual_timings - time per day)
 *   - age_groups (for age range)
 *
 * Writes to MongoDB Batch collection.
 *
 * Run: tsx scripts/migrate-batches-from-mysql.ts
 *
 * Prerequisites:
 *   - Coaching centers and sports must be migrated first (run migrate:coaching-centers)
 *   - .env: MYSQL_DB_HOST, MYSQL_DB_USER, MYSQL_DB_PASSWORD, MYSQL_DB_NAME
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { BatchModel } from '../src/models/batch.model';
import { CoachingCenterModel } from '../src/models/coachingCenter.model';
import { SportModel } from '../src/models/sport.model';
import { BatchStatus } from '../src/enums/batchStatus.enum';
import { DurationType } from '../src/enums/durationType.enum';
import { Gender } from '../src/enums/gender.enum';
import { Types } from 'mongoose';

// Day name mapping: MySQL uses capitalized (Monday, Tuesday) - we need lowercase
const DAY_MAP: Record<string, string> = {
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
  sunday: 'sunday',
};

/**
 * Convert 12-hour time (e.g. "11:00 AM") or "HH:MM:SS" to "HH:MM" 24-hour
 */
function to24Hour(timeStr: string | null | undefined): string {
  if (!timeStr) return '09:00';
  const s = String(timeStr).trim();
  if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(s)) {
    return s.substring(0, 5);
  }
  const m = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = m[2];
    if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    else if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${min}`;
  }
  return '09:00';
}

/**
 * Parse session_days string like "Tuesday,Wednesday" or "Monday,Tuesday,Wednesday" to lowercase array
 */
function parseSessionDays(sessionDays: string | null | undefined): string[] {
  if (!sessionDays) return [];
  return sessionDays
    .split(/[,;\s]+/)
    .map((d) => d.trim().toLowerCase())
    .filter((d) => DAY_MAP[d] || Object.keys(DAY_MAP).includes(d));
}

/**
 * Ensure end_time > start_time (Batch model validation).
 * If equal or invalid, add 1 hour to end_time.
 */
function ensureEndAfterStart(
  timings: { day: string; start_time: string; end_time: string }[]
): { day: string; start_time: string; end_time: string }[] {
  return timings.map((t) => {
    const [sh, sm] = t.start_time.split(':').map(Number);
    const [eh, em] = t.end_time.split(':').map(Number);
    const startMin = (isNaN(sh) ? 9 : sh) * 60 + (isNaN(sm) ? 0 : sm);
    let endMin = (isNaN(eh) ? 18 : eh) * 60 + (isNaN(em) ? 0 : em);
    if (endMin <= startMin) endMin = startMin + 60; // add 1 hour
    const ehNew = Math.floor(endMin / 60) % 24;
    const emNew = endMin % 60;
    return {
      ...t,
      end_time: `${ehNew.toString().padStart(2, '0')}:${emNew.toString().padStart(2, '0')}`,
    };
  });
}

/**
 * Normalize day string to lowercase
 */
function normalizeDay(day: string | null | undefined): string | null {
  if (!day) return null;
  const d = String(day).toLowerCase();
  return DAY_MAP[d] || (Object.keys(DAY_MAP).includes(d) ? d : null);
}

async function connectMySQL() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_DB_HOST || 'localhost',
    user: process.env.MYSQL_DB_USER || 'root',
    password: process.env.MYSQL_DB_PASSWORD || '',
    database: process.env.MYSQL_DB_NAME || 'playasport',
    enableKeepAlive: true,
  });
  console.log('MySQL connected:', process.env.MYSQL_DB_NAME);
  return conn;
}

interface MysqlBatch {
  id: string;
  coaching_centre_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  sport_id: string | null;
  age_id: string | null;
  batch_size: number | null;
  session_days: string | null;
  start_time: string | null;
  end_time: string | null;
  number_of_session: number | null;
  price: number | null;
  actual_price: number | null;
  brief_details: string | null;
  is_active: number;
  deleted_at: string | null;
  admission_fee: number | null;
}

interface MysqlBatchTiming {
  day: string;
  start_time: string;
  end_time: string;
  sport_id: string | null;
}

interface MysqlFeeStructure {
  id: string;
  coaching_centre_id: string;
  sport_id: string | null;
  admission_fee: number;
  fee_type: string;
}

interface MysqlFeeStructureDetail {
  id: string;
  fee_structure_id: string;
  base_price: number;
  discounted_price: number | null;
  duration_value: number | null;
  duration_unit: string | null;
}

interface MysqlAgeGroup {
  id: string;
  minimum_age: number | null;
  maximum_age: number | null;
}

async function runMigration() {
  const mysqlConn = await connectMySQL();

  try {
    await connectDatabase();

    const [batches] = await mysqlConn.execute<mysql.RowDataPacket[]>(
      `SELECT id, coaching_centre_id, name, start_date, end_date, sport_id, age_id,
              batch_size, session_days, start_time, end_time, number_of_session,
              price, actual_price, brief_details, is_active, deleted_at, admission_fee
       FROM batches
       WHERE deleted_at IS NULL
       ORDER BY created_at ASC`
    );

    console.log(`Found ${batches.length} batches to migrate`);

    // Diagnostic: check center/sport coverage
    const mongoCenters = await CoachingCenterModel.find().select('id').lean();
    const mongoCenterIds = new Set(mongoCenters.map((c) => (c as { id: string }).id));
    const mongoSports = await SportModel.find().select('custom_id').lean();
    const mongoSportIds = new Set(mongoSports.map((s) => (s as { custom_id: string }).custom_id));

    const batchCenterIds = new Set((batches as MysqlBatch[]).map((b) => b.coaching_centre_id));
    const batchSportIds = new Set((batches as MysqlBatch[]).map((b) => b.sport_id).filter((id): id is string => Boolean(id)));
    const centersWithMatch = [...batchCenterIds].filter((id) => mongoCenterIds.has(id)).length;
    const sportsWithMatch = [...batchSportIds].filter((id) => mongoSportIds.has(id)).length;

    console.log(`\nDiagnostic:`);
    console.log(`  MongoDB centers: ${mongoCenterIds.size} | Batch center_ids with match: ${centersWithMatch}/${batchCenterIds.size}`);
    console.log(`  MongoDB sports:  ${mongoSportIds.size} | Batch sport_ids with match: ${sportsWithMatch}/${batchSportIds.size}`);
    if (centersWithMatch === 0) {
      console.log(`\n⚠️  No batch centers found in MongoDB. Run "npm run migrate:coaching-centers" first.\n`);
    }
    console.log('');

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const b of batches as MysqlBatch[]) {
      try {
        const center = await CoachingCenterModel.findOne({ id: b.coaching_centre_id }).lean();
        if (!center) {
          console.log(`  Skip batch ${b.id} (${b.name}): center ${b.coaching_centre_id} not found`);
          skipped++;
          continue;
        }

        const centerId = (center as { _id: Types.ObjectId })._id;
        const userId = (center as { user: Types.ObjectId }).user;

        let sportId: Types.ObjectId | null = null;
        if (b.sport_id) {
          const sport = await SportModel.findOne({ custom_id: b.sport_id }).select('_id').lean();
          sportId = sport ? (sport as { _id: Types.ObjectId })._id : null;
          if (!sportId) {
            console.log(`  Skip batch ${b.id}: sport ${b.sport_id} not found`);
            skipped++;
            continue;
          }
        } else {
          console.log(`  Skip batch ${b.id}: no sport_id`);
          skipped++;
          continue;
        }

        // Age from age_groups: batch.age_id first, then batch_days.age_group_id
        let ageMin = 3;
        let ageMax = 18;
        const ageGroupIdsToCheck: string[] = [];
        if (b.age_id) ageGroupIdsToCheck.push(b.age_id);
        const [bdRows] = await mysqlConn.execute<mysql.RowDataPacket[]>(
          'SELECT DISTINCT age_group_id FROM batch_days WHERE batch_id = ? AND age_group_id IS NOT NULL',
          [b.id]
        );
        for (const row of (bdRows || []) as { age_group_id: string }[]) {
          if (row.age_group_id && !ageGroupIdsToCheck.includes(row.age_group_id)) {
            ageGroupIdsToCheck.push(row.age_group_id);
          }
        }
        if (ageGroupIdsToCheck.length > 0) {
          const placeholders = ageGroupIdsToCheck.map(() => '?').join(',');
          const [ageRows] = await mysqlConn.execute<mysql.RowDataPacket[]>(
            `SELECT minimum_age, maximum_age FROM age_groups WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
            ageGroupIdsToCheck
          );
          const allAges = (ageRows || []) as MysqlAgeGroup[];
          if (allAges.length > 0) {
            const mins = allAges.map((ag) => (ag.minimum_age != null ? Number(ag.minimum_age) : 3));
            const maxs = allAges.map((ag) => (ag.maximum_age != null ? Number(ag.maximum_age) : 18));
            ageMin = Math.min(...mins);
            ageMax = Math.max(...maxs);
          }
        }
        // Batch model requires age 3-18; clamp to valid range
        ageMin = Math.max(3, Math.min(18, ageMin));
        ageMax = Math.max(3, Math.min(18, ageMax));
        if (ageMax < ageMin) ageMax = ageMin;

        // Fee: get all fee_structures + fee_structure_details for this center+sport
        // Each distinct price => separate batch; batch name = fee_type (e.g. Monthly, Package Based)
        type PricePoint = { fee_type: string; base_price: number; discounted_price: number | null; admission_fee: number };
        const pricePoints: PricePoint[] = [];

        const [fsRows] = await mysqlConn.execute<mysql.RowDataPacket[]>(
          `SELECT id, admission_fee, fee_type FROM fee_structures
           WHERE coaching_centre_id = ? AND (sport_id = ? OR sport_id IS NULL) AND deleted_at IS NULL AND is_active = 1
           ORDER BY sport_id IS NOT NULL DESC, sport_id DESC`,
          [b.coaching_centre_id, b.sport_id]
        );
        const feeStructures = (fsRows || []) as MysqlFeeStructure[];

        for (const fs of feeStructures) {
          const [fsdRows] = await mysqlConn.execute<mysql.RowDataPacket[]>(
            `SELECT base_price, discounted_price FROM fee_structure_details
             WHERE fee_structure_id = ? AND is_active = 1 ORDER BY created_at ASC`,
            [fs.id]
          );
          const details = (fsdRows || []) as MysqlFeeStructureDetail[];
          if (details.length === 0) {
            pricePoints.push({
              fee_type: fs.fee_type || 'monthly',
              base_price: Number(b.price) || Number(b.actual_price) || 0,
              discounted_price: b.actual_price != null ? Number(b.actual_price) : null,
              admission_fee: Number(fs.admission_fee) ?? Number(b.admission_fee) ?? 0,
            });
          } else {
            for (const fsd of details) {
              const bp = Number(fsd.base_price) ?? Number(b.price) ?? 0;
              const dp = fsd.discounted_price != null ? Number(fsd.discounted_price) : null;
              const af = Number(fs.admission_fee) ?? Number(b.admission_fee) ?? 0;
              pricePoints.push({
                fee_type: fs.fee_type || 'monthly',
                base_price: bp,
                discounted_price: dp,
                admission_fee: af,
              });
            }
          }
        }

        // Dedupe by price; keep first fee_type for same price
        const seen = new Set<string>();
        const uniquePricePoints: PricePoint[] = [];
        for (const pp of pricePoints) {
          const key = `${pp.base_price}|${pp.discounted_price ?? ''}|${pp.admission_fee}`;
          if (seen.has(key)) continue;
          seen.add(key);
          uniquePricePoints.push(pp);
        }

        // Fallback when no fee_structures: one batch with batch columns
        if (uniquePricePoints.length === 0) {
          uniquePricePoints.push({
            fee_type: 'monthly',
            base_price: Number(b.price) || Number(b.actual_price) || 0,
            discounted_price: b.actual_price != null ? Number(b.actual_price) : null,
            admission_fee: b.admission_fee != null ? Number(b.admission_fee) : 0,
          });
        }

        function formatFeeType(ft: string): string {
          return ft.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        }

        // Timings: prefer batch_days (batch-specific), else batch_timings (center-level)
        // Group by (start_time, end_time): same week me same day ka different time = alag batch
        // Har batch me ek din ka ek hi time hoga
        const batchSessionDays = parseSessionDays(b.session_days);
        let allSlots: { day: string; start_time: string; end_time: string }[] = [];

        const [bdTimingRows] = await mysqlConn.execute<mysql.RowDataPacket[]>(
          `SELECT day, start_time, end_time FROM batch_days WHERE batch_id = ? ORDER BY day, start_time`,
          [b.id]
        );
        const batchDaysTimings = (bdTimingRows || []) as { day: string; start_time: string; end_time: string }[];

        if (batchDaysTimings.length > 0) {
          for (const row of batchDaysTimings) {
            const day = normalizeDay(row.day);
            if (!day) continue;
            if (batchSessionDays.length > 0 && !batchSessionDays.includes(day)) continue;
            const st = to24Hour(row.start_time);
            const et = to24Hour(row.end_time);
            if (st && et) allSlots.push({ day, start_time: st, end_time: et });
          }
        }

        if (allSlots.length === 0) {
          const [btRows] = await mysqlConn.execute<mysql.RowDataPacket[]>(
            `SELECT day, start_time, end_time, sport_id FROM batch_timings
             WHERE coaching_center_id = ? ORDER BY day, start_time`,
            [b.coaching_centre_id]
          );
          let allTimings = (btRows || []) as MysqlBatchTiming[];
          if (b.sport_id && allTimings.some((t) => t.sport_id)) {
            const sportMatch = allTimings.filter((t) => t.sport_id === b.sport_id);
            if (sportMatch.length > 0) allTimings = sportMatch;
          }
          for (const bt of allTimings) {
            const day = normalizeDay(bt.day);
            if (!day) continue;
            if (batchSessionDays.length > 0 && !batchSessionDays.includes(day)) continue;
            const st = to24Hour(bt.start_time);
            const et = to24Hour(bt.end_time);
            if (st && et) allSlots.push({ day, start_time: st, end_time: et });
          }
        }

        if (allSlots.length === 0 && batchSessionDays.length > 0) {
          const st = to24Hour(b.start_time) || '09:00';
          const et = to24Hour(b.end_time) || '18:00';
          for (const day of batchSessionDays) {
            allSlots.push({ day, start_time: st, end_time: et });
          }
        }

        if (allSlots.length === 0) {
          const days = batchSessionDays.length > 0 ? batchSessionDays : ['monday'];
          const st = to24Hour(b.start_time) || '09:00';
          const et = to24Hour(b.end_time) || '18:00';
          for (const day of days) allSlots.push({ day, start_time: st, end_time: et });
        }

        // Group by (start_time, end_time): har time-slot ka alag batch
        const timeSlotKey = (s: { start_time: string; end_time: string }) => `${s.start_time}-${s.end_time}`;
        const slotGroups = new Map<string, { day: string; start_time: string; end_time: string }[]>();
        for (const s of allSlots) {
          const key = timeSlotKey(s);
          if (!slotGroups.has(key)) slotGroups.set(key, []);
          slotGroups.get(key)!.push(s);
        }

        const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const byDay = (a: { day: string }, b: { day: string }) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        const byDayStr = (a: string, b: string) => dayOrder.indexOf(a) - dayOrder.indexOf(b);

        // Each slot group = one batch (har din ka ek hi time in that batch)
        const timingGroups: { individualTimings: typeof allSlots; trainingDays: string[] }[] = [];
        for (const [, slots] of slotGroups) {
          const individualTimings = ensureEndAfterStart(slots).sort(byDay);
          const trainingDays = [...new Set(slots.map((x) => x.day))].sort(byDayStr);
          timingGroups.push({ individualTimings, trainingDays });
        }

        if (timingGroups.length === 0) {
          timingGroups.push({
            individualTimings: [{ day: 'monday', start_time: '09:00', end_time: '18:00' }],
            trainingDays: ['monday'],
          });
        }

        const startDate = b.start_date ? new Date(b.start_date) : new Date();
        const endDate = b.end_date ? new Date(b.end_date) : null;

        const capacityMin = Math.max(1, b.batch_size ?? 10);
        const capacityMax = b.batch_size ?? 30;

        const durationCount = b.number_of_session ?? 1;
        const durationType = DurationType.MONTH;

        for (const pp of uniquePricePoints) {
          for (const tg of timingGroups) {
            const batchName = formatFeeType(pp.fee_type);
            const timeLabel = tg.individualTimings[0]
              ? `${tg.individualTimings[0].start_time}-${tg.individualTimings[0].end_time}`
              : '';

            const existing = await BatchModel.findOne({
              center: centerId,
              name: batchName,
              'scheduled.start_date': startDate,
              base_price: pp.base_price,
              admission_fee: pp.admission_fee,
              'scheduled.individual_timings': { $eq: tg.individualTimings },
              is_deleted: false,
            });
            if (existing) {
              console.log(`  Skip batch ${b.id} (${batchName}, ${pp.base_price}, ${timeLabel}): already exists`);
              skipped++;
              continue;
            }

            const batchDoc = {
              user: userId,
              name: batchName,
              description: b.brief_details || null,
              sport: sportId,
              center: centerId,
              coach: null,
              gender: [Gender.MALE, Gender.FEMALE],
              certificate_issued: false,
              scheduled: {
                start_date: startDate,
                end_date: endDate,
                training_days: tg.trainingDays,
                start_time: null,
                end_time: null,
                individual_timings: tg.individualTimings,
              },
              duration: { count: durationCount, type: durationType },
              capacity: { min: capacityMin, max: capacityMax },
              age: { min: ageMin, max: ageMax },
              admission_fee: pp.admission_fee,
              base_price: pp.base_price,
              discounted_price: pp.discounted_price,
              is_allowed_disabled: false,
              status: b.is_active === 1 ? BatchStatus.PUBLISHED : BatchStatus.DRAFT,
              is_active: b.is_active === 1,
              is_deleted: false,
            };

          await BatchModel.create(batchDoc);
          imported++;
          console.log(`  Migrated: ${batchName} (${pp.base_price}) ${timeLabel} [${b.id}]`);
        }
        }
      } catch (err) {
        errors++;
        console.error(`  Error migrating batch ${b.id} (${b.name}):`, err);
      }
    }

    console.log('\n--- Summary ---');
    console.log(`Imported: ${imported}`);
    console.log(`Skipped:  ${skipped}`);
    console.log(`Errors:   ${errors}`);
  } finally {
    await mysqlConn.end();
    await disconnectDatabase();
  }
}

runMigration().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
