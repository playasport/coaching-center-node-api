/**
 * Payout Seeding Script
 * 
 * This script creates dummy payout data for testing the admin payout system.
 * It will:
 * 1. Find or create an academy user with payout account
 * 2. Find existing bookings with successful payments (or create dummy bookings)
 * 3. Create transactions for those bookings
 * 4. Create payouts with various statuses (pending, processing, completed, failed)
 * 
 * Usage:
 *   npm run seed:payouts [--count=<NUMBER>]
 * 
 * Options:
 *   --count=<NUMBER>    Number of payouts to create (default: 20)
 * 
 * Examples:
 *   npm run seed:payouts
 *   npm run seed:payouts -- --count=50
 *   tsx scripts/seed-payouts.ts --count=30
 * 
 * Prerequisites:
 *   - Database must be running
 *   - Roles must be seeded: npm run seed:roles
 *   - It's recommended to have bookings with successful payments
 *     (run: npm run seed:batches-bookings first)
 */

import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { BookingModel, BookingStatus, PaymentStatus, BookingPayoutStatus } from '../src/models/booking.model';
import { TransactionModel, TransactionType, TransactionStatus, TransactionSource } from '../src/models/transaction.model';
import { PayoutModel, PayoutStatus } from '../src/models/payout.model';
import { AcademyPayoutAccountModel, PayoutAccountActivationStatus, BusinessType, PayoutAccountBankDetailsStatus } from '../src/models/academyPayoutAccount.model';
import { UserModel } from '../src/models/user.model';
import { ParticipantModel } from '../src/models/participant.model';
import { DefaultRoles } from '../src/enums/defaultRoles.enum';
import { Gender } from '../src/enums/gender.enum';
import { logger } from '../src/utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const DEFAULT_PAYOUT_COUNT = 20;
const COMMISSION_RATE = 0.10; // 10% commission

// Get command line arguments
const args = process.argv.slice(2);

const parseArg = (key: string): string | undefined => {
  const equalFormat = args.find(arg => arg.startsWith(`--${key}=`));
  if (equalFormat) {
    return equalFormat.split('=').slice(1).join('=');
  }
  const index = args.indexOf(`--${key}`);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return undefined;
};

const payoutCount = parseInt(parseArg('count') || process.env.PAYOUT_COUNT || String(DEFAULT_PAYOUT_COUNT));

/**
 * Get or create academy user with payout account
 */
const getOrCreateAcademyUserWithAccount = async () => {
  const RoleModel = (await import('../src/models/role.model')).RoleModel;
  const academyRole = await RoleModel.findOne({ name: DefaultRoles.ACADEMY });
  
  if (!academyRole) {
    throw new Error('ACADEMY role not found. Please seed roles first: npm run seed:roles');
  }

  // Find existing academy user
  const academyUser = await UserModel.findOne({ 
    roles: academyRole._id 
  }).lean();

  if (academyUser) {
    // Check if payout account exists
    const payoutAccount = await AcademyPayoutAccountModel.findOne({ 
      user: academyUser._id 
    }).lean();

    if (payoutAccount) {
      return { academyUser, payoutAccount };
    }

    // Create payout account for existing user
    const newPayoutAccount = await AcademyPayoutAccountModel.create({
      id: uuidv4(),
      user: academyUser._id,
      razorpay_account_id: `acc_${uuidv4().substring(0, 14)}`,
      kyc_details: {
        legal_business_name: academyUser.firstName + (academyUser.lastName ? ` ${academyUser.lastName}` : ''),
        business_type: BusinessType.INDIVIDUAL,
        contact_name: academyUser.firstName + (academyUser.lastName ? ` ${academyUser.lastName}` : ''),
        email: academyUser.email,
        phone: academyUser.mobile || '9876543210',
        pan: 'ABCDE1234F',
        address: {
          street1: '123 Main Street',
          street2: 'Near Park',
          city: 'Mumbai',
          state: 'Maharashtra',
          postal_code: '400001',
          country: 'IN'
        }
      },
      bank_information: {
        account_number: '1234567890123456',
        ifsc_code: 'SBIN0001234',
        account_holder_name: academyUser.firstName + (academyUser.lastName ? ` ${academyUser.lastName}` : ''),
        bank_name: 'State Bank of India'
      },
      activation_status: PayoutAccountActivationStatus.ACTIVATED,
      ready_for_payout: 'ready',
      bank_details_status: PayoutAccountBankDetailsStatus.VERIFIED,
      is_active: true
    });

    return { academyUser, payoutAccount: newPayoutAccount };
  }

  // Create new academy user if none exists
  const newAcademyUser = await UserModel.create({
    id: uuidv4(),
    firstName: 'Academy',
    lastName: 'Owner',
    email: `academy${Date.now()}@example.com`,
    mobile: '9876543210',
    password: '$2b$10$dummyhashedpassword', // Dummy hash
    isActive: true,
    roles: [academyRole._id],
    isDeleted: false
  });

  const newPayoutAccount = await AcademyPayoutAccountModel.create({
    id: uuidv4(),
    user: newAcademyUser._id,
    razorpay_account_id: `acc_${uuidv4().substring(0, 14)}`,
    kyc_details: {
      legal_business_name: 'Academy Owner',
      business_type: BusinessType.INDIVIDUAL,
      contact_name: 'Academy Owner',
      email: newAcademyUser.email,
      phone: '9876543210',
      pan: 'ABCDE1234F',
      address: {
        street1: '123 Main Street',
        street2: 'Near Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        postal_code: '400001',
        country: 'IN'
      }
    },
    bank_information: {
      account_number: '1234567890123456',
      ifsc_code: 'SBIN0001234',
      account_holder_name: 'Academy Owner',
      bank_name: 'State Bank of India'
    },
    activation_status: PayoutAccountActivationStatus.ACTIVATED,
    ready_for_payout: 'ready',
    bank_details_status: PayoutAccountBankDetailsStatus.VERIFIED,
    is_active: true
  });

  return { academyUser: newAcademyUser, payoutAccount: newPayoutAccount };
};

