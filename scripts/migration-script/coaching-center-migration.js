// Load environment variables
require('dotenv').config();

// Register TypeScript loader to allow requiring .ts files
// This allows us to require TypeScript modules from JavaScript
try {
  require('tsx/cjs/api').register({
    esbuildOptions: {
      format: 'cjs',
    },
  });
} catch (error) {
  // If tsx is not available, try ts-node
  try {
    require('ts-node/register');
  } catch (tsNodeError) {
    console.warn('Warning: Could not load TypeScript loader. Make sure to run with: tsx scripts/migration-script/coaching-center-migration.js');
  }
}

// Import MySQL connection
const mysql = require('mysql2/promise');

// Import MongoDB models and utilities
const { connectDatabase, disconnectDatabase } = require('../../src/config/database');
const { UserModel } = require('../../src/models/user.model');
const { AdminUserModel } = require('../../src/models/adminUser.model');
const { SportModel } = require('../../src/models/sport.model');
const { CoachingCenterModel } = require('../../src/models/coachingCenter.model');
const { FacilityModel } = require('../../src/models/facility.model');
const { RoleModel } = require('../../src/models/role.model');
const { hashPassword } = require('../../src/utils/password');
const { v4: uuidv4 } = require('uuid');
const { Types } = require('mongoose');

// Use string literals for roles (instead of enum to avoid TypeScript issues in .js)
const AGENT_ROLE = 'agent';
const ACADEMY_ROLE = 'academy';

const awsMediaURL = "https://media-playsport.s3.ap-south-1.amazonaws.com";
const fs = require('fs');
const path = require('path');

// Setup log file for migration
const logDirectory = path.resolve(process.cwd(), 'logs');
const migrationLogPath = path.join(logDirectory, 'migration-coaching-centers.log');
const reportPath = path.join(logDirectory, 'migration-report.json');

// Ensure logs directory exists
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

// Initialize report data structure
const migrationReport = {
  migrationStarted: new Date().toISOString(),
  skippedCoachingCenters: [],
  defaultDataCoachingCenters: [],
  summary: {
    totalSkipped: 0,
    totalWithDefaults: 0
  }
};

// Create write stream for log file with error handling
let logFileStream = null;
try {
  // Create file immediately with initial header (synchronous to ensure file exists)
  const header = `\n${'='.repeat(80)}\nMigration Started: ${new Date().toISOString()}\nLog File: ${migrationLogPath}\n${'='.repeat(80)}\n`;
  fs.appendFileSync(migrationLogPath, header);
  console.log(`📝 Log file created: ${migrationLogPath}`);
  
  // Now create write stream for subsequent writes
  logFileStream = fs.createWriteStream(migrationLogPath, { flags: 'a' });
  
  logFileStream.on('error', (error) => {
    console.error('Log file stream error:', error);
  });
  
  logFileStream.on('open', () => {
    console.log('✅ Log file stream opened successfully');
  });
} catch (error) {
  console.error('Failed to create log file stream:', error);
  logFileStream = null;
}

// Function to write report to file
const writeReport = () => {
  try {
    migrationReport.migrationEnded = new Date().toISOString();
    migrationReport.summary.totalSkipped = migrationReport.skippedCoachingCenters.length;
    migrationReport.summary.totalWithDefaults = migrationReport.defaultDataCoachingCenters.length;
    
    fs.writeFileSync(reportPath, JSON.stringify(migrationReport, null, 2), 'utf8');
    console.log(`\n📊 Migration report saved: ${reportPath}`);
    log(`\n📊 Migration report saved: ${reportPath}`);
  } catch (error) {
    console.error('Failed to write migration report:', error);
    logError(`Failed to write migration report: ${error.message}`);
  }
};

// Ensure log file is closed and report is written on process exit
process.on('exit', () => {
  if (logFileStream) {
    logFileStream.end();
  }
  writeReport();
});

process.on('SIGINT', () => {
  if (logFileStream) {
    logFileStream.end();
  }
  writeReport();
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (logFileStream) {
    logFileStream.end();
  }
  writeReport();
  process.exit(0);
});

// Helper function to write to both console and file
const writeLog = (message) => {
  console.log(message);
  if (logFileStream) {
    try {
      logFileStream.write(message + '\n', (err) => {
        if (err) {
          console.error('Error writing to log file:', err);
        }
      });
    } catch (error) {
      console.error('Error in writeLog:', error);
    }
  }
};

// Logging utility
const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  writeLog(logMessage);
  if (data) {
    const dataStr = JSON.stringify(data, null, 2);
    writeLog(dataStr);
  }
};

