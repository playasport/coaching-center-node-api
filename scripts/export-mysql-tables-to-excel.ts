/**
 * Export fee structures from MySQL to a batch-import-ready Excel sheet.
 *
 * Joins: fee_structures + fee_structure_details + coaching_centres + sports + age_groups + batch_timings
 *
 * Output: exports/fee-structures-export-<timestamp>.xlsx
 *
 * Run: npm run export:mysql-tables
 * or:  tsx scripts/export-mysql-tables-to-excel.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import mysql from 'mysql2/promise';
import ExcelJS from 'exceljs';

const OUTPUT_DIR = path.join(process.cwd(), 'exports');

async function connectMySQL() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_DB_HOST || 'localhost',
    user: process.env.MYSQL_DB_USER || 'root',
    password: process.env.MYSQL_DB_PASSWORD || '',
    database: process.env.MYSQL_DB_NAME || 'playasport',
  });
  console.log(`✅ MySQL connected: ${process.env.MYSQL_DB_NAME || 'playasport'}\n`);
  return conn;
}

function styleHeaderRow(worksheet: ExcelJS.Worksheet) {
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 22;
}

interface TimingEntry {
  day: string;
  start_time: string;
  end_time: string;
}

function formatTime(t: any): string {
  if (!t) return '00:00';
  const s = String(t);
  return s.length > 5 ? s.substring(0, 5) : s;
}

const DAY_ORDER: Record<string, number> = {
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
  friday: 5, saturday: 6, sunday: 7,
};

function computeEndDate(startDate: string, durationCount: number | null, durationUnit: string | null): string {
  const start = new Date(startDate);
  const count = durationCount ?? 1;
  const unit = (durationUnit ?? 'month').toLowerCase();

  if (unit === 'month' || unit === 'months') {
    start.setMonth(start.getMonth() + count);
  } else if (unit === 'year' || unit === 'years') {
    start.setFullYear(start.getFullYear() + count);
  } else if (unit === 'week' || unit === 'weeks') {
    start.setDate(start.getDate() + count * 7);
  } else if (unit === 'day' || unit === 'days') {
    start.setDate(start.getDate() + count);
  } else {
    start.setMonth(start.getMonth() + count);
  }

  return start.toISOString().split('T')[0];
}

async function loadBatchTimings(conn: mysql.Connection): Promise<Map<string, { training_days: string; individual_timings: string }>> {
  const [rows] = await conn.query(`
    SELECT coaching_center_id, day,
           TIME_FORMAT(start_time, '%H:%i') AS start_time,
           TIME_FORMAT(end_time, '%H:%i') AS end_time
    FROM batch_timings
    ORDER BY coaching_center_id, FIELD(day, 'monday','tuesday','wednesday','thursday','friday','saturday','sunday'), start_time
  `);
  const timings = rows as Array<{ coaching_center_id: string; day: string; start_time: string; end_time: string }>;

  const grouped = new Map<string, TimingEntry[]>();
  for (const t of timings) {
    const key = t.coaching_center_id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push({
      day: t.day,
      start_time: formatTime(t.start_time),
      end_time: formatTime(t.end_time),
    });
  }

  const result = new Map<string, { training_days: string; individual_timings: string }>();
  for (const [centerId, entries] of grouped) {
    const uniqueDays = [...new Set(entries.map((e) => e.day))];
    uniqueDays.sort((a, b) => (DAY_ORDER[a] ?? 99) - (DAY_ORDER[b] ?? 99));

    result.set(centerId, {
      training_days: uniqueDays.join(','),
      individual_timings: JSON.stringify(entries),
    });
  }
  return result;
}

async function main() {
  let conn: mysql.Connection | null = null;
  try {
    console.log('\n📊 Exporting fee structures to Excel...\n');

    conn = await connectMySQL();

    console.log('  📦 Loading batch_timings...');
    const timingsMap = await loadBatchTimings(conn);
    console.log(`    → ${timingsMap.size} coaching centres have timings\n`);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().split('T')[0];

    const [rows] = await conn.query(`
      SELECT
        cc.id AS coaching_centre_id,
        cc.coaching_name,
        sp.id AS sport_id,
        sp.name AS sport_name,
        fs.name AS fee_structure_name,
        fs.description,
        fs.admission_fee,
        ag.minimum_age AS age_min,
        ag.maximum_age AS age_max,
        fsd.category_type,
        fsd.category_value,
        fsd.base_price,
        fsd.discounted_price,
        fsd.duration_value,
        fsd.duration_unit,
        fsd.sessions_count,
        fsd.classes_per_week
      FROM fee_structure_details fsd
      INNER JOIN fee_structures fs ON fsd.fee_structure_id = fs.id
      LEFT JOIN coaching_centres cc ON fs.coaching_centre_id = cc.id
      LEFT JOIN sports sp ON fs.sport_id = sp.id
      LEFT JOIN age_groups ag ON fs.age_group_id = ag.id
      WHERE fs.deleted_at IS NULL
        AND fsd.is_active = 1
        AND fs.is_active = 1
      ORDER BY cc.coaching_name, fs.name, fsd.category_type, fsd.base_price
    `);

    const data = rows as any[];
    console.log(`  📦 Total rows: ${data.length}\n`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PlayAsport Export Script';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Batches', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = [
      { header: 'batch_name', key: 'batch_name', width: 40 },
      { header: 'description', key: 'description', width: 45 },
      { header: 'sportId', key: 'sportId', width: 38 },
      { header: 'sportName', key: 'sportName', width: 22 },
      { header: 'centerId', key: 'centerId', width: 38 },
      { header: 'Coaching_Center_Name', key: 'Coaching_Center_Name', width: 35 },
      { header: 'gender', key: 'gender', width: 16 },
      { header: 'certificate_issued', key: 'certificate_issued', width: 18 },
      { header: 'start_date', key: 'start_date', width: 14 },
      { header: 'end_date', key: 'end_date', width: 14 },
      { header: 'training_days', key: 'training_days', width: 50 },
      { header: 'individual_timings', key: 'individual_timings', width: 90 },
      { header: 'duration_count', key: 'duration_count', width: 14 },
      { header: 'duration_type', key: 'duration_type', width: 14 },
      { header: 'capacity_min', key: 'capacity_min', width: 12 },
      { header: 'capacity_max', key: 'capacity_max', width: 12 },
      { header: 'age_min', key: 'age_min', width: 10 },
      { header: 'age_max', key: 'age_max', width: 10 },
      { header: 'admission_fee', key: 'admission_fee', width: 14 },
      { header: 'base_price', key: 'base_price', width: 12 },
      { header: 'discounted_price', key: 'discounted_price', width: 16 },
      { header: 'is_allowed_disabled', key: 'is_allowed_disabled', width: 18 },
      { header: 'sessions_count', key: 'sessions_count', width: 14 },
      { header: 'class_in_week', key: 'class_in_week', width: 14 },
    ];
    styleHeaderRow(ws);

    data.forEach((row) => {
      const catType = row.category_type ?? '';
      const catValue = row.category_value ?? '';
      const rawName = catValue ? `${catType} ${catValue}`.trim() : (catType || row.fee_structure_name || '');
      const batchName = rawName
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      const durationCount = row.duration_value ?? 1;
      const durationType = row.duration_unit ?? 'month';
      const endDate = computeEndDate(startDate, durationCount, durationType);

      const timing = timingsMap.get(row.coaching_centre_id);

      const discounted = row.discounted_price && Number(row.discounted_price) > 0
        ? Number(row.discounted_price)
        : '';

      ws.addRow({
        batch_name: batchName,
        description: row.description ?? '',
        sportId: row.sport_id ?? '',
        sportName: row.sport_name ?? '',
        centerId: row.coaching_centre_id ?? '',
        Coaching_Center_Name: row.coaching_name ?? '',
        gender: 'male,female',
        certificate_issued: false,
        start_date: startDate,
        end_date: endDate,
        training_days: timing?.training_days ?? '',
        individual_timings: timing?.individual_timings ?? '',
        duration_count: durationCount,
        duration_type: durationType,
        capacity_min: 1,
        capacity_max: 10000,
        age_min: row.age_min ?? 3,
        age_max: row.age_max ?? 100,
        admission_fee: row.admission_fee ?? 0,
        base_price: row.base_price ?? 0,
        discounted_price: discounted,
        is_allowed_disabled: false,
        sessions_count: row.sessions_count ?? '',
        class_in_week: row.classes_per_week ?? '',
      });
    });

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(OUTPUT_DIR, `batches-export-${timestamp}.xlsx`);

    await workbook.xlsx.writeFile(outputFile);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Export Complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Total rows exported: ${data.length}`);
    console.log(`Start date: ${startDate}`);
    console.log(`📁 File saved: ${outputFile}\n`);

    await conn.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    if (conn) await conn.end().catch(() => {});
    process.exit(1);
  }
}

main();