/**
 * Get existing bookings with successful payment
 */
const getBookingsWithPayment = async (limit: number) => {
  const bookings = await BookingModel.find({
    'payment.status': PaymentStatus.SUCCESS,
    status: BookingStatus.CONFIRMED
  })
    .populate('user', '_id')
    .limit(limit)
    .lean();

  return bookings;
};

/**
 * Generate participant data
 */
const generateParticipantData = (userId: any, index: number) => {
  const firstNames = ['Rahul', 'Priya', 'Arjun', 'Ananya', 'Vikram', 'Sneha', 'Karan', 'Meera', 'Rohan', 'Kavya'];
  const lastNames = ['Sharma', 'Patel', 'Kumar', 'Singh', 'Reddy', 'Gupta', 'Verma', 'Jain', 'Malhotra', 'Agarwal'];
  
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
    schoolName: null,
    contactNumber: null,
    profilePhoto: null,
    address: null,
    isSelf: null,
    is_active: true,
    is_deleted: false
  };
};

/**
 * Create dummy bookings if needed
 */
const createDummyBookings = async (academyUser: any, count: number) => {
  const BatchModel = (await import('../src/models/batch.model')).BatchModel;
  const CoachingCenterModel = (await import('../src/models/coachingCenter.model')).CoachingCenterModel;
  const SportModel = (await import('../src/models/sport.model')).SportModel;
  const RoleModel = (await import('../src/models/role.model')).RoleModel;

  // Find or create necessary data
  const batch = await BatchModel.findOne().lean();
  const center = await CoachingCenterModel.findOne().lean();
  const sport = await SportModel.findOne().lean();
  
  // Find a regular user (not academy)
  const userRole = await RoleModel.findOne({ name: DefaultRoles.USER });
  const user = userRole 
    ? await UserModel.findOne({ roles: userRole._id, _id: { $ne: academyUser._id } }).lean()
    : null;

  if (!batch || !center || !sport || !user) {
    console.log('⚠️  Warning: Some required data (batch, center, sport, user) not found.');
    console.log('   Please ensure you have seeded batches, centers, sports, and users first.');
    console.log('   Run: npm run seed:batches-bookings');
    return [];
  }

  const bookings = [];
  for (let i = 0; i < count; i++) {
    // Create a participant for this booking
    const participantData = generateParticipantData(user._id, i);
    const participant = await ParticipantModel.create(participantData);

    const amount = Math.floor(Math.random() * 5000) + 2000; // Random amount between 2000-7000
    const batchAmount = Math.floor(amount * 0.9); // 90% of total
    const commissionAmount = Math.floor(batchAmount * COMMISSION_RATE);
    const payoutAmount = batchAmount - commissionAmount;

    const booking = await BookingModel.create({
      id: uuidv4(),
      booking_id: `BK-${Date.now()}-${i}`,
      user: user._id,
      participants: [participant._id], // At least one participant required
      batch: batch._id,
      center: center._id,
      sport: sport._id,
      amount: amount,
      currency: 'INR',
      status: BookingStatus.CONFIRMED,
      payment: {
        razorpay_order_id: `order_${uuidv4().substring(0, 14)}`,
        razorpay_payment_id: `pay_${uuidv4().substring(0, 14)}`,
        amount: amount,
        currency: 'INR',
        status: PaymentStatus.SUCCESS,
        payment_method: ['card', 'upi', 'netbanking'][Math.floor(Math.random() * 3)],
        paid_at: new Date()
      },
      commission: {
        rate: COMMISSION_RATE,
        amount: commissionAmount,
        payoutAmount: payoutAmount,
        calculatedAt: new Date()
      },
      priceBreakdown: {
        admission_fee_per_participant: 500,
        total_admission_fee: 500,
        base_fee_per_participant: Math.floor(batchAmount / 2),
        total_base_fee: Math.floor(batchAmount / 2),
        batch_amount: batchAmount,
        platform_fee: Math.floor(amount * 0.05),
        subtotal: Math.floor(amount * 0.95),
        gst_percentage: 18,
        gst_amount: Math.floor(amount * 0.05),
        total_amount: amount,
        participant_count: 1,
        currency: 'INR',
        calculated_at: new Date()
      },
      payout_status: BookingPayoutStatus.NOT_INITIATED,
      notes: `Dummy booking ${i + 1} for payout seeding`,
      is_active: true,
      is_deleted: false
    });

    bookings.push(booking);
  }

  return bookings;
};