const logError = (message, error) => {
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] ❌ ERROR: ${message}`;
  console.error(errorMessage);
  console.error(error);
  logFileStream.write(errorMessage + '\n');
  logFileStream.write(error?.stack || error?.toString() || String(error) + '\n');
};

const logSuccess = (message) => {
  const timestamp = new Date().toISOString();
  const successMessage = `[${timestamp}] ✅ ${message}`;
  writeLog(successMessage);
};

/**
 * Creates and returns a MySQL database connection using environment credentials
 * @returns {Promise<mysql.Connection>} MySQL connection object
 */
async function connectMySQL() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_DB_HOST || 'localhost',
      user: process.env.MYSQL_DB_USER || 'root',
      password: process.env.MYSQL_DB_PASSWORD || '',
      database: process.env.MYSQL_DB_NAME || '',
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

    logSuccess('MySQL database connected successfully');
    log(`   Host: ${process.env.MYSQL_DB_HOST || 'localhost'}`);
    log(`   Database: ${process.env.MYSQL_DB_NAME || '(not specified)'}`);

    return connection;
  } catch (error) {
    logError('Failed to connect to MySQL database', error);
    throw error;
  }
}

/**
 * Closes the MySQL database connection
 * @param {mysql.Connection} connection - MySQL connection object
 */
async function closeMySQL(connection) {
  try {
    if (connection) {
      await connection.end();
      logSuccess('MySQL database connection closed');
    }
  } catch (error) {
    logError('Error closing MySQL connection', error);
    throw error;
  }
}

/**
 * Import sports from MySQL to MongoDB
 */
async function importSports(mysqlConnection) {
  log('📦 Starting Sports Import...');
  
  try {
    // Fetch all sports from MySQL
    const [sports] = await mysqlConnection.execute(
      'SELECT id, name, logo, is_active, is_popular, created_at, updated_at FROM sports WHERE deleted_at IS NULL'
    );

    log(`Found ${sports.length} sports in MySQL database`);

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const sport of sports) {
      try {
        // Check if sport already exists by name
        const existingSport = await SportModel.findOne({ name: sport.name });

        if (existingSport) {
          log(`Sport already exists: ${sport.name} (skipping)`);
          skippedCount++;
          continue;
        }

        // Build logo URL if exists
        let logoUrl = null;
        if (sport.logo) {
          logoUrl = sport.logo.startsWith('http') 
            ? sport.logo 
            : `${awsMediaURL}/${sport.logo}`;
        }

        // Create sport in MongoDB
        const newSport = new SportModel({
          custom_id: sport.id, // Use MySQL ID as custom_id
          name: sport.name,
          logo: logoUrl,
          is_active: sport.is_active === 1,
          is_popular: sport.is_popular === 1,
        });

        await newSport.save();
        logSuccess(`Imported sport: ${sport.name} (${sport.id})`);
        importedCount++;
      } catch (error) {
        logError(`Error importing sport: ${sport.name}`, error);
        errorCount++;
      }
    }

    log(`\n📊 Sports Import Summary:`);
    log(`   ✅ Imported: ${importedCount}`);
    log(`   ⏭️  Skipped: ${skippedCount}`);
    log(`   ❌ Errors: ${errorCount}`);
    log(`   📦 Total: ${sports.length}\n`);

    return { importedCount, skippedCount, errorCount, total: sports.length };
  } catch (error) {
    logError('Error in importSports', error);
    throw error;
  }
}

/**
 * Generate a random password
 * @param {number} length - Password length (default: 12)
 * @returns {string} Random password
 */
function generateRandomPassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Convert 12-hour time format (with AM/PM) to 24-hour format (HH:MM)
 * Examples: "7:15 AM" -> "07:15", "7:15 PM" -> "19:15", "09:00" -> "09:00"
 */
function convertTo24HourFormat(timeStr) {
  if (!timeStr) {
    return '09:00'; // Default
  }

  // If already in HH:MM format (24-hour), return as is
  if (/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr.trim())) {
    return timeStr.trim();
  }

  // Parse 12-hour format with AM/PM
  const time = timeStr.trim().toUpperCase();
  const ampmMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const period = ampmMatch[3].toUpperCase();

    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    // Format with leading zero
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  // If format is not recognized, return default
  log(`   ⚠️  Unrecognized time format: "${timeStr}", using default 09:00`);
  return '09:00';
}

/**
 * Get or create facility by name
 */
async function getOrCreateFacility(facilityName, facilityIdMap) {
  try {
    // Check cache first
    if (facilityIdMap.has(facilityName)) {
      return facilityIdMap.get(facilityName);
    }

    // Try to find existing facility
    let facility = await FacilityModel.findOne({ 
      name: { $regex: new RegExp(`^${facilityName}$`, 'i') } 
    });

    // If not found, create new facility
    if (!facility) {
      facility = new FacilityModel({
        name: facilityName,
        is_active: true,
      });
      await facility.save();
      log(`Created new facility: ${facilityName}`);
    }

    // Cache for future use
    facilityIdMap.set(facilityName, facility._id);
    return facility._id;
  } catch (error) {
    logError(`Error getting/creating facility: ${facilityName}`, error);
    throw error;
  }
}

/**
 * Get or create role by name
 */
async function getOrCreateRole(roleName) {
  try {
    let role = await RoleModel.findOne({ name: roleName });
    
    if (!role) {
      // Role should exist from seeding, but create if needed
      role = new RoleModel({
        name: roleName,
        description: `${roleName} role`,
      });
      await role.save();
      log(`Created new role: ${roleName}`);
    }
    
    return role._id;
  } catch (error) {
    logError(`Error getting/creating role: ${roleName}`, error);
    throw error;
  }
}

/**
 * Get or create admin user for admin (agent) - uses AdminUserModel instead of UserModel
 */
async function getOrCreateAdminUser(adminData, agentRoleId) {
  try {
    // Check if admin user already exists by email in AdminUserModel
    let adminUser = await AdminUserModel.findOne({ email: adminData.email.toLowerCase() });

    if (!adminUser) {
      // Hash password if exists (don't generate random for admin users)
      let hashedPassword = adminData.password;
      if (adminData.password && !adminData.password.startsWith('$2')) {
        hashedPassword = await hashPassword(adminData.password);
      }

      // Create new admin user using AdminUserModel (not UserModel)
      adminUser = new AdminUserModel({
        id: uuidv4(),
        firstName: adminData.first_name || 'Admin',
        lastName: adminData.last_name || null,
        email: adminData.email.toLowerCase(),
        mobile: adminData.contact_number || null,
        password: hashedPassword,
        roles: [agentRoleId],
        isActive: adminData.is_active === 1,
        isDeleted: adminData.deleted_at ? true : false,
      });

      await adminUser.save();
      log(`Created admin user (AdminUserModel): ${adminData.email}`);
    } else {
      log(`Admin user already exists (AdminUserModel): ${adminData.email}`);
    }

    return adminUser._id;
  } catch (error) {
    logError(`Error getting/creating admin user: ${adminData.email}`, error);
    throw error;
  }
}

/**
 * Migrate a single coaching center
 */
async function migrateSingleCoachingCenter(cc, mysqlConnection, agentRoleId, academyRoleId, facilityIdMap, userObjectId = null) {
  // Track default data for this coaching center
  const defaultDataTracker = {
    coachingCenterId: cc.id,
    coachingCenterName: cc.coaching_name || cc.id,
    email: cc.email || null,
    mobile: cc.mobile_number || cc.contact_number || null,
    defaultsUsed: {
      password: false,
      ageRange: false,
      genders: false,
      operatingDays: false,
      openingTime: false,
      closingTime: false,
      emailFallback: false,
      mobileFallback: false
    },
    defaultValues: {}
  };

  try {
    log(`\nProcessing coaching center: ${cc.coaching_name || cc.id}`);

    // Check if coaching center already exists (by ID or email)
    const existingCC = await CoachingCenterModel.findOne({ 
      $or: [
        { id: cc.id },
        { email: cc.email?.toLowerCase() }
      ]
    });

    if (existingCC) {
      log(`Coaching center already exists: ${cc.email || cc.id} (skipping)`);
      migrationReport.skippedCoachingCenters.push({
        coachingCenterId: cc.id,
        coachingCenterName: cc.coaching_name || cc.id,
        email: cc.email || null,
        reason: 'Already exists in MongoDB',
        skippedAt: new Date().toISOString()
      });
      return { skipped: true, userObjectId: null };
    }

    // Step 1: Handle user account
    let userObjectIdToUse = userObjectId;
    let userEmail = null;
    let userMobile = null;
    
    if (!userObjectIdToUse) {
      // Create new user account for main coaching centers
      log(`   Creating user account for: ${cc.email || cc.id}`);
      
      // Handle password: generate random if null or missing
      let passwordToHash = cc.password;
      if (!passwordToHash || passwordToHash.trim() === '') {
        passwordToHash = generateRandomPassword(12);
        defaultDataTracker.defaultsUsed.password = true;
        defaultDataTracker.defaultValues.password = 'Generated random password';
        log(`   ⚠️  Password was null/empty, generated random password for: ${cc.email || cc.id}`);
      }
      
      // Hash password if not already hashed (bcrypt hashes start with $2)
      let hashedPassword = passwordToHash;
      if (!passwordToHash.startsWith('$2')) {
        hashedPassword = await hashPassword(passwordToHash);
      }

      const user = new UserModel({
        id: uuidv4(),
        firstName: cc.first_name || 'Coaching',
        lastName: cc.last_name || 'Center',
        email: cc.email?.toLowerCase() || `coaching_${cc.id}@temp.com`,
        mobile: cc.mobile_number || cc.contact_number || null,
        password: hashedPassword,
        roles: [academyRoleId], // Academy role for coaching center owners
        academyDetails: {
          name: cc.coaching_name || cc.first_name || 'Coaching Center'
        },
        isActive: cc.is_active === 1,
        isDeleted: false,
      });

      await user.save();
      userObjectIdToUse = user._id;
      userEmail = user.email;
      userMobile = user.mobile;
      log(`   ✅ User created: ${userObjectIdToUse}`);
    } else {
      log(`   ✅ Using existing user ID from main coaching center: ${userObjectIdToUse}`);
      // Fetch user data to use as fallback for email/mobile
      const userDoc = await UserModel.findById(userObjectIdToUse);
      if (userDoc) {
        userEmail = userDoc.email || null;
        userMobile = userDoc.mobile || null;
        log(`   ✅ Retrieved user data: email=${userEmail || 'N/A'}, mobile=${userMobile || 'N/A'}`);
      }
    }

    // Step 2: Handle addedBy (from admins table)
    let addedById = null;
    if (cc.added_by) {
      const [admins] = await mysqlConnection.execute(
        'SELECT * FROM admins WHERE id = ? AND type = ? AND deleted_at IS NULL',
        [cc.added_by, 'agent']
      );

      if (admins.length > 0) {
        const admin = admins[0];
        addedById = await getOrCreateAdminUser(admin, agentRoleId);
        log(`   ✅ AddedBy user found/created: ${addedById}`);
      }
    }

    // Step 3: Handle facilities
    const facilityIds = [];
    if (cc.facility) {
      const facilityIdsStr = cc.facility.split(',');
      
      // Get facility names from MySQL
      const facilityIdList = facilityIdsStr.map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (facilityIdList.length > 0) {
        const placeholders = facilityIdList.map(() => '?').join(',');
        const [facilities] = await mysqlConnection.execute(
          `SELECT id, name FROM facilities WHERE id IN (${placeholders})`,
          facilityIdList
        );

        for (const facility of facilities) {
          const facilityObjectId = await getOrCreateFacility(facility.name, facilityIdMap);
          facilityIds.push(facilityObjectId);
        }
        log(`   ✅ Facilities processed: ${facilityIds.length}`);
      }
    }

    // Step 4: Handle sports and sport_details
    const [offeredSports] = await mysqlConnection.execute(
      'SELECT sport_id FROM coaching_centre_offered_sports WHERE coaching_centre_id = ?',
      [cc.id]
    );

    const sportIds = [];
    const sportDetails = [];
    const sportDetailsMap = new Map(); // Map to store sport_details by sport_id

    // First, create sport_details entries for all offered sports
    for (const offeredSport of offeredSports) {
      // Find sport in MongoDB by custom_id
      const sport = await SportModel.findOne({ custom_id: offeredSport.sport_id });
      
      if (sport) {
        sportIds.push(sport._id);

        // Check for sport-specific bio/description
        const [sportBios] = await mysqlConnection.execute(
          'SELECT description FROM coaching_centre_sport_bios WHERE coaching_centre_id = ? AND sport_id = ? AND is_active = 1',
          [cc.id, offeredSport.sport_id]
        );

        let description = '';

        if (sportBios.length > 0 && sportBios[0].description) {
          // Use sport-specific description
          description = sportBios[0].description;
          log(`   ✅ Using sport-specific bio for: ${sport.name}`);
        } else if (cc.bio) {
          // Use coaching center's general bio
          description = cc.bio;
          log(`   ℹ️  Using coaching center bio for: ${sport.name}`);
        } else {
          description = `Professional coaching for ${sport.name}`;
        }

        const sportDetail = {
          sport_id: sport._id,
          description: description,
          images: [],
          videos: [],
        };

        sportDetails.push(sportDetail);
        sportDetailsMap.set(sport._id.toString(), sportDetail);
        sportDetailsMap.set(offeredSport.sport_id, sportDetail); // Also map by MySQL sport_id
      }
    }

    // Fetch images for this coaching center
    const [images] = await mysqlConnection.execute(
      'SELECT id, image_path, sport_id, is_banner, is_active FROM coaching_centre_images WHERE coaching_centre_id = ? AND is_active = 1',
      [cc.id]
    );

    log(`   📷 Found ${images.length} images for coaching center`);

    // Process images
    for (const image of images) {
      const imageUrl = image.image_path 
        ? (image.image_path.startsWith('http') ? image.image_path : `${awsMediaURL}/${image.image_path}`)
        : null;

      if (!imageUrl) continue;

      const mediaItem = {
        unique_id: uuidv4(),
        url: imageUrl,
        is_active: image.is_active === 1,
        is_deleted: false,
        is_banner: image.is_banner === 1,
        deletedAt: null,
      };

      if (image.sport_id) {
        // Image has sport_id - add to that sport's sport_details
        const sportDetail = sportDetailsMap.get(image.sport_id);
        if (sportDetail) {
          sportDetail.images.push(mediaItem);
          log(`   ✅ Added image to sport: ${image.sport_id}`);
        } else {
          // Sport not in offered sports, skip
          log(`   ⚠️  Image has sport_id ${image.sport_id} but sport not in offered sports (skipping)`);
        }
      } else {
        // Image doesn't have sport_id - check if sport is in offered sports
        // Add to first sport if available
        if (sportDetails.length > 0) {
          sportDetails[0].images.push(mediaItem);
          log(`   ✅ Added image without sport_id to first sport`);
        } else {
          log(`   ⚠️  Image without sport_id but no offered sports found (skipping)`);
        }
      }
    }

    // Fetch videos for this coaching center
    const [videos] = await mysqlConnection.execute(
      'SELECT id, path, sport_id, thumbnail, is_active FROM coaching_centre_videos WHERE coaching_centre_id = ? AND is_active = 1',
      [cc.id]
    );

    log(`   🎥 Found ${videos.length} videos for coaching center`);

    // Process videos
    for (const video of videos) {
      const videoUrl = video.path 
        ? (video.path.startsWith('http') ? video.path : `${awsMediaURL}/${video.path}`)
        : null;

      if (!videoUrl) continue;

      const thumbnailUrl = video.thumbnail 
        ? (video.thumbnail.startsWith('http') ? video.thumbnail : `${awsMediaURL}/${video.thumbnail}`)
        : null;

      const videoItem = {
        unique_id: uuidv4(),
        url: videoUrl,
        thumbnail: thumbnailUrl,
        is_active: video.is_active === 1,
        is_deleted: false,
        deletedAt: null,
      };

      if (video.sport_id) {
        // Video has sport_id - add to that sport's sport_details
        const sportDetail = sportDetailsMap.get(video.sport_id);
        if (sportDetail) {
          sportDetail.videos.push(videoItem);
          log(`   ✅ Added video to sport: ${video.sport_id}`);
        } else {
          // Sport not in offered sports, skip
          log(`   ⚠️  Video has sport_id ${video.sport_id} but sport not in offered sports (skipping)`);
        }
      } else {
        // Video doesn't have sport_id - add to first sport if available
        if (sportDetails.length > 0) {
          sportDetails[0].videos.push(videoItem);
          log(`   ✅ Added video without sport_id to first sport`);
        } else {
          log(`   ⚠️  Video without sport_id but no offered sports found (skipping)`);
        }
      }
    }

    log(`   ✅ Sports processed: ${sportIds.length}`);

    // Step 5: Get age range from batches
    let ageMin = 3; // Default min age
    let ageMax = 18; // Default max age
    
    try {
      // Get all batches for this coaching center
      const [batches] = await mysqlConnection.execute(
        'SELECT DISTINCT age_id FROM batches WHERE coaching_centre_id = ? AND age_id IS NOT NULL AND deleted_at IS NULL',
        [cc.id]
      );

      if (batches.length > 0) {
        const ageIds = batches.map(b => b.age_id).filter(id => id);
        
        if (ageIds.length > 0) {
          // Get age groups for these batches
          const placeholders = ageIds.map(() => '?').join(',');
          const [ageGroups] = await mysqlConnection.execute(
            `SELECT minimum_age, maximum_age FROM age_groups WHERE id IN (${placeholders}) AND is_active = 1 AND deleted_at IS NULL`,
            ageIds
          );

          if (ageGroups.length > 0) {
            // Find overall min and max from all age groups
            ageMin = Math.min(...ageGroups.map(ag => ag.minimum_age || 3));
            ageMax = Math.max(...ageGroups.map(ag => ag.maximum_age || 18));
            log(`   ✅ Age range from batches: ${ageMin} to ${ageMax} years`);
          } else {
            defaultDataTracker.defaultsUsed.ageRange = true;
            defaultDataTracker.defaultValues.ageRange = `${ageMin} to ${ageMax} (default)`;
            log(`   ⚠️  No active age groups found for batches, using defaults: ${ageMin} to ${ageMax}`);
          }
        } else {
          defaultDataTracker.defaultsUsed.ageRange = true;
          defaultDataTracker.defaultValues.ageRange = `${ageMin} to ${ageMax} (default)`;
          log(`   ⚠️  No valid age_ids in batches, using defaults: ${ageMin} to ${ageMax}`);
        }
      } else {
        defaultDataTracker.defaultsUsed.ageRange = true;
        defaultDataTracker.defaultValues.ageRange = `${ageMin} to ${ageMax} (default)`;
        log(`   ℹ️  No batches found for coaching center, using defaults: ${ageMin} to ${ageMax}`);
      }
    } catch (error) {
      logError('Error fetching age range from batches', error);
      defaultDataTracker.defaultsUsed.ageRange = true;
      defaultDataTracker.defaultValues.ageRange = `${ageMin} to ${ageMax} (default)`;
      log(`   ⚠️  Using default age range: ${ageMin} to ${ageMax}`);
    }

    // Step 6: Parse allowed genders (check for numeric: 0=female, 1=male, 2=other)
    const allowedGenders = [];
    if (cc.allowed_gender) {
      const genders = cc.allowed_gender.split(',');
      for (const gender of genders) {
        const trimmed = gender.trim();
        
        // Check for numeric format: 0=female, 1=male, 2=other
        if (trimmed === '0') {
          allowedGenders.push('female');
        } else if (trimmed === '1') {
          allowedGenders.push('male');
        } else if (trimmed === '2') {
          allowedGenders.push('other');
        } else {
          // Check for string format
          const normalizedGender = trimmed.toLowerCase();
          if (['male', 'female', 'other'].includes(normalizedGender)) {
            allowedGenders.push(normalizedGender);
          }
        }
      }
    }

    // Default to 'male' if no genders specified
    if (allowedGenders.length === 0) {
      allowedGenders.push('male');
      defaultDataTracker.defaultsUsed.genders = true;
      defaultDataTracker.defaultValues.genders = 'male (default)';
      log(`   ⚠️  No genders specified, defaulting to 'male'`);
    } else {
      log(`   ✅ Allowed genders: ${allowedGenders.join(', ')}`);
    }

    // Step 7: Parse operating days from batch_timings and times from call_start_time/call_end_time (with fallback to batch_timings)
    let operatingDays = [];
    let openingTime = null;
    let closingTime = null;
    let trainingTiming = null; // For training_timing field

    // First, try to get times from coaching center fields
    if (cc.call_start_time) {
      openingTime = convertTo24HourFormat(cc.call_start_time);
      log(`   ✅ Opening time from call_start_time: ${openingTime}`);
    }
    
    if (cc.call_end_time) {
      closingTime = convertTo24HourFormat(cc.call_end_time);
      log(`   ✅ Closing time from call_end_time: ${closingTime}`);
    }

    // Fetch batch timings for operating days, training timing, and as fallback for times
    try {
      const [batchTimings] = await mysqlConnection.execute(
        'SELECT day, start_time, end_time FROM batch_timings WHERE coaching_center_id = ? ORDER BY day, start_time',
        [cc.id]
      );

      if (batchTimings && batchTimings.length > 0) {
        // Extract unique days for operating days
        const uniqueDays = new Set();
        const allStartTimes = [];
        const allEndTimes = [];
        // Map to store unique day-timing combinations for training_timing
        const trainingTimingMap = new Map();

        for (const bt of batchTimings) {
          uniqueDays.add(bt.day);
          
          // Collect times for fallback if call_start_time/call_end_time are not available
          if (bt.start_time) {
            const startTimeStr = String(bt.start_time);
            const startTimeHHMM = startTimeStr.substring(0, 5); // Extract HH:MM from HH:MM:SS
            allStartTimes.push(startTimeHHMM);
          }
          
          if (bt.end_time) {
            const endTimeStr = String(bt.end_time);
            const endTimeHHMM = endTimeStr.substring(0, 5); // Extract HH:MM from HH:MM:SS
            allEndTimes.push(endTimeHHMM);
          }

          // Build training_timing from batch_timings
          if (bt.day && bt.start_time && bt.end_time) {
            const day = String(bt.day).toLowerCase();
            const startTimeStr = String(bt.start_time);
            const endTimeStr = String(bt.end_time);
            const startTimeHHMM = startTimeStr.substring(0, 5); // Extract HH:MM from HH:MM:SS
            const endTimeHHMM = endTimeStr.substring(0, 5); // Extract HH:MM from HH:MM:SS
            
            const key = `${day}_${startTimeHHMM}_${endTimeHHMM}`;
            if (!trainingTimingMap.has(key)) {
              trainingTimingMap.set(key, {
                day: day,
                start_time: startTimeHHMM,
                end_time: endTimeHHMM,
              });
            }
          }
        }

        // Convert training timing map to array
        const trainingTimings = Array.from(trainingTimingMap.values());
        if (trainingTimings.length > 0) {
          trainingTiming = {
            timings: trainingTimings,
          };
          log(`   ✅ Training timing from batch_timings: ${trainingTimings.length} day(s)`);
        }

        // Convert Set to sorted array for operating days
        operatingDays = Array.from(uniqueDays).sort((a, b) => {
          const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          return dayOrder.indexOf(a) - dayOrder.indexOf(b);
        });

        log(`   ✅ Operating days from batch_timings: ${operatingDays.join(', ')}`);

        // Use batch_timings times as fallback if call_start_time/call_end_time are not available
        if (!openingTime && allStartTimes.length > 0) {
          openingTime = allStartTimes.reduce((earliest, current) => {
            const [earliestH, earliestM] = earliest.split(':').map(Number);
            const [currentH, currentM] = current.split(':').map(Number);
            const earliestMinutes = earliestH * 60 + earliestM;
            const currentMinutes = currentH * 60 + currentM;
            return currentMinutes < earliestMinutes ? current : earliest;
          });
          log(`   ✅ Opening time from batch_timings (fallback): ${openingTime}`);
          defaultDataTracker.defaultsUsed.openingTime = true;
          defaultDataTracker.defaultValues.openingTime = `${openingTime} (from batch_timings fallback)`;
        }

        if (!closingTime && allEndTimes.length > 0) {
          closingTime = allEndTimes.reduce((latest, current) => {
            const [latestH, latestM] = latest.split(':').map(Number);
            const [currentH, currentM] = current.split(':').map(Number);
            const latestMinutes = latestH * 60 + latestM;
            const currentMinutes = currentH * 60 + currentM;
            return currentMinutes > latestMinutes ? current : latest;
          });
          log(`   ✅ Closing time from batch_timings (fallback): ${closingTime}`);
          defaultDataTracker.defaultsUsed.closingTime = true;
          defaultDataTracker.defaultValues.closingTime = `${closingTime} (from batch_timings fallback)`;
        }
      } else {
        // No batch_timings found
        log(`   ⚠️  No batch_timings found`);
        if (!openingTime && !closingTime) {
          log(`   ⚠️  No call_start_time/call_end_time and no batch_timings, using defaults`);
        }
      }
    } catch (error) {
      logError(`   ❌ Error fetching batch_timings: ${error.message}`);
      // If we don't have times from call_start_time/call_end_time, we'll use defaults below
    }

    // Ensure we have valid operating days (use defaults if empty)
    if (operatingDays.length === 0) {
      operatingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      defaultDataTracker.defaultsUsed.operatingDays = true;
      defaultDataTracker.defaultValues.operatingDays = 'monday, tuesday, wednesday, thursday, friday, saturday (default)';
      log(`   ⚠️  No operating days found, using default days`);
    }

    // Ensure we have valid times (use defaults if still empty)
    if (!openingTime) {
      openingTime = '09:00';
      defaultDataTracker.defaultsUsed.openingTime = true;
      defaultDataTracker.defaultValues.openingTime = '09:00 (default)';
      log(`   ⚠️  No opening time found, using default: 09:00`);
    }
    
    if (!closingTime) {
      closingTime = '18:00';
      defaultDataTracker.defaultsUsed.closingTime = true;
      defaultDataTracker.defaultValues.closingTime = '18:00 (default)';
      log(`   ⚠️  No closing time found, using default: 18:00`);
    }

    // Step 8: Build location
    const latitude = parseFloat(cc.lat) || 0;
    const longitude = parseFloat(cc.long) || 0;

    // Get city and state names
    let cityName = '';
    let stateName = '';

    if (cc.city_id) {
      const [cities] = await mysqlConnection.execute(
        'SELECT name FROM cities WHERE id = ?',
        [cc.city_id]
      );
      if (cities.length > 0) {
        cityName = cities[0].name;
      }
    }

    if (cc.state_id) {
      const [states] = await mysqlConnection.execute(
        'SELECT name FROM states WHERE id = ?',
        [cc.state_id]
      );
      if (states.length > 0) {
        stateName = states[0].name;
      }
    }

    // Step 8a: Handle address lines (line2 is required in MongoDB)
    let addressLine1 = cc.address_line1?.trim() || null;
    let addressLine2 = cc.address_line2?.trim() || '';
    
    // Check if line1 and line2 are the same in MySQL
    if (addressLine1 && addressLine2 && addressLine1.toLowerCase() === addressLine2.toLowerCase()) {
      // If both are same, only fill line2 in MongoDB
      addressLine2 = addressLine1;
      addressLine1 = null; // Set line1 to null in MongoDB
      log(`   ℹ️  Address line1 and line2 are same in MySQL, using only line2 in MongoDB`);
    } else if (!addressLine2 && addressLine1) {
      // If line2 is missing/empty but line1 exists, move line1 to line2
      addressLine2 = addressLine1;
      addressLine1 = null; // Set line1 to null in MongoDB
      log(`   ℹ️  Address line2 missing, moved line1 to line2`);
    }

    // Step 9: Build logo URL
    let logoUrl = null;
    if (cc.logo) {
      logoUrl = cc.logo.startsWith('http') 
        ? cc.logo 
        : `${awsMediaURL}/${cc.logo}`;
    }

    // Step 10: Build bank information
    const bankInformation = {
      bank_name: cc.bank_name || null,
      account_number: cc.account_number || null,
      ifsc_code: cc.ifsc_code || null,
      account_holder_name: cc.account_person_name || null,
      gst_number: null,
    };

    // Step 11: Get email and mobile_number - use user's data as fallback if missing
    // Use coaching center's data first, fallback to user's data if missing
    let coachingCenterEmail = cc.email?.trim() || '';
    let coachingCenterMobile = (cc.mobile_number || cc.contact_number)?.trim() || '';

    // Track if fallback is used
    if (!coachingCenterEmail && userEmail) {
      coachingCenterEmail = userEmail;
      defaultDataTracker.defaultsUsed.emailFallback = true;
      defaultDataTracker.defaultValues.emailFallback = `Used user email: ${userEmail}`;
    }
    if (!coachingCenterMobile && userMobile) {
      coachingCenterMobile = userMobile;
      defaultDataTracker.defaultsUsed.mobileFallback = true;
      defaultDataTracker.defaultValues.mobileFallback = `Used user mobile: ${userMobile}`;
    }

    coachingCenterEmail = coachingCenterEmail.toLowerCase();

    // Validate required fields before creating
    if (!coachingCenterEmail || !coachingCenterMobile) {
      log(`   ⚠️  Skipping coaching center: ${cc.id} - Missing required email or mobile_number`);
      log(`      Coaching Center Email: ${cc.email || 'MISSING'}, Mobile: ${cc.mobile_number || cc.contact_number || 'MISSING'}`);
      log(`      User Email: ${userEmail || 'MISSING'}, Mobile: ${userMobile || 'MISSING'}`);
      migrationReport.skippedCoachingCenters.push({
        coachingCenterId: cc.id,
        coachingCenterName: cc.coaching_name || cc.id,
        email: cc.email || null,
        mobile: cc.mobile_number || cc.contact_number || null,
        reason: 'Missing required email or mobile_number',
        skippedAt: new Date().toISOString()
      });
      return { skipped: true, userObjectId: userObjectIdToUse };
    }

    log(`   ✅ Using email: ${coachingCenterEmail}, mobile: ${coachingCenterMobile}`);

    // Step 12: Create coaching center
    const coachingCenter = new CoachingCenterModel({
      id: cc.id, // Use MySQL coaching center ID instead of generating new UUID
      user: userObjectIdToUse,
      addedBy: addedById,
      center_name: cc.coaching_name || cc.first_name || 'Coaching Center',
      mobile_number: coachingCenterMobile,
      email: coachingCenterEmail,
      rules_regulation: cc.terms_and_condition ? [cc.terms_and_condition] : null,
      logo: logoUrl,
      sports: sportIds,
      sport_details: sportDetails,
      age: {
        min: ageMin,
        max: ageMax,
      },
      location: {
        latitude: latitude,
        longitude: longitude,
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
      operational_timing: {
        operating_days: operatingDays,
        opening_time: openingTime,
        closing_time: closingTime,
      },
      call_timing: (() => {
        if (cc.call_start_time && cc.call_end_time) {
          const startTime = convertTo24HourFormat(cc.call_start_time);
          const endTime = convertTo24HourFormat(cc.call_end_time);
          if (startTime && endTime) {
            return {
              start_time: startTime,
              end_time: endTime,
            };
          }
        }
        return null;
      })(),
      training_timing: trainingTiming, // From MySQL batch_timings table
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
    });

    await coachingCenter.save();
    logSuccess(`Coaching center migrated: ${coachingCenter.center_name} (${coachingCenter.id})`);

    // Add to report if any defaults were used
    const hasDefaults = Object.values(defaultDataTracker.defaultsUsed).some(used => used === true);
    if (hasDefaults) {
      defaultDataTracker.migratedAt = new Date().toISOString();
      defaultDataTracker.mongodbId = coachingCenter._id?.toString() || null;
      migrationReport.defaultDataCoachingCenters.push(defaultDataTracker);
    }

    return { migrated: true, userObjectId: userObjectIdToUse };
  } catch (error) {
    logError(`Error migrating coaching center: ${cc.id}`, error);
    // Add to skipped if error occurred
    migrationReport.skippedCoachingCenters.push({
      coachingCenterId: cc.id,
      coachingCenterName: cc.coaching_name || cc.id,
      email: cc.email || null,
      mobile: cc.mobile_number || cc.contact_number || null,
      reason: `Error: ${error.message}`,
      skippedAt: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Migrate coaching centers from MySQL to MongoDB
 */
async function migrateCoachingCenters(mysqlConnection) {
  log('🏢 Starting Coaching Centers Migration...');

  try {
    // Get agent role and academy role
    const agentRoleId = await getOrCreateRole(AGENT_ROLE);
    const academyRoleId = await getOrCreateRole(ACADEMY_ROLE);

    // Cache for facilities
    const facilityIdMap = new Map();

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Phase 1: Migrate main coaching centers (is_main = 1)
    log('\n' + '='.repeat(80));
    log('PHASE 1: MIGRATING MAIN COACHING CENTERS (is_main = 1)');
    log('='.repeat(80));
    
    const [mainCoachingCenters] = await mysqlConnection.execute(
      `SELECT * FROM coaching_centres WHERE is_main = '1' AND deleted_at IS NULL`
    );

    log(`Found ${mainCoachingCenters.length} main coaching centers to migrate`);

    // Map to store main_coaching_id -> user ObjectId mapping
    const mainCoachingUserMap = new Map();

    for (const cc of mainCoachingCenters) {
      try {
        const result = await migrateSingleCoachingCenter(cc, mysqlConnection, agentRoleId, academyRoleId, facilityIdMap);
        
        if (result.skipped) {
          skippedCount++;
        } else if (result.migrated) {
          migratedCount++;
          // Store the mapping: main_coaching_id -> user ObjectId for phase 2
          mainCoachingUserMap.set(cc.id, result.userObjectId);
        }
      } catch (error) {
        logError(`Error migrating coaching center: ${cc.id}`, error);
        errorCount++;
      }
    }

    log(`\n📊 Phase 1 Summary:`);
    log(`   ✅ Migrated: ${migratedCount}`);
    log(`   ⏭️  Skipped: ${skippedCount}`);
    log(`   ❌ Errors: ${errorCount}`);

    // Phase 2: Migrate sub-coaching centers (is_main = 0)
    log('\n' + '='.repeat(80));
    log('PHASE 2: MIGRATING SUB-COACHING CENTERS (is_main = 0)');
    log('='.repeat(80));
    
    const [subCoachingCenters] = await mysqlConnection.execute(
      `SELECT * FROM coaching_centres WHERE is_main = '0' AND deleted_at IS NULL`
    );

    log(`Found ${subCoachingCenters.length} sub-coaching centers to migrate`);

    let phase2MigratedCount = 0;
    let phase2SkippedCount = 0;
    let phase2ErrorCount = 0;

    for (const cc of subCoachingCenters) {
      try {
        // Find the associated main coaching center's user ID
        let associatedUserId = null;
        if (cc.main_coaching_id) {
          associatedUserId = mainCoachingUserMap.get(cc.main_coaching_id);
          
          if (!associatedUserId) {
            // Try to find the main coaching center in MongoDB
            const mainCC = await CoachingCenterModel.findOne({ id: cc.main_coaching_id });
            if (mainCC) {
              associatedUserId = mainCC.user;
              mainCoachingUserMap.set(cc.main_coaching_id, associatedUserId);
              log(`   ✅ Found main coaching center user ID from MongoDB: ${associatedUserId}`);
            }
          }
        }

        if (!associatedUserId) {
          log(`   ⚠️  No associated main coaching center found for main_coaching_id: ${cc.main_coaching_id}, skipping`);
          migrationReport.skippedCoachingCenters.push({
            coachingCenterId: cc.id,
            coachingCenterName: cc.coaching_name || cc.id,
            email: cc.email || null,
            mobile: cc.mobile_number || cc.contact_number || null,
            reason: `No associated main coaching center found for main_coaching_id: ${cc.main_coaching_id}`,
            skippedAt: new Date().toISOString()
          });
          phase2SkippedCount++;
          continue;
        }

        const result = await migrateSingleCoachingCenter(cc, mysqlConnection, agentRoleId, academyRoleId, facilityIdMap, associatedUserId);
        
        if (result.skipped) {
          phase2SkippedCount++;
        } else if (result.migrated) {
          phase2MigratedCount++;
        }
      } catch (error) {
        logError(`Error migrating sub-coaching center: ${cc.id}`, error);
        phase2ErrorCount++;
      }
    }

    log(`\n📊 Phase 2 Summary:`);
    log(`   ✅ Migrated: ${phase2MigratedCount}`);
    log(`   ⏭️  Skipped: ${phase2SkippedCount}`);
    log(`   ❌ Errors: ${phase2ErrorCount}`);

    // Final Summary
    const totalMigrated = migratedCount + phase2MigratedCount;
    const totalSkipped = skippedCount + phase2SkippedCount;
    const totalErrors = errorCount + phase2ErrorCount;
    const total = mainCoachingCenters.length + subCoachingCenters.length;

    log(`\n📊 Final Coaching Centers Migration Summary:`);
    log(`   ✅ Migrated: ${totalMigrated}`);
    log(`   ⏭️  Skipped: ${totalSkipped}`);
    log(`   ❌ Errors: ${totalErrors}`);
    log(`   📦 Total: ${total}\n`);

    return { migratedCount: totalMigrated, skippedCount: totalSkipped, errorCount: totalErrors, total };
  } catch (error) {
    logError('Error in migrateCoachingCenters', error);
    throw error;
  }
}

/**
 * Aggregate training timing from batches for a coaching center
 * @param {string} centerId - Coaching center ID
 * @returns {Object|null} Training timing object or null
 */
async function aggregateTrainingTimingFromBatches(centerId) {
  try {
    // Find the coaching center ObjectId
    const center = await CoachingCenterModel.findOne({ id: centerId }).select('_id').lean();
    if (!center) {
      return null;
    }
    
    // Find all batches for this center
    const batches = await BatchModel.find({
      center: center._id,
      is_deleted: false,
    })
      .select('scheduled')
      .lean();
    
    if (!batches || batches.length === 0) {
      return null;
    }
    
    // Map to store unique day-timing combinations
    const timingMap = new Map();
    
    for (const batch of batches) {
      const scheduled = batch.scheduled;
      
      if (!scheduled) continue;
      
      // Priority 1: Use individual_timings if available
      if (scheduled.individual_timings && scheduled.individual_timings.length > 0) {
        for (const timing of scheduled.individual_timings) {
          const day = timing.day?.toLowerCase();
          if (day && timing.start_time && timing.end_time) {
            const key = `${day}_${timing.start_time}_${timing.end_time}`;
            if (!timingMap.has(key)) {
              timingMap.set(key, {
                day: day,
                start_time: timing.start_time,
                end_time: timing.end_time,
              });
            }
          }
        }
      }
      // Priority 2: Use common timing with training_days
      else if (scheduled.start_time && scheduled.end_time && scheduled.training_days && scheduled.training_days.length > 0) {
        for (const day of scheduled.training_days) {
          const dayLower = day?.toLowerCase();
          if (dayLower) {
            const key = `${dayLower}_${scheduled.start_time}_${scheduled.end_time}`;
            if (!timingMap.has(key)) {
              timingMap.set(key, {
                day: dayLower,
                start_time: scheduled.start_time,
                end_time: scheduled.end_time,
              });
            }
          }
        }
      }
    }
    
    // Convert map to array
    const timings = Array.from(timingMap.values());
    
    if (timings.length === 0) {
      return null;
    }
    
    return {
      timings: timings,
    };
  } catch (error) {
    logError(`Error aggregating training timing for center ${centerId}`, error);
    return null;
  }
}

/**
 * Update training timing for all coaching centers from batches
 */
async function updateTrainingTimingFromBatches() {
  try {
    log('='.repeat(80));
    log('STEP 2.5: UPDATING TRAINING TIMING FROM BATCHES');
    log('='.repeat(80));
    
    // Get all coaching centers
    const coachingCenters = await CoachingCenterModel.find({
      is_deleted: false,
    }).select('id').lean();
    
    log(`Found ${coachingCenters.length} coaching centers to update training timing\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const center of coachingCenters) {
      try {
        const trainingTiming = await aggregateTrainingTimingFromBatches(center.id);
        
        if (trainingTiming && trainingTiming.timings && trainingTiming.timings.length > 0) {
          await CoachingCenterModel.updateOne(
            { id: center.id },
            { $set: { training_timing: trainingTiming } }
          );
          updatedCount++;
          log(`  ✅ Updated training timing for ${center.id}: ${trainingTiming.timings.length} day(s)`);
        } else {
          skippedCount++;
          log(`  ⏭️  Skipped ${center.id} (no batch timing data found)`);
        }
      } catch (error) {
        errorCount++;
        logError(`  ❌ Error updating training timing for ${center.id}`, error);
      }
    }
    
    log(`\n📊 Training Timing Update Summary:`);
    log(`   ✅ Updated: ${updatedCount}`);
    log(`   ⏭️  Skipped: ${skippedCount}`);
    log(`   ❌ Errors: ${errorCount}\n`);
    
  } catch (error) {
    logError('Error in updateTrainingTimingFromBatches', error);
    throw error;
  }
}

