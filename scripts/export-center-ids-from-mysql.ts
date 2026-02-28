/**
 * Export all coaching centre IDs from MySQL to a JSON file.
 *
 * Output: exports/center-ids-<timestamp>.json
 *
 * Run: npm run export:center-ids
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import mysql from 'mysql2/promise';

const OUTPUT_DIR = path.join(process.cwd(), 'exports');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_DB_HOST || 'localhost',
    user: process.env.MYSQL_DB_USER || 'root',
    password: process.env.MYSQL_DB_PASSWORD || '',
    database: process.env.MYSQL_DB_NAME || 'playasport',
  });
  console.log(`\n✅ MySQL connected: ${process.env.MYSQL_DB_NAME || 'playasport'}\n`);

  try {
    const [rows] = await conn.query(`
      SELECT id, coaching_name
      FROM coaching_centres
      WHERE deleted_at IS NULL
      ORDER BY coaching_name
    `);

    const data = rows as Array<{ id: string; coaching_name: string }>;
    console.log(`  📦 Total coaching centres: ${data.length}\n`);

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(OUTPUT_DIR, `center-ids-${timestamp}.json`);

    const output = {
      exported_at: new Date().toISOString(),
      total: data.length,
      centers: data.map((r) => ({
        id: r.id,
        name: r.coaching_name,
      })),
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`  ✅ Exported to: ${outputPath}\n`);

    data.slice(0, 10).forEach((r, i) => {
      console.log(`    ${i + 1}. ${r.coaching_name} (${r.id})`);
    });
    if (data.length > 10) console.log(`    ... and ${data.length - 10} more`);
    console.log('');
  } finally {
    await conn.end();
    console.log('🔌 MySQL disconnected');
  }
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