/**
 * Create transaction for booking
 */
const createTransaction = async (booking: any, user: any) => {
  const transaction = await TransactionModel.create({
    id: uuidv4(),
    booking: booking._id,
    user: user._id,
    razorpay_order_id: booking.payment.razorpay_order_id || `order_${uuidv4().substring(0, 14)}`,
    razorpay_payment_id: booking.payment.razorpay_payment_id || `pay_${uuidv4().substring(0, 14)}`,
    type: TransactionType.PAYMENT,
    status: TransactionStatus.SUCCESS,
    source: TransactionSource.USER_VERIFICATION,
    amount: booking.amount,
    currency: booking.currency,
    payment_method: booking.payment.payment_method || 'card',
    processed_at: new Date()
  });

  return transaction;
};

/**
 * Create payout for booking
 */
const createPayout = async (
  booking: any,
  transaction: any,
  academyUser: any,
  payoutAccount: any,
  status: PayoutStatus = PayoutStatus.PENDING
) => {
  const batchAmount = booking.commission?.payoutAmount 
    ? booking.amount - booking.commission.amount 
    : Math.floor(booking.amount * 0.9);
  const commissionRate = booking.commission?.rate || COMMISSION_RATE;
  const commissionAmount = booking.commission?.amount || Math.floor(batchAmount * commissionRate);
  const payoutAmount = booking.commission?.payoutAmount || (batchAmount - commissionAmount);

  const payoutData: any = {
    id: uuidv4(),
    booking: booking._id,
    transaction: transaction._id,
    academy_payout_account: payoutAccount._id,
    academy_user: academyUser._id,
    amount: booking.amount,
    batch_amount: batchAmount,
    commission_rate: commissionRate,
    commission_amount: commissionAmount,
    payout_amount: payoutAmount,
    currency: booking.currency,
    status: status,
    razorpay_account_id: payoutAccount.razorpay_account_id
  };

  // Add status-specific fields
  if (status === PayoutStatus.COMPLETED) {
    payoutData.razorpay_transfer_id = `trf_${uuidv4().substring(0, 14)}`;
    payoutData.processed_at = new Date();
  } else if (status === PayoutStatus.PROCESSING) {
    payoutData.razorpay_transfer_id = `trf_${uuidv4().substring(0, 14)}`;
  } else if (status === PayoutStatus.FAILED) {
    payoutData.failure_reason = 'Dummy failure reason for testing';
  }

  const payout = await PayoutModel.create(payoutData);

  // Update booking payout status
  await BookingModel.findByIdAndUpdate(booking._id, {
    payout_status: status === PayoutStatus.PENDING 
      ? BookingPayoutStatus.PENDING
      : status === PayoutStatus.PROCESSING
      ? BookingPayoutStatus.PROCESSING
      : status === PayoutStatus.COMPLETED
      ? BookingPayoutStatus.COMPLETED
      : status === PayoutStatus.FAILED
      ? BookingPayoutStatus.FAILED
      : BookingPayoutStatus.NOT_INITIATED
  });

  return payout;
};

/**
 * Main seeding function
 */
