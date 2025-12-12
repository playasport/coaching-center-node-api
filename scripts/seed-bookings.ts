import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { BookingModel, BookingStatus, PaymentStatus } from '../src/models/booking.model';
import { UserModel } from '../src/models/user.model';
import { ParticipantModel } from '../src/models/participant.model';
import { BatchModel } from '../src/models/batch.model';
import { CoachingCenterModel } from '../src/models/coachingCenter.model';
import { SportModel } from '../src/models/sport.model';
import { RoleModel } from '../src/models/role.model';
import { DefaultRoles } from '../src/enums/defaultRoles.enum';
import { logger } from '../src/utils/logger';
import { Types } from 'mongoose';
import { generateBookingId } from '../src/services/booking.service';

interface BookingSeedData {
  user: Types.ObjectId;
  participants: Types.ObjectId[];
  batch: Types.ObjectId;
  center: Types.ObjectId;
  sport: Types.ObjectId;
  amount: number;
  currency: string;
  status: BookingStatus;
  payment: {
    razorpay_order_id?: string | null;
    razorpay_payment_id?: string | null;
    razorpay_signature?: string | null;
    amount: number;
    currency: string;
    status: PaymentStatus;
    payment_method?: string | null;
    paid_at?: Date | null;
    failure_reason?: string | null;
  };
  notes?: string | null;
}

// Generate random Razorpay-like IDs
const generateRazorpayOrderId = (): string => {
  return `order_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
};

const generateRazorpayPaymentId = (): string => {
  return `pay_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
};

