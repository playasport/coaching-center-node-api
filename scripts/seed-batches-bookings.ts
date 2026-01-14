import { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { BatchModel } from '../src/models/batch.model';
import { BookingModel, BookingStatus, PaymentStatus } from '../src/models/booking.model';
import { ParticipantModel } from '../src/models/participant.model';
import { SportModel } from '../src/models/sport.model';
import { CoachingCenterModel } from '../src/models/coachingCenter.model';
import { BatchStatus } from '../src/enums/batchStatus.enum';
import { DurationType } from '../src/enums/durationType.enum';
import { OperatingDays } from '../src/enums/operatingDays.enum';
import { Gender } from '../src/enums/gender.enum';
import { CoachingCenterStatus } from '../src/enums/coachingCenterStatus.enum';
import { logger } from '../src/utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const DEFAULT_USER_ID = '694249694e9cdb6816192a95'; // Default Academy User ID
const DEFAULT_BATCH_COUNT = 5;
const DEFAULT_BOOKING_COUNT_PER_BATCH = 3;
const DEFAULT_PARTICIPANT_COUNT = 5;

// Get command line arguments - handle both npm run and direct execution
const args = process.argv.slice(2);

// Debug: Log received arguments (can be removed later)
if (process.env.DEBUG === 'true') {
  console.log('Received arguments:', args);
}

// Parse arguments - handle both --key=value and --key value formats
const parseArg = (key: string): string | undefined => {
  // Try --key=value format
  const equalFormat = args.find(arg => arg.startsWith(`--${key}=`));
  if (equalFormat) {
    return equalFormat.split('=').slice(1).join('='); // Handle values with = in them
  }
  
  // Try --key value format
  const index = args.indexOf(`--${key}`);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  
  return undefined;
};

const userIdArg = parseArg('userId') || process.env.USER_ID || DEFAULT_USER_ID;
const sportIdArg = parseArg('sportId') || process.env.SPORT_ID;
const centerIdArg = parseArg('centerId') || process.env.CENTER_ID;
const batchCountArg = parseArg('batchCount') || process.env.BATCH_COUNT;
const bookingCountArg = parseArg('bookingCount') || process.env.BOOKING_COUNT;
const participantCountArg = parseArg('participantCount') || process.env.PARTICIPANT_COUNT;

// Validate and convert userId
let userId: Types.ObjectId | null = null;
if (userIdArg) {
  try {
    userId = new Types.ObjectId(userIdArg.trim());
  } catch (error) {
    console.error(`❌ Invalid User ID format: ${userIdArg}`);
    userId = null;
  }
}

// Validate and convert sportId
let sportId: Types.ObjectId | null = null;
if (sportIdArg) {
  try {
    sportId = new Types.ObjectId(sportIdArg);
  } catch (error) {
    console.error(`❌ Invalid Sport ID format: ${sportIdArg}`);
    sportId = null;
  }
}

// Validate and convert centerId
let centerId: Types.ObjectId | null = null;
if (centerIdArg) {
  try {
    centerId = new Types.ObjectId(centerIdArg);
  } catch (error) {
    console.error(`❌ Invalid Center ID format: ${centerIdArg}`);
    centerId = null;
  }
}

const batchCount = batchCountArg ? parseInt(batchCountArg, 10) : DEFAULT_BATCH_COUNT;
const bookingCountPerBatch = bookingCountArg ? parseInt(bookingCountArg, 10) : DEFAULT_BOOKING_COUNT_PER_BATCH;
const participantCount = participantCountArg ? parseInt(participantCountArg, 10) : DEFAULT_PARTICIPANT_COUNT;

// Helper function to generate random date
const getRandomDate = (start: Date, end: Date): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Helper function to generate random time
const getRandomTime = (startHour: number, endHour: number): string => {
  const hour = Math.floor(Math.random() * (endHour - startHour)) + startHour;
  const minute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

// Generate dummy sport data
const generateDummySport = () => {
  const sportNames = ['Football', 'Cricket', 'Basketball', 'Tennis', 'Swimming', 'Badminton', 'Volleyball', 'Athletics'];
  const randomName = sportNames[Math.floor(Math.random() * sportNames.length)];
  
  return {
    name: `Dummy ${randomName}`,
    is_active: true,
    is_popular: Math.random() > 0.5,
  };
};

// Generate dummy coaching center data
const generateDummyCoachingCenter = (userId: Types.ObjectId, sportId: Types.ObjectId) => {
  const centerNames = [
    'Elite Sports Academy',
    'Champion Coaching Center',
    'Pro Sports Training',
    'Ace Sports Academy',
    'Victory Sports Center',
  ];
  
  const cities = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune'];
  const states = ['Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'West Bengal', 'Telangana'];
  
  const randomCity = cities[Math.floor(Math.random() * cities.length)];
  const randomState = states[Math.floor(Math.random() * states.length)];
  const randomCenterName = centerNames[Math.floor(Math.random() * centerNames.length)];
  
  // Generate random mobile number (10 digits starting with 6-9)
  const mobileNumber = `${6 + Math.floor(Math.random() * 4)}${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`;
  
  // Generate random email
  const email = `dummy.center.${Date.now()}@example.com`;
  
  // Generate random coordinates (India bounds approximately)
  const latitude = 20 + Math.random() * 15; // 20-35 (India latitude range)
  const longitude = 70 + Math.random() * 20; // 70-90 (India longitude range)
  
  // Generate random pincode (6 digits)
  const pincode = Math.floor(Math.random() * 900000) + 100000;
  
  return {
    user: userId,
    center_name: randomCenterName,
    mobile_number: mobileNumber,
    email: email.toLowerCase(),
    sports: [sportId],
    sport_details: [
      {
        sport_id: sportId,
        description: `Professional ${randomCenterName} training program with experienced coaches and modern facilities.`,
        images: [],
        videos: [],
      },
    ],
    age: {
      min: 5,
      max: 18,
    },
    location: {
      latitude: latitude,
      longitude: longitude,
      address: {
        line1: null,
        line2: `${Math.floor(Math.random() * 100)} Main Street`,
        city: randomCity,
        state: randomState,
        country: 'India',
        pincode: pincode.toString(),
      },
    },
    facility: [],
    operational_timing: {
      operating_days: [OperatingDays.MONDAY, OperatingDays.TUESDAY, OperatingDays.WEDNESDAY, OperatingDays.THURSDAY, OperatingDays.FRIDAY, OperatingDays.SATURDAY],
      opening_time: '06:00',
      closing_time: '20:00',
    },
    documents: [],
    bank_information: {
      bank_name: 'Dummy Bank',
      account_number: (Math.floor(Math.random() * 9000000000000000) + 1000000000000000).toString(),
      ifsc_code: 'DUMM0001234',
      account_holder_name: randomCenterName,
      gst_number: null,
    },
    status: CoachingCenterStatus.DRAFT,
    allowed_genders: [Gender.MALE, Gender.FEMALE, Gender.OTHER],
    allowed_disabled: true,
    is_only_for_disabled: false,
    experience: Math.floor(Math.random() * 20) + 5, // 5-25 years
    is_active: true,
    approval_status: 'approved',
    is_deleted: false,
  };
};

// Generate dummy batch data
const generateBatchData = (
  userId: Types.ObjectId,
  sportId: Types.ObjectId,
  centerId: Types.ObjectId,
  index: number
) => {
  const batchNames = [
    'Beginner Football Batch',
    'Advanced Cricket Training',
    'Swimming Classes',
    'Basketball Fundamentals',
    'Tennis Coaching',
    'Badminton Training',
    'Volleyball Sessions',
    'Athletics Program',
    'Karate Classes',
    'Yoga & Fitness',
  ];

  const descriptions = [
    'Comprehensive training program for beginners',
    'Advanced techniques and strategies',
    'Professional coaching with experienced trainers',
    'Focus on fundamentals and skill development',
    'Intensive training sessions',
  ];

  const genders = [['male'], ['female'], ['male', 'female'], ['male', 'female', 'others']];
  const trainingDaysOptions = [
    [OperatingDays.MONDAY, OperatingDays.WEDNESDAY, OperatingDays.FRIDAY],
    [OperatingDays.TUESDAY, OperatingDays.THURSDAY, OperatingDays.SATURDAY],
    [OperatingDays.MONDAY, OperatingDays.TUESDAY, OperatingDays.WEDNESDAY, OperatingDays.THURSDAY, OperatingDays.FRIDAY],
    [OperatingDays.SATURDAY, OperatingDays.SUNDAY],
  ];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30)); // Next 30 days
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + Math.floor(Math.random() * 6) + 3); // 3-9 months later

  const selectedGenders = genders[Math.floor(Math.random() * genders.length)];
  const selectedTrainingDays = trainingDaysOptions[Math.floor(Math.random() * trainingDaysOptions.length)];

  // Random age range
  const minAge = Math.floor(Math.random() * 8) + 5; // 5-12
  const maxAge = Math.min(minAge + Math.floor(Math.random() * 6) + 3, 18); // Ensure max <= 18

  // Random capacity
  const minCapacity = Math.floor(Math.random() * 10) + 10; // 10-19
  const maxCapacity = minCapacity + Math.floor(Math.random() * 20) + 10; // minCapacity + 10-29

  // Random prices
  const basePrice = Math.floor(Math.random() * 5000) + 1000; // 1000-6000
  const discountedPrice = Math.random() > 0.5 ? Math.floor(basePrice * (0.7 + Math.random() * 0.2)) : null; // 70-90% of base price

  return {
    user: userId,
    name: batchNames[index % batchNames.length] + ` ${index + 1}`,
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
    sport: sportId,
    center: centerId,
    coach: null, // Optional, can be set later
    gender: selectedGenders,
    certificate_issued: Math.random() > 0.5,
    scheduled: {
      start_date: startDate,
      end_date: Math.random() > 0.3 ? endDate : null, // 70% have end date
      start_time: getRandomTime(6, 10), // 6 AM to 10 AM
      end_time: getRandomTime(16, 20), // 4 PM to 8 PM
      individual_timings: null,
      training_days: selectedTrainingDays,
    },
    duration: {
      count: Math.floor(Math.random() * 6) + 3, // 3-8
      type: Object.values(DurationType)[Math.floor(Math.random() * Object.values(DurationType).length)],
    },
    capacity: {
      min: minCapacity,
      max: maxCapacity,
    },
    age: {
      min: minAge,
      max: maxAge,
    },
    admission_fee: Math.random() > 0.5 ? Math.floor(Math.random() * 1000) + 500 : null, // 500-1500 or null
    base_price: basePrice,
    discounted_price: discountedPrice,
    status: Math.random() > 0.3 ? BatchStatus.PUBLISHED : BatchStatus.DRAFT, // 70% published
    is_active: true,
    is_deleted: false,
  };
};