/**
 * Clean up previously imported data before migration
 * This ensures a fresh import every time
 * @param {boolean} skipCleanup - If true, skip cleanup (default: false)
 */
async function cleanupImportedData(skipCleanup = false) {
  if (skipCleanup) {
    log('='.repeat(80));
    log('STEP 0: SKIPPING CLEANUP');
    log('='.repeat(80));
    log('⚠️  Cleanup skipped. Existing data will be preserved.\n');
    return;
  }

  try {
    log('='.repeat(80));
    log('STEP 0: CLEANING UP PREVIOUSLY IMPORTED DATA');
    log('='.repeat(80));
    
    // Count existing data before deletion
    const coachingCenterCount = await CoachingCenterModel.countDocuments({});
    const academyRole = await RoleModel.findOne({ name: 'academy' });
    let academyUserCount = 0;
    if (academyRole) {
      academyUserCount = await UserModel.countDocuments({ 
        roles: { $in: [academyRole._id] } 
      });
    }
    const sportCount = await SportModel.countDocuments({});

    log('\n⚠️  WARNING: This will DELETE the following data:');
    log(`   - ${coachingCenterCount} Coaching Centers`);
    log(`   - ${academyUserCount} Academy Users`);
    log(`   - ${sportCount} Sports`);
    log('\n⚠️  Proceeding with cleanup...\n');

    // Step 1: Delete all Coaching Centers (they reference users)
    log('Deleting Coaching Centers...');
    try {
      const coachingCenterResult = await CoachingCenterModel.deleteMany({});
      logSuccess(`✅ Deleted ${coachingCenterResult.deletedCount} Coaching Centers`);
    } catch (error) {
      logError('Error deleting Coaching Centers', error);
      throw error;
    }

    // Step 2: Delete all Users with academy role (coaching center owners)
    log('\nDeleting Academy Users...');
    try {
      if (academyRole) {
        const userResult = await UserModel.deleteMany({ 
          roles: { $in: [academyRole._id] } 
        });
        logSuccess(`✅ Deleted ${userResult.deletedCount} Academy Users`);
      } else {
        log('⚠️  Academy role not found, skipping user deletion');
      }
    } catch (error) {
      logError('Error deleting Academy Users', error);
      throw error;
    }

    // Step 3: Delete all Sports (we're re-importing them)
    log('\nDeleting Sports...');
    try {
      const sportResult = await SportModel.deleteMany({});
      logSuccess(`✅ Deleted ${sportResult.deletedCount} Sports`);
    } catch (error) {
      logError('Error deleting Sports', error);
      throw error;
    }

    // Note: We keep Facilities as they might be used elsewhere
    // and they are created/found during migration, not fully replaced

    logSuccess('\n✨ Cleanup completed successfully! ✨');
    log('='.repeat(80));
    log('');

  } catch (error) {
    if (error.message.includes('Cleanup disabled') || error.message.includes('requires explicit confirmation')) {
      // Re-throw safety errors
      throw error;
    }
    logError('Error in cleanupImportedData', error);
    throw error;
  }
}