const generateRazorpaySignature = (): string => {
  return `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
};

// Get random element from array
const getRandomElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Get random elements from array
const getRandomElements = <T>(array: T[], count: number): T[] => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
};

const seedBookings = async () => {
  try {
    console.log('\n🚀 Starting Bookings Seeding...\n');

    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Fetch required data
    console.log('📊 Fetching required data...\n');

    // Ensure Role model is registered by referencing it
    // The import should register it, but we reference it here to ensure it's loaded
    const _roleModelCheck = RoleModel.modelName; // This ensures the model is registered

    // Get USER role first
    const userRole = await RoleModel.findOne({ name: DefaultRoles.USER });
    if (!userRole) {
      console.error('❌ USER role not found. Please seed roles first.');
      await disconnectDatabase();
      process.exit(1);
    }

    // Get users with USER role (query directly by role ID instead of populating)
    const usersWithUserRole = await UserModel.find({
      roles: userRole._id,
      isDeleted: false,
      isActive: true,
    }).limit(20);

    if (usersWithUserRole.length === 0) {
      console.error('❌ No users with USER role found. Please seed users first.');
      await disconnectDatabase();
      process.exit(1);
    }

    console.log(`   Found ${usersWithUserRole.length} users with USER role`);

    // Get participants
    const participants = await ParticipantModel.find({
      is_deleted: false,
      is_active: true,
    }).limit(50);

    if (participants.length === 0) {
      console.error('❌ No participants found. Please seed participants first.');
      await disconnectDatabase();
      process.exit(1);
    }

    console.log(`   Found ${participants.length} participants`);

    // Get batches
    const batches = await BatchModel.find({
      is_deleted: false,
      is_active: true,
    })
      .populate('sport')
      .populate('center')
      .limit(20);

    if (batches.length === 0) {
      console.error('❌ No batches found. Please seed batches first.');
      await disconnectDatabase();
      process.exit(1);
    }

    console.log(`   Found ${batches.length} batches`);

    // Get coaching centers
    const centers = await CoachingCenterModel.find({
      is_deleted: false,
      is_active: true,
    }).limit(20);

    if (centers.length === 0) {
      console.error('❌ No coaching centers found. Please seed coaching centers first.');
      await disconnectDatabase();
      process.exit(1);
    }

    console.log(`   Found ${centers.length} coaching centers`);

    // Get sports
    const sports = await SportModel.find({}).limit(20);

    if (sports.length === 0) {
      console.error('❌ No sports found. Please seed sports first.');
      await disconnectDatabase();
      process.exit(1);
    }

    console.log(`   Found ${sports.length} sports\n`);

    // Check existing bookings
    const existingBookings = await BookingModel.countDocuments({});
    console.log(`📊 Current bookings count: ${existingBookings}\n`);

    // Generate booking seed data
    const bookingSeedData: BookingSeedData[] = [];
    const bookingStatuses = Object.values(BookingStatus);
    const paymentStatuses = Object.values(PaymentStatus);
    const paymentMethods = ['card', 'netbanking', 'upi', 'wallet', null];
    const notesOptions = [
      'Regular student booking',
      'Early bird discount applied',
      'Referral booking',
      'Group booking',
      'Special discount',
      null,
      null,
      null, // More nulls to have more bookings without notes
    ];

    // Create bookings for each batch
    for (const batch of batches) {
      // Get participants for this user (randomly select a user)
      const user = getRandomElement(usersWithUserRole);
      const userParticipants = participants.filter(
        (p) => p.userId.toString() === user._id.toString()
      );

      if (userParticipants.length === 0) {
        // If no participants for this user, use any participant
        const randomParticipants = getRandomElements(participants, Math.floor(Math.random() * 3) + 1);
        if (randomParticipants.length === 0) continue;

        // Create 1-3 bookings per batch
        const numBookings = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numBookings; i++) {
          const status = getRandomElement(bookingStatuses);
          const paymentStatus = getRandomElement(paymentStatuses);
          const amount = Math.floor(Math.random() * 50000) + 1000; // Between 1000 and 51000
          const paymentMethod = getRandomElement(paymentMethods);
          const notes = getRandomElement(notesOptions);

          // Determine payment details based on status
          let razorpay_order_id: string | null = null;
          let razorpay_payment_id: string | null = null;
          let razorpay_signature: string | null = null;
          let paid_at: Date | null = null;

          if (paymentStatus === PaymentStatus.SUCCESS || paymentStatus === PaymentStatus.PROCESSING) {
            razorpay_order_id = generateRazorpayOrderId();
            if (paymentStatus === PaymentStatus.SUCCESS) {
              razorpay_payment_id = generateRazorpayPaymentId();
              razorpay_signature = generateRazorpaySignature();
              paid_at = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)); // Random date in last 30 days
            }
          }

          bookingSeedData.push({
            user: user._id as Types.ObjectId,
            participants: randomParticipants.map((p) => p._id as Types.ObjectId),
            batch: batch._id as Types.ObjectId,
            center: (batch.center as any)._id as Types.ObjectId,
            sport: (batch.sport as any)._id as Types.ObjectId,
            amount,
            currency: 'INR',
            status,
            payment: {
              razorpay_order_id,
              razorpay_payment_id,
              razorpay_signature,
              amount,
              currency: 'INR',
              status: paymentStatus,
              payment_method: paymentMethod || null,
              paid_at,
              failure_reason:
                paymentStatus === PaymentStatus.FAILED
                  ? 'Payment gateway timeout'
                  : paymentStatus === PaymentStatus.CANCELLED
                    ? 'User cancelled payment'
                    : null,
            },
            notes,
          });
        }
      } else {
        // Use user's participants
        const selectedParticipants = getRandomElements(
          userParticipants,
          Math.min(userParticipants.length, Math.floor(Math.random() * 3) + 1)
        );

        // Create 1-3 bookings per batch
        const numBookings = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numBookings; i++) {
          const status = getRandomElement(bookingStatuses);
          const paymentStatus = getRandomElement(paymentStatuses);
          const amount = Math.floor(Math.random() * 50000) + 1000; // Between 1000 and 51000
          const paymentMethod = getRandomElement(paymentMethods);
          const notes = getRandomElement(notesOptions);

          // Determine payment details based on status
          let razorpay_order_id: string | null = null;
          let razorpay_payment_id: string | null = null;
          let razorpay_signature: string | null = null;
          let paid_at: Date | null = null;

          if (paymentStatus === PaymentStatus.SUCCESS || paymentStatus === PaymentStatus.PROCESSING) {
            razorpay_order_id = generateRazorpayOrderId();
            if (paymentStatus === PaymentStatus.SUCCESS) {
              razorpay_payment_id = generateRazorpayPaymentId();
              razorpay_signature = generateRazorpaySignature();
              paid_at = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)); // Random date in last 30 days
            }
          }

          bookingSeedData.push({
            user: user._id as Types.ObjectId,
            participants: selectedParticipants.map((p) => p._id as Types.ObjectId),
            batch: batch._id as Types.ObjectId,
            center: (batch.center as any)._id as Types.ObjectId,
            sport: (batch.sport as any)._id as Types.ObjectId,
            amount,
            currency: 'INR',
            status,
            payment: {
              razorpay_order_id,
              razorpay_payment_id,
              razorpay_signature,
              amount,
              currency: 'INR',
              status: paymentStatus,
              payment_method: paymentMethod || null,
              paid_at,
              failure_reason:
                paymentStatus === PaymentStatus.FAILED
                  ? 'Payment gateway timeout'
                  : paymentStatus === PaymentStatus.CANCELLED
                    ? 'User cancelled payment'
                    : null,
            },
            notes,
          });
        }
      }
    }

    console.log(`📝 Generated ${bookingSeedData.length} booking records to seed\n`);

    // Seed bookings
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const bookingData of bookingSeedData) {
      try {
        // Check if booking with same user, batch, and participants already exists
        const existingBooking = await BookingModel.findOne({
          user: bookingData.user,
          batch: bookingData.batch,
          participants: { $all: bookingData.participants },
          is_deleted: false,
        });

        if (existingBooking) {
          skipped++;
          continue;
        }

        // Generate unique booking ID
        const bookingId = await generateBookingId();

        // Create new booking with booking_id
        const booking = new BookingModel({
          ...bookingData,
          booking_id: bookingId,
        });
        await booking.save();
        created++;
      } catch (error) {
        const errorMessage = `Failed to create booking: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`❌ ${errorMessage}`);
        errors.push(errorMessage);
        logger.error(errorMessage, error);
      }
    }

    // Display results
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Seeding Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`  ✅ Created: ${created} bookings`);
    console.log(`  ⏭️  Skipped: ${skipped} bookings (already exist)`);
    if (errors.length > 0) {
      console.log(`  ❌ Errors: ${errors.length}`);
      errors.forEach((error) => console.log(`     - ${error}`));
    }
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  ${errors.length === 0 ? '✅ SUCCESS' : '⚠️  COMPLETED WITH ERRORS'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Disconnect and exit
    await disconnectDatabase();
    process.exit(errors.length === 0 ? 0 : 1);
  } catch (error) {
    logger.error('Fatal error during bookings seeding:', error);
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error);
    await disconnectDatabase();
    process.exit(1);
  }
};

// Run seeder
seedBookings();