// Generate dummy participant data
const generateParticipantData = (userId: Types.ObjectId, index: number) => {
  const firstNames = ['Rahul', 'Priya', 'Arjun', 'Ananya', 'Vikram', 'Sneha', 'Karan', 'Meera', 'Rohan', 'Kavya'];
  const lastNames = ['Sharma', 'Patel', 'Kumar', 'Singh', 'Reddy', 'Gupta', 'Verma', 'Jain', 'Malhotra', 'Agarwal'];
  const schoolNames = [
    'Delhi Public School',
    'Kendriya Vidyalaya',
    'St. Mary\'s School',
    'Modern School',
    'DPS International',
  ];

  const genderValues = Object.values(Gender);
  const selectedGender = genderValues[Math.floor(Math.random() * genderValues.length)];

  // Random date of birth (age 5-18)
  const age = Math.floor(Math.random() * 13) + 5;
  const dob = new Date();
  dob.setFullYear(dob.getFullYear() - age);
  dob.setMonth(Math.floor(Math.random() * 12));
  dob.setDate(Math.floor(Math.random() * 28) + 1);

  return {
    userId: userId,
    firstName: firstNames[index % firstNames.length],
    lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
    gender: selectedGender,
    disability: Math.random() > 0.9 ? 1 : 0, // 10% chance
    dob: dob,
    schoolName: schoolNames[Math.floor(Math.random() * schoolNames.length)],
    contactNumber: `9${Math.floor(Math.random() * 9000000000) + 1000000000}`, // 10-digit number starting with 9
    profilePhoto: null,
    address: null,
    isSelf: null,
    is_active: true,
    is_deleted: false,
  };
};