/**
 * Create indexes for all migrated collections
 * This ensures optimal query performance
 */
async function createIndexes() {
  try {
    log('='.repeat(80));
    log('STEP 3: CREATING INDEXES');
    log('='.repeat(80));
    log('Creating indexes for optimal query performance...\n');

    // Create indexes for User collection
    log('Creating indexes for User collection...');
    try {
      await UserModel.createIndexes();
      const userIndexes = await UserModel.collection.getIndexes();
      logSuccess(`✅ User indexes created: ${Object.keys(userIndexes).length} indexes`);
      log(`   Indexes: ${Object.keys(userIndexes).join(', ')}`);
    } catch (error) {
      logError('Error creating User indexes', error);
    }

    // Create indexes for Sport collection
    log('\nCreating indexes for Sport collection...');
    try {
      await SportModel.createIndexes();
      const sportIndexes = await SportModel.collection.getIndexes();
      logSuccess(`✅ Sport indexes created: ${Object.keys(sportIndexes).length} indexes`);
      log(`   Indexes: ${Object.keys(sportIndexes).join(', ')}`);
    } catch (error) {
      logError('Error creating Sport indexes', error);
    }

    // Create indexes for CoachingCenter collection
    log('\nCreating indexes for CoachingCenter collection...');
    try {
      await CoachingCenterModel.createIndexes();
      const coachingCenterIndexes = await CoachingCenterModel.collection.getIndexes();
      logSuccess(`✅ CoachingCenter indexes created: ${Object.keys(coachingCenterIndexes).length} indexes`);
      log(`   Indexes: ${Object.keys(coachingCenterIndexes).join(', ')}`);
    } catch (error) {
      logError('Error creating CoachingCenter indexes', error);
    }

    // Create indexes for Facility collection
    log('\nCreating indexes for Facility collection...');
    try {
      await FacilityModel.createIndexes();
      const facilityIndexes = await FacilityModel.collection.getIndexes();
      logSuccess(`✅ Facility indexes created: ${Object.keys(facilityIndexes).length} indexes`);
      log(`   Indexes: ${Object.keys(facilityIndexes).join(', ')}`);
    } catch (error) {
      logError('Error creating Facility indexes', error);
    }

    // Create indexes for Role collection
    log('\nCreating indexes for Role collection...');
    try {
      await RoleModel.createIndexes();
      const roleIndexes = await RoleModel.collection.getIndexes();
      logSuccess(`✅ Role indexes created: ${Object.keys(roleIndexes).length} indexes`);
      log(`   Indexes: ${Object.keys(roleIndexes).join(', ')}`);
    } catch (error) {
      logError('Error creating Role indexes', error);
    }

    logSuccess('\n✨ All indexes created successfully! ✨');
    log('='.repeat(80));

  } catch (error) {
    logError('Error in createIndexes', error);
    throw error;
  }
}