const seedPayouts = async () => {
  try {
    console.log('\n🚀 Starting Payout Seeding...\n');
    console.log(`📋 Configuration:`);
    console.log(`   Payout count: ${payoutCount}`);
    console.log(`   Commission rate: ${COMMISSION_RATE * 100}%\n`);

    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Get or create academy user with payout account
    console.log('📝 Getting or creating academy user with payout account...');
    const { academyUser, payoutAccount } = await getOrCreateAcademyUserWithAccount();
    console.log(`✅ Academy User: ${academyUser.firstName} ${academyUser.lastName || ''} (${academyUser.email})\n`);

    // Get existing bookings with successful payment (that don't have payouts)
    console.log('📝 Finding bookings with successful payments (without payouts)...');
    const allBookings = await getBookingsWithPayment(payoutCount * 2); // Get more to filter
    
    // Filter out bookings that already have payouts
    const bookingsWithoutPayouts = [];
    for (const booking of allBookings) {
      const existingPayout = await PayoutModel.findOne({ booking: booking._id }).lean();
      if (!existingPayout) {
        bookingsWithoutPayouts.push(booking);
        if (bookingsWithoutPayouts.length >= payoutCount) break;
      }
    }
    
    let bookings = bookingsWithoutPayouts;
    console.log(`✅ Found ${bookings.length} existing bookings without payouts\n`);

    // Create dummy bookings if needed
    if (bookings.length < payoutCount) {
      const needed = payoutCount - bookings.length;
      console.log(`📝 Creating ${needed} dummy bookings...`);
      const newBookings = await createDummyBookings(academyUser, needed);
      bookings = [...bookings, ...newBookings];
      console.log(`✅ Created ${newBookings.length} new bookings\n`);
    }

    // Limit to requested count
    bookings = bookings.slice(0, payoutCount);

    // Check for existing payouts
    const existingPayouts = await PayoutModel.countDocuments();
    console.log(`📊 Current payouts count: ${existingPayouts}\n`);

    let created = 0;
    let skipped = 0;
    const statuses = [
      PayoutStatus.PENDING,
      PayoutStatus.PROCESSING,
      PayoutStatus.COMPLETED,
      PayoutStatus.FAILED
    ];

    console.log('📝 Creating payouts...\n');

    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];
      
      try {
        // Check if payout already exists for this booking
        const existingPayout = await PayoutModel.findOne({ booking: booking._id }).lean();
        if (existingPayout) {
          console.log(`⏭️  Skipping booking ${booking.booking_id || booking.id} - payout already exists`);
          skipped++;
          continue;
        }

        // Get user for transaction
        const user = await UserModel.findById(booking.user).lean();
        if (!user) {
          console.log(`⚠️  Warning: User not found for booking ${booking.booking_id || booking.id}, skipping...`);
          skipped++;
          continue;
        }

        // Create transaction
        const transaction = await createTransaction(booking, user);

        // Create payout with random status
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const payout = await createPayout(
          booking,
          transaction,
          academyUser,
          payoutAccount,
          status
        );

        created++;
        console.log(`✅ Created payout ${i + 1}/${bookings.length} - Status: ${status}, Amount: ${payout.payout_amount} ${payout.currency}`);
      } catch (error: any) {
        console.error(`❌ Error creating payout for booking ${booking.booking_id || booking.id}:`, error.message);
        skipped++;
      }
    }

    // Get status breakdown
    const statusBreakdown = await PayoutModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total_amount: { $sum: '$payout_amount' }
        }
      }
    ]);

    console.log('\n📊 Seeding Summary:');
    console.log(`   ✅ Created: ${created} payouts`);
    console.log(`   ⏭️  Skipped: ${skipped} payouts`);
    console.log(`   📈 Total payouts in database: ${await PayoutModel.countDocuments()}\n`);

    if (statusBreakdown.length > 0) {
      console.log('📊 Status Breakdown:');
      statusBreakdown.forEach((stat: any) => {
        console.log(`   ${stat._id}: ${stat.count} payouts (Total: ${stat.total_amount} INR)`);
      });
      console.log('');
    }

    console.log('✅ Payout seeding completed successfully!\n');
  } catch (error: any) {
    logger.error('Error seeding payouts:', error);
    console.error('\n❌ Error seeding payouts:', error.message);
    process.exit(1);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
};

// Run the seeder
if (require.main === module) {
  seedPayouts().catch((error) => {
    logger.error('Fatal error in payout seeder:', error);
    process.exit(1);
  });
}

export default seedPayouts;