// Generate dummy booking data
const generateBookingData = (
  userId: Types.ObjectId,
  batchId: Types.ObjectId,
  centerId: Types.ObjectId,
  sportId: Types.ObjectId,
  participantIds: Types.ObjectId[],
  batchBasePrice: number,
  index: number
) => {
  const bookingStatuses = Object.values(BookingStatus);
  const paymentStatuses = Object.values(PaymentStatus);
  
  // Select random statuses
  const bookingStatus = bookingStatuses[Math.floor(Math.random() * bookingStatuses.length)];
  const paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];

  // Select 1-3 random participants (ensure at least 1)
  if (participantIds.length === 0) {
    throw new Error('Cannot create booking: No participants available');
  }
  const participantCount = Math.min(Math.floor(Math.random() * 3) + 1, participantIds.length);
  const selectedParticipants = participantIds
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.max(1, participantCount)); // Ensure at least 1 participant

  // Calculate amount (base price * number of participants)
  const amount = batchBasePrice * selectedParticipants.length;

  // Generate unique booking ID (using timestamp to avoid duplicates)
  const year = new Date().getFullYear();
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 1000);
  const bookingId = `BK-${year}-${String(index + 1).padStart(4, '0')}-${timestamp}-${randomSuffix}`;

  // Payment details
  const paymentDetails: any = {
    amount: amount,
    currency: 'INR',
    status: paymentStatus,
    payment_method: paymentStatus === PaymentStatus.SUCCESS ? 'razorpay' : null,
    razorpay_order_id: paymentStatus === PaymentStatus.SUCCESS || paymentStatus === PaymentStatus.PROCESSING 
      ? `order_${Math.random().toString(36).substring(2, 15)}` 
      : null,
    razorpay_payment_id: paymentStatus === PaymentStatus.SUCCESS 
      ? `pay_${Math.random().toString(36).substring(2, 15)}` 
      : null,
    razorpay_signature: paymentStatus === PaymentStatus.SUCCESS 
      ? `sig_${Math.random().toString(36).substring(2, 15)}` 
      : null,
    paid_at: paymentStatus === PaymentStatus.SUCCESS ? new Date() : null,
    failure_reason: paymentStatus === PaymentStatus.FAILED 
      ? 'Payment failed due to insufficient funds' 
      : null,
  };

  return {
    user: userId,
    participants: selectedParticipants,
    batch: batchId,
    center: centerId,
    sport: sportId,
    amount: amount,
    currency: 'INR',
    status: bookingStatus,
    payment: paymentDetails,
    notes: Math.random() > 0.7 ? `Booking notes for batch ${index + 1}` : null,
    is_active: true,
    is_deleted: false,
    booking_id: bookingId,
  };
};