/**
 * Main migration function
 * @param {boolean} skipCleanup - If true, skip cleanup step
 */
async function runMigration(skipCleanup = false) {
  let mysqlConnection = null;

  try {
    log(`📝 Migration logs will be saved to: ${migrationLogPath}`);
    log('🚀 Starting Migration Process...\n');

    // Connect to MongoDB
    log('Connecting to MongoDB...');
    await connectDatabase();
    logSuccess('MongoDB connected successfully\n');

    // Connect to MySQL
    log('Connecting to MySQL...');
    mysqlConnection = await connectMySQL();
    log('');

    // Step 0: Cleanup previously imported data (optional)
    // Check environment variable or use parameters
    const envSkipCleanup = process.env.SKIP_CLEANUP === 'true';
    const shouldSkipCleanup = skipCleanup || envSkipCleanup;
    
    await cleanupImportedData(shouldSkipCleanup);

    // Step 1: Import Sports
    log('='.repeat(80));
    log('STEP 1: IMPORTING SPORTS');
    log('='.repeat(80));
    await importSports(mysqlConnection);
    log('');

    // Step 2: Migrate Coaching Centers
    log('='.repeat(80));
    log('STEP 2: MIGRATING COACHING CENTERS');
    log('='.repeat(80));
    await migrateCoachingCenters(mysqlConnection);
    log('');

    // Step 2.5: Update Training Timing from Batches (if batches exist)
    // This step aggregates training timing from MongoDB batches and updates coaching centers
    // Note: This will only work if batches have already been migrated to MongoDB
    try {
      await updateTrainingTimingFromBatches();
      log('');
    } catch (error) {
      logError('Warning: Could not update training timing from batches (batches may not be migrated yet)', error);
      log('You can run this step later after batches are migrated.\n');
    }

    // Step 3: Create Indexes
    await createIndexes();
    log('');

    log('='.repeat(80));
    logSuccess('✨ Migration completed successfully! ✨');
    log('='.repeat(80));

  } catch (error) {
    logError('Migration failed', error);
    process.exit(1);
  } finally {
    // Write migration report
    writeReport();
    
    // Close connections
    if (mysqlConnection) {
      await closeMySQL(mysqlConnection);
    }
    await disconnectDatabase();
    log('\nAll database connections closed.');
    
    // Close log file stream properly
    if (logFileStream) {
      const footer = `\n${'='.repeat(80)}\nMigration Ended: ${new Date().toISOString()}\n${'='.repeat(80)}\n\n`;
      logFileStream.write(footer);
      
      await new Promise((resolve) => {
        logFileStream.end(() => {
          console.log(`\n📝 Migration logs saved to: ${migrationLogPath}`);
          resolve();
        });
      });
    }
  }
}

