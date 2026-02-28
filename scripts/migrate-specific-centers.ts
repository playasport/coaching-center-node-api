/**
 * Migrate specific coaching centers from MySQL → MongoDB.
 * If user already exists (by email), reuses that user's _id instead of creating a new one.
 *
 * Usage:
 *   npm run migrate:specific-centers -- <id1> <id2> ...
 *
 * Example:
 *   npm run migrate:specific-centers -- a0dfc43b-94ca-4238-a0cd-4d5e910b9092 9dd0a70a-629a-43a6-bfa7-01b027076f45
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { CoachingCenterModel } from '../src/models/coachingCenter.model';
import { SportModel } from '../src/models/sport.model';
import { UserModel } from '../src/models/user.model';
import { AdminUserModel } from '../src/models/adminUser.model';
import { FacilityModel } from '../src/models/facility.model';
import { RoleModel } from '../src/models/role.model';
import { hashPassword } from '../src/utils/password';

const LOGS_DIR = path.join(process.cwd(), 'logs');
const AWS_MEDIA_URL = 'https://media-playsport.s3.ap-south-1.amazonaws.com';

function getIds(): string[] {
  const ids = process.argv
    .slice(2)
    .filter((a) => !a.startsWith('--'))
    .filter((a) => !a.endsWith('.ts') && !a.endsWith('.js'));

  if (ids.length === 0) {
    console.error('❌ Please provide coaching center IDs');
    console.error('   Usage: npm run migrate:specific-centers -- <id1> <id2> ...');
    process.exit(1);
  }
  return ids;
}

function convertTo24HourFormat(timeStr: string | null): string {
  if (!timeStr) return '09:00';
  if (/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr.trim())) return timeStr.trim();

  const ampmMatch = timeStr.trim().toUpperCase().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const period = ampmMatch[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    else if (period === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  return '09:00';
}

function generateRandomPassword(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

const facilityCache = new Map<string, Types.ObjectId>();

async function getOrCreateFacility(name: string): Promise<Types.ObjectId> {
  if (facilityCache.has(name)) return facilityCache.get(name)!;
  let facility = await FacilityModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (!facility) {
    facility = new FacilityModel({ name, is_active: true });
    await facility.save();
    console.log(`    Created facility: ${name}`);
  }
  facilityCache.set(name, facility._id as Types.ObjectId);
  return facility._id as Types.ObjectId;
}

async function getOrCreateUser(
  cc: any,
  academyRoleId: Types.ObjectId
): Promise<{ userId: Types.ObjectId; email: string; mobile: string | null; isNew: boolean }> {
  const email = (cc.email?.trim() || `coaching_${cc.id}@temp.com`).toLowerCase();

  const existing = await UserModel.findOne({ email });
  if (existing) {
    console.log(`    👤 User already exists: ${email} → using _id: ${existing._id}`);
    return {
      userId: existing._id as Types.ObjectId,
      email: existing.email,
      mobile: existing.mobile ?? null,
      isNew: false,
    };
  }

  let passwordToHash = cc.password || generateRandomPassword(12);
  if (!passwordToHash.startsWith('$2')) passwordToHash = await hashPassword(passwordToHash);

  const user = new UserModel({
    id: uuidv4(),
    firstName: cc.first_name || 'Coaching',
    lastName: cc.last_name || 'Center',
    email,
    mobile: cc.mobile_number || cc.contact_number || null,
    password: passwordToHash,
    roles: [academyRoleId],
    academyDetails: { name: cc.coaching_name || cc.first_name || 'Coaching Center' },
    isActive: cc.is_active === 1,
    isDeleted: false,
  });
  await user.save();
  console.log(`    👤 User created: ${email} → _id: ${user._id}`);

  return {
    userId: user._id as Types.ObjectId,
    email: user.email,
    mobile: user.mobile ?? null,
    isNew: true,
  };
}

async function getOrCreateAdminUser(
  adminData: any,
  agentRoleId: Types.ObjectId
): Promise<Types.ObjectId> {
  let adminUser = await AdminUserModel.findOne({ email: adminData.email.toLowerCase() });
  if (adminUser) {
    console.log(`    👤 Admin already exists: ${adminData.email} → _id: ${adminUser._id}`);
    return adminUser._id as Types.ObjectId;
  }

  let hashedPwd = adminData.password;
  if (hashedPwd && !hashedPwd.startsWith('$2')) hashedPwd = await hashPassword(hashedPwd);
  adminUser = new AdminUserModel({
    id: uuidv4(),
    firstName: adminData.first_name || 'Admin',
    lastName: adminData.last_name || null,
    email: adminData.email.toLowerCase(),
    mobile: adminData.contact_number || null,
    password: hashedPwd,
    roles: [agentRoleId],
    isActive: adminData.is_active === 1,
    isDeleted: !!adminData.deleted_at,
  });
  await adminUser.save();
  console.log(`    👤 Admin created: ${adminData.email}`);
  return adminUser._id as Types.ObjectId;
}

async function migrateSingleCenter(
  cc: any,
  conn: mysql.Connection,
  agentRoleId: Types.ObjectId,
  academyRoleId: Types.ObjectId,
  existingUserId: Types.ObjectId | null = null
): Promise<{ migrated: boolean; skipped: boolean; userId: Types.ObjectId | null }> {
  console.log(`\n  Processing: ${cc.coaching_name || cc.id}`);

  const existing = await CoachingCenterModel.findOne({ id: cc.id });
  if (existing) {
    console.log(`    ⏭️  Center already exists in MongoDB (id: ${cc.id}, _id: ${existing._id}) — skipping`);
    return { migrated: false, skipped: true, userId: existing.user as Types.ObjectId };
  }

  // User — reuse if exists, create if not
  let userId: Types.ObjectId;
  let userEmail: string;
  let userMobile: string | null;

  if (existingUserId) {
    userId = existingUserId;
    const userDoc = await UserModel.findById(userId);
    userEmail = userDoc?.email || '';
    userMobile = userDoc?.mobile ?? null;
    console.log(`    👤 Using provided user _id: ${userId}`);
  } else {
    const userResult = await getOrCreateUser(cc, academyRoleId);
    userId = userResult.userId;
    userEmail = userResult.email;
    userMobile = userResult.mobile;
  }

  // addedBy
  let addedById: Types.ObjectId | null = null;
  if (cc.added_by) {
    const [admins] = await conn.execute(
      'SELECT * FROM admins WHERE id = ? AND type = ? AND deleted_at IS NULL',
      [cc.added_by, 'agent']
    );
    if ((admins as any[]).length > 0) {
      addedById = await getOrCreateAdminUser((admins as any[])[0], agentRoleId);
    }
  }

  // Facilities
  const facilityIds: Types.ObjectId[] = [];
  if (cc.facility) {
    const facilityIdList = cc.facility.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
    if (facilityIdList.length > 0) {
      const ph = facilityIdList.map(() => '?').join(',');
      const [facilities] = await conn.execute(`SELECT id, name FROM facilities WHERE id IN (${ph})`, facilityIdList);
      for (const f of facilities as any[]) facilityIds.push(await getOrCreateFacility(f.name));
    }
    console.log(`    ✅ Facilities: ${facilityIds.length}`);
  }

  // Sports
  const [offeredSports] = await conn.execute(
    'SELECT sport_id FROM coaching_centre_offered_sports WHERE coaching_centre_id = ?',
    [cc.id]
  );

  const sportIds: Types.ObjectId[] = [];
  const sportDetails: any[] = [];
  const sportDetailsMap = new Map<string, any>();

  for (const os of offeredSports as any[]) {
    const sport = await SportModel.findOne({ custom_id: os.sport_id });
    if (!sport) {
      console.log(`    ⚠️  Sport not found in MongoDB: ${os.sport_id}`);
      continue;
    }
    sportIds.push(sport._id as Types.ObjectId);

    const [sportBios] = await conn.execute(
      'SELECT description FROM coaching_centre_sport_bios WHERE coaching_centre_id = ? AND sport_id = ? AND is_active = 1',
      [cc.id, os.sport_id]
    );
    let description = '';
    if ((sportBios as any[]).length > 0 && (sportBios as any[])[0].description) {
      description = (sportBios as any[])[0].description;
    } else if (cc.bio) {
      description = cc.bio;
    } else {
      description = `Professional coaching for ${sport.name}`;
    }

    const detail = { sport_id: sport._id, description, images: [] as any[], videos: [] as any[] };
    sportDetails.push(detail);
    sportDetailsMap.set((sport._id as Types.ObjectId).toString(), detail);
    sportDetailsMap.set(os.sport_id, detail);
  }
  console.log(`    ⚽ Sports: ${sportIds.length}`);

  // Images
  const [images] = await conn.execute(
    'SELECT id, image_path, sport_id, is_banner, is_active FROM coaching_centre_images WHERE coaching_centre_id = ? AND is_active = 1',
    [cc.id]
  );
  for (const img of images as any[]) {
    const url = img.image_path
      ? img.image_path.startsWith('http') ? img.image_path : `${AWS_MEDIA_URL}/${img.image_path}`
      : null;
    if (!url) continue;
    const mediaItem = { unique_id: uuidv4(), url, is_active: img.is_active === 1, is_deleted: false, is_banner: img.is_banner === 1, deletedAt: null };
    const target = img.sport_id ? sportDetailsMap.get(img.sport_id) : sportDetails[0];
    if (target) target.images.push(mediaItem);
  }
  console.log(`    📷 Images: ${(images as any[]).length}`);

  // Videos
  const [videos] = await conn.execute(
    'SELECT id, path, sport_id, thumbnail, is_active FROM coaching_centre_videos WHERE coaching_centre_id = ? AND is_active = 1',
    [cc.id]
  );
  for (const vid of videos as any[]) {
    const url = vid.path
      ? vid.path.startsWith('http') ? vid.path : `${AWS_MEDIA_URL}/${vid.path}`
      : null;
    if (!url) continue;
    const thumbnail = vid.thumbnail
      ? vid.thumbnail.startsWith('http') ? vid.thumbnail : `${AWS_MEDIA_URL}/${vid.thumbnail}`
      : null;
    const videoItem = { unique_id: uuidv4(), url, thumbnail, is_active: vid.is_active === 1, is_deleted: false, deletedAt: null };
    const target = vid.sport_id ? sportDetailsMap.get(vid.sport_id) : sportDetails[0];
    if (target) target.videos.push(videoItem);
  }
  console.log(`    🎥 Videos: ${(videos as any[]).length}`);

  // Age range
  let ageMin = 3, ageMax = 18;
  const [batches] = await conn.execute(
    'SELECT DISTINCT age_id FROM batches WHERE coaching_centre_id = ? AND age_id IS NOT NULL AND deleted_at IS NULL',
    [cc.id]
  );
  const ageIds = (batches as any[]).map((b: any) => b.age_id).filter(Boolean);
  if (ageIds.length > 0) {
    const ph = ageIds.map(() => '?').join(',');
    const [ageGroups] = await conn.execute(
      `SELECT minimum_age, maximum_age FROM age_groups WHERE id IN (${ph}) AND is_active = 1 AND deleted_at IS NULL`,
      ageIds
    );
    if ((ageGroups as any[]).length > 0) {
      ageMin = Math.min(...(ageGroups as any[]).map((ag: any) => ag.minimum_age || 3));
      ageMax = Math.max(...(ageGroups as any[]).map((ag: any) => ag.maximum_age || 18));
    }
  }

  // Genders
  const allowedGenders: string[] = [];
  if (cc.allowed_gender) {
    for (const g of cc.allowed_gender.split(',')) {
      const t = g.trim();
      if (t === '0') allowedGenders.push('female');
      else if (t === '1') allowedGenders.push('male');
      else if (t === '2') allowedGenders.push('other');
      else if (['male', 'female', 'other'].includes(t.toLowerCase())) allowedGenders.push(t.toLowerCase());
    }
  }
  if (allowedGenders.length === 0) allowedGenders.push('male');

  // Operating days & timing
  let operatingDays: string[] = [];
  let openingTime = cc.call_start_time ? convertTo24HourFormat(cc.call_start_time) : null;
  let closingTime = cc.call_end_time ? convertTo24HourFormat(cc.call_end_time) : null;
  let trainingTiming: any = null;

  const [batchTimings] = await conn.execute(
    'SELECT day, start_time, end_time FROM batch_timings WHERE coaching_center_id = ? ORDER BY day, start_time',
    [cc.id]
  );
  if ((batchTimings as any[]).length > 0) {
    const uniqueDays = new Set<string>();
    const allStart: string[] = [];
    const allEnd: string[] = [];
    const timingMap = new Map<string, any>();

    for (const bt of batchTimings as any[]) {
      uniqueDays.add(bt.day);
      if (bt.start_time) allStart.push(String(bt.start_time).substring(0, 5));
      if (bt.end_time) allEnd.push(String(bt.end_time).substring(0, 5));
      if (bt.day && bt.start_time && bt.end_time) {
        const d = String(bt.day).toLowerCase();
        const s = String(bt.start_time).substring(0, 5);
        const e = String(bt.end_time).substring(0, 5);
        const key = `${d}_${s}_${e}`;
        if (!timingMap.has(key)) timingMap.set(key, { day: d, start_time: s, end_time: e });
      }
    }

    const timings = Array.from(timingMap.values());
    if (timings.length > 0) trainingTiming = { timings };

    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    operatingDays = Array.from(uniqueDays).sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

    if (!openingTime && allStart.length > 0) {
      openingTime = allStart.reduce((earliest, cur) => {
        const [eH, eM] = earliest.split(':').map(Number);
        const [cH, cM] = cur.split(':').map(Number);
        return cH * 60 + cM < eH * 60 + eM ? cur : earliest;
      });
    }
    if (!closingTime && allEnd.length > 0) {
      closingTime = allEnd.reduce((latest, cur) => {
        const [lH, lM] = latest.split(':').map(Number);
        const [cH, cM] = cur.split(':').map(Number);
        return cH * 60 + cM > lH * 60 + lM ? cur : latest;
      });
    }
  }

  if (operatingDays.length === 0) operatingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  if (!openingTime) openingTime = '09:00';
  if (!closingTime) closingTime = '18:00';

  // Location
  const latitude = parseFloat(cc.lat) || 0;
  const longitude = parseFloat(cc.long) || 0;
  let cityName = '', stateName = '';
  if (cc.city_id) {
    const [cities] = await conn.execute('SELECT name FROM cities WHERE id = ?', [cc.city_id]);
    if ((cities as any[]).length > 0) cityName = (cities as any[])[0].name;
  }
  if (cc.state_id) {
    const [states] = await conn.execute('SELECT name FROM states WHERE id = ?', [cc.state_id]);
    if ((states as any[]).length > 0) stateName = (states as any[])[0].name;
  }

  let addressLine1 = cc.address_line1?.trim() || null;
  let addressLine2 = cc.address_line2?.trim() || '';
  if (addressLine1 && addressLine2 && addressLine1.toLowerCase() === addressLine2.toLowerCase()) {
    addressLine2 = addressLine1;
    addressLine1 = null;
  } else if (!addressLine2 && addressLine1) {
    addressLine2 = addressLine1;
    addressLine1 = null;
  }

  // Logo
  let logoUrl: string | null = null;
  if (cc.logo) {
    logoUrl = cc.logo.startsWith('http') ? cc.logo : `${AWS_MEDIA_URL}/${cc.logo}`;
  }

  // Bank info
  const bankInformation = {
    bank_name: cc.bank_name || null,
    account_number: cc.account_number || null,
    ifsc_code: cc.ifsc_code || null,
    account_holder_name: cc.account_person_name || null,
    gst_number: null,
  };

  // Email & mobile with user fallback
  let email = cc.email?.trim() || '';
  let mobile = (cc.mobile_number || cc.contact_number)?.trim() || '';
  if (!email && userEmail) email = userEmail;
  if (!mobile && userMobile) mobile = userMobile;
  email = email.toLowerCase();

  if (!email || !mobile) {
    console.log(`    ⚠️  Skipped: missing email or mobile`);
    return { migrated: false, skipped: true, userId };
  }

  const createdAtMongo = cc.created_at ? new Date(cc.created_at) : undefined;
  const updatedAtMongo = cc.updated_at ? new Date(cc.updated_at) : undefined;

  const center = new CoachingCenterModel({
    id: cc.id,
    user: userId,
    addedBy: addedById,
    center_name: cc.coaching_name || cc.first_name || 'Coaching Center',
    mobile_number: mobile,
    email,
    rules_regulation: cc.terms_and_condition ? [cc.terms_and_condition] : null,
    logo: logoUrl,
    sports: sportIds,
    sport_details: sportDetails,
    age: { min: ageMin, max: ageMax },
    location: {
      latitude,
      longitude,
      address: {
        line1: addressLine1,
        line2: addressLine2,
        city: cityName || '',
        state: stateName || '',
        country: 'India',
        pincode: cc.pincode || '',
      },
    },
    facility: facilityIds,
    operational_timing: { operating_days: operatingDays, opening_time: openingTime, closing_time: closingTime },
    call_timing: cc.call_start_time && cc.call_end_time
      ? { start_time: convertTo24HourFormat(cc.call_start_time), end_time: convertTo24HourFormat(cc.call_end_time) }
      : null,
    training_timing: trainingTiming,
    documents: [],
    bank_information: bankInformation,
    status: cc.is_admin_approve === 'approved' ? 'published' : 'draft',
    allowed_genders: allowedGenders,
    allowed_disabled: cc.allow_disability === 1,
    is_only_for_disabled: cc.is_only_for_disabled === 1,
    experience: cc.experience || 0,
    is_active: cc.is_active === 1,
    approval_status: cc.is_admin_approve === 'approved' ? 'approved' : 'pending_approval',
    reject_reason: cc.rejection_reason || null,
    is_deleted: false,
    ...(createdAtMongo && { createdAt: createdAtMongo }),
    ...(updatedAtMongo && { updatedAt: updatedAtMongo }),
  });

  await center.save();
  console.log(`    ✅ Inserted into MongoDB: ${center.center_name} (_id: ${center._id})`);

  return { migrated: true, skipped: false, userId };
}

async function main() {
  const ids = getIds();
  console.log(`\n🏢 Migrate specific coaching centers: MySQL → MongoDB`);
  console.log(`   IDs: ${ids.join(', ')}\n`);

  const conn = await mysql.createConnection({
    host: process.env.MYSQL_DB_HOST || 'localhost',
    user: process.env.MYSQL_DB_USER || 'root',
    password: process.env.MYSQL_DB_PASSWORD || '',
    database: process.env.MYSQL_DB_NAME || 'playasport',
  });
  console.log('✅ MySQL connected');

  await connectDatabase();
  console.log('✅ MongoDB connected\n');

  try {
    const agentRole = await RoleModel.findOne({ name: 'agent' });
    const academyRole = await RoleModel.findOne({ name: 'academy' });
    if (!agentRole || !academyRole) {
      console.error('❌ Required roles (agent, academy) not found in MongoDB.');
      process.exit(1);
    }

    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await conn.execute(
      `SELECT * FROM coaching_centres WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
      ids
    );

    const centers = rows as any[];
    console.log(`  📦 Found ${centers.length} / ${ids.length} centers in MySQL`);

    const notFound = ids.filter((id) => !centers.find((c: any) => c.id === id));
    if (notFound.length > 0) console.log(`  ⚠️  Not found in MySQL: ${notFound.join(', ')}`);

    // Group main first, sub second
    const mainCenters = centers.filter((c: any) => c.is_main === '1' || c.is_main === 1);
    const subCenters = centers.filter((c: any) => c.is_main === '0' || c.is_main === 0);

    let migrated = 0, skipped = 0;
    const errors: Array<{ id: string; name: string; error: string }> = [];
    const userMap = new Map<string, Types.ObjectId>();

    for (const cc of mainCenters) {
      try {
        const result = await migrateSingleCenter(cc, conn, agentRole._id as unknown as Types.ObjectId, academyRole._id as unknown as Types.ObjectId);
        if (result.migrated) { migrated++; if (result.userId) userMap.set(cc.id, result.userId); }
        if (result.skipped) skipped++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ id: cc.id, name: cc.coaching_name, error: msg });
        console.error(`    ❌ Error: ${msg}`);
      }
    }

    for (const cc of subCenters) {
      try {
        let existingUserId: Types.ObjectId | null = null;
        if (cc.main_coaching_id) {
          existingUserId = userMap.get(cc.main_coaching_id) || null;
          if (!existingUserId) {
            const mainCC = await CoachingCenterModel.findOne({ id: cc.main_coaching_id }).select('user').lean();
            if (mainCC) existingUserId = (mainCC as any).user;
          }
        }
        const result = await migrateSingleCenter(cc, conn, agentRole._id as unknown as Types.ObjectId, academyRole._id as unknown as Types.ObjectId, existingUserId);
        if (result.migrated) migrated++;
        if (result.skipped) skipped++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ id: cc.id, name: cc.coaching_name, error: msg });
        console.error(`    ❌ Error: ${msg}`);
      }
    }

    // Log
    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logPath = path.join(LOGS_DIR, `migrate-specific-centers-${timestamp}.json`);
    fs.writeFileSync(logPath, JSON.stringify({
      run_at: new Date().toISOString(),
      requested_ids: ids,
      migrated, skipped, errors_count: errors.length, errors,
    }, null, 2), 'utf-8');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`  Requested:  ${ids.length}`);
    console.log(`  Found:      ${centers.length}`);
    console.log(`  Migrated:   ${migrated}`);
    console.log(`  Skipped:    ${skipped}`);
    console.log(`  Errors:     ${errors.length}`);
    console.log(`\n  📁 Log: ${logPath}\n`);
  } finally {
    await conn.end();
    await disconnectDatabase();
  }
}

main().catch(async (err) => {
  console.error('\n❌ Error:', err instanceof Error ? err.message : err);
  await disconnectDatabase();
  process.exit(1);
});