// Main seeder function
const seedBatchesAndBookings = async () => {
  try {
    console.log('\n🚀 Starting Batch and Booking Seeding...\n');

    // Validate user ID
    if (!userId) {
      console.error('❌ Error: User ID is required!');
      console.log('\nUsage:');
      console.log('  npm run seed:batches-bookings [--userId=<USER_OBJECT_ID>] [options]');
      console.log('\n  Note: Default user ID is set to:', DEFAULT_USER_ID);
      console.log('  You can override it with --userId or USER_ID environment variable');
      console.log('\n  OR use environment variables:');
      console.log('  $env:USER_ID="<USER_OBJECT_ID>"; npm run seed:batches-bookings');
      console.log('\nOptions:');
      console.log('  --userId=<ID>              (optional) User ObjectId (default: ' + DEFAULT_USER_ID + ')');
      console.log('  --sportId=<ID>             (optional) Sport ObjectId (will find or create dummy if not provided)');
      console.log('  --centerId=<ID>            (optional) Coaching Center ObjectId (will find or create dummy if not provided)');
      console.log('  --batchCount=<NUMBER>      (optional) Number of batches to create (default: 5)');
      console.log('  --bookingCount=<NUMBER>    (optional) Number of bookings per batch (default: 3)');
      console.log('  --participantCount=<NUMBER> (optional) Number of participants to create (default: 5)');
      console.log('\nExamples:');
      console.log('  # Use default user ID:');
      console.log('  npm run seed:batches-bookings');
      console.log('\n  # Override user ID (PowerShell with quotes):');
      console.log('  npm run seed:batches-bookings -- "--userId=507f1f77bcf86cd799439011"');
      console.log('\n  # Using environment variable (PowerShell):');
      console.log('  $env:USER_ID="507f1f77bcf86cd799439011"; npm run seed:batches-bookings');
      console.log('\n  # Direct execution:');
      console.log('  tsx scripts/seed-batches-bookings.ts --userId=507f1f77bcf86cd799439011');
      process.exit(1);
    }
    
    // Show which user ID is being used
    if (userId.toString() === DEFAULT_USER_ID) {
      console.log(`ℹ️  Using default user ID: ${userId} (Academy)\n`);
    } else {
      console.log(`ℹ️  Using user ID: ${userId}\n`);
    }

    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Find or create Sport
    let sport: any = null;
    if (sportId) {
      sport = await SportModel.findById(sportId);
      if (!sport) {
        console.log(`⚠️  Sport with ID ${sportId} not found. Creating dummy sport...`);
        const dummySportData = generateDummySport();
        sport = new SportModel(dummySportData);
        await sport.save();
        console.log(`✅ Created dummy Sport: ${sport.name} (${sport._id})\n`);
      } else {
        console.log(`✅ Using Sport: ${sport.name} (${sport._id})\n`);
      }
    } else {
      sport = await SportModel.findOne({ is_active: true });
      if (!sport) {
        console.log('⚠️  No active sport found. Creating dummy sport...');
        const dummySportData = generateDummySport();
        sport = new SportModel(dummySportData);
        await sport.save();
        console.log(`✅ Created dummy Sport: ${sport.name} (${sport._id})\n`);
      } else {
        console.log(`✅ Found Sport: ${sport.name} (${sport._id})\n`);
      }
    }

    // Find or create Coaching Center
    let center: any = null;
    if (centerId) {
      center = await CoachingCenterModel.findById(centerId);
      if (!center) {
        console.log(`⚠️  Coaching Center with ID ${centerId} not found. Creating dummy coaching center...`);
        const dummyCenterData = generateDummyCoachingCenter(userId, sport._id);
        center = new CoachingCenterModel(dummyCenterData);
        await center.save();
        console.log(`✅ Created dummy Coaching Center: ${center.center_name} (${center._id})\n`);
      } else {
        console.log(`✅ Using Coaching Center: ${center.center_name} (${center._id})\n`);
      }
    } else {
      center = await CoachingCenterModel.findOne({ 
        user: userId, 
        is_active: true, 
        is_deleted: false 
      });
      if (!center) {
        console.log('⚠️  No active coaching center found for this user. Creating dummy coaching center...');
        const dummyCenterData = generateDummyCoachingCenter(userId, sport._id);
        center = new CoachingCenterModel(dummyCenterData);
        await center.save();
        console.log(`✅ Created dummy Coaching Center: ${center.center_name} (${center._id})\n`);
      } else {
        console.log(`✅ Found Coaching Center: ${center.center_name} (${center._id})\n`);
      }
    }

    // Verify that the center has the sport
    if (!center.sports.some((s: Types.ObjectId) => s.toString() === sport._id.toString())) {
      console.warn(`⚠️  Warning: Coaching Center does not have the selected sport. Continuing anyway...\n`);
    }

    // Create participants
    console.log(`📝 Creating ${participantCount} participants...`);
    const participantIds: Types.ObjectId[] = [];
    for (let i = 0; i < participantCount; i++) {
      try {
        const participantData = generateParticipantData(userId, i);
        const participant = new ParticipantModel(participantData);
        await participant.save();
        participantIds.push(participant._id);
        console.log(`  ✅ Created participant: ${participantData.firstName} ${participantData.lastName}`);
      } catch (error) {
        console.error(`  ❌ Failed to create participant ${i + 1}:`, error instanceof Error ? error.message : error);
        logger.error(`Failed to create participant ${i + 1}`, error);
      }
    }
    console.log(`\n✅ Created ${participantIds.length} participants\n`);

    // Create batches
    console.log(`📝 Creating ${batchCount} batches...`);
    const batchIds: Types.ObjectId[] = [];
    const batchPrices: Map<string, number> = new Map();

    for (let i = 0; i < batchCount; i++) {
      try {
        const batchData = generateBatchData(userId, sport._id, center._id, i);
        const batch = new BatchModel(batchData);
        await batch.save();
        batchIds.push(batch._id);
        batchPrices.set(batch._id.toString(), batch.base_price);
        console.log(`  ✅ Created batch: ${batch.name} (${batch._id})`);
      } catch (error) {
        console.error(`  ❌ Failed to create batch ${i + 1}:`, error instanceof Error ? error.message : error);
        logger.error(`Failed to create batch ${i + 1}`, error);
      }
    }
    console.log(`\n✅ Created ${batchIds.length} batches\n`);

    // Create bookings
    let totalBookings = 0; // Declare outside if-else block for scope
    let bookingIndex = 0;
    
    if (participantIds.length === 0) {
      console.error('❌ Cannot create bookings: No participants were created!');
      console.error('   Please ensure participants are created successfully before creating bookings.\n');
    } else if (batchIds.length === 0) {
      console.error('❌ Cannot create bookings: No batches were created!');
      console.error('   Please ensure batches are created successfully before creating bookings.\n');
    } else {
      console.log(`📝 Creating bookings (${bookingCountPerBatch} per batch)...`);

      for (const batchId of batchIds) {
        const batchPrice = batchPrices.get(batchId.toString()) || 2000;
        
        for (let j = 0; j < bookingCountPerBatch; j++) {
          try {
            // Ensure we have participants before creating booking
            if (participantIds.length === 0) {
              console.error(`  ❌ Skipping booking ${j + 1} for batch ${batchId}: No participants available`);
              continue;
            }

            const bookingData = generateBookingData(
              userId,
              batchId,
              center._id,
              sport._id,
              participantIds,
              batchPrice,
              bookingIndex
            );

            // Validate booking data before saving
            if (!bookingData.participants || bookingData.participants.length === 0) {
              console.error(`  ❌ Skipping booking ${j + 1} for batch ${batchId}: No participants selected`);
              continue;
            }

            const booking = new BookingModel(bookingData);
            await booking.save();
            totalBookings++;
            bookingIndex++;
            console.log(`  ✅ Created booking: ${bookingData.booking_id} for batch ${batchId}`);
          } catch (error: any) {
            const errorMessage = error?.message || 'Unknown error';
            const errorDetails = error?.errors ? JSON.stringify(error.errors, null, 2) : '';
            console.error(`  ❌ Failed to create booking ${j + 1} for batch ${batchId}:`);
            console.error(`     Error: ${errorMessage}`);
            if (errorDetails) {
              console.error(`     Details: ${errorDetails}`);
            }
            logger.error(`Failed to create booking ${j + 1} for batch ${batchId}`, error);
          }
        }
      }
      console.log(`\n✅ Created ${totalBookings} bookings\n`);
    }

    // Display results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Seeding Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`  ✅ Participants: ${participantIds.length}`);
    console.log(`  ✅ Batches: ${batchIds.length}`);
    console.log(`  ✅ Bookings: ${totalBookings}`);
    console.log(`  📊 User ID: ${userId}`);
    console.log(`  🏃 Sport: ${sport.name} (${sport._id})`);
    console.log(`  🏢 Center: ${center.center_name} (${center._id})`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✅ SUCCESS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Disconnect and exit
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Fatal error during batch and booking seeding:', error);
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error);
    await disconnectDatabase();
    process.exit(1);
  }
};

// Run seeder
seedBatchesAndBookings();