// Run migration if executed directly
if (require.main === module) {
  // Check command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  // Parse flags
  const skipCleanup = args.includes('--skip-cleanup');

  // If command is 'indexes' or 'index', only create indexes
  if (command === 'indexes' || command === 'index') {
    log('🚀 Starting Index Creation Process...\n');
    
    connectDatabase()
      .then(() => {
        logSuccess('MongoDB connected successfully\n');
        return createIndexes();
      })
      .then(() => {
        return disconnectDatabase();
      })
      .then(() => {
        log('\n✅ Index creation completed!');
        setTimeout(() => {
          process.exit(0);
        }, 100);
      })
      .catch((error) => {
        logError('Index creation failed', error);
        disconnectDatabase().finally(() => {
          setTimeout(() => {
            process.exit(1);
          }, 100);
        });
      });
  } else {
    // Run full migration
    runMigration(skipCleanup)
      .then(() => {
        log('Migration script finished.');
        // Give a moment for file to flush
        setTimeout(() => {
          process.exit(0);
        }, 100);
      })
      .catch((error) => {
        logError('Migration script failed', error);
        // Give a moment for file to flush
        setTimeout(() => {
          process.exit(1);
        }, 100);
      });
  }
}

module.exports = {
  connectMySQL,
  closeMySQL,
  cleanupImportedData,
  importSports,
  migrateCoachingCenters,
  createIndexes,
  runMigration,
};
