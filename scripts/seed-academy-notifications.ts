import { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { NotificationModel } from '../src/models/notification.model';
import { CoachingCenterModel } from '../src/models/coachingCenter.model';
import { UserModel } from '../src/models/user.model';
import { NotificationChannel, NotificationPriority } from '../src/types/notification.types';
import { logger } from '../src/utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const ACADEMY_RECIPIENT_ID = 'ba3427a6-466b-4f72-ab2a-0d8469fa46a0'; // Academy recipientId (can be CoachingCenter custom ID, ObjectId, or User ObjectId)
const DEFAULT_NOTIFICATION_COUNT = 10;

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

const recipientIdArg = parseArg('recipientId') || process.env.RECIPIENT_ID || ACADEMY_RECIPIENT_ID;
const countArg = parseArg('count') || process.env.NOTIFICATION_COUNT;

const notificationCount = countArg ? parseInt(countArg, 10) : DEFAULT_NOTIFICATION_COUNT;

// Helper function to get user ObjectId from academy recipientId
const getAcademyOwnerUserId = async (recipientId: string): Promise<Types.ObjectId | null> => {
  try {
    // First, try to find CoachingCenter by custom ID (UUID)
    let center = await CoachingCenterModel.findOne({ 
      id: recipientId, 
      is_deleted: false 
    }).select('_id user').lean();

    // If not found, try CoachingCenter by ObjectId
    if (!center && Types.ObjectId.isValid(recipientId) && recipientId.length === 24) {
      center = await CoachingCenterModel.findOne({ 
        _id: new Types.ObjectId(recipientId), 
        is_deleted: false 
      }).select('_id user').lean();
    }

    if (center) {
      return center.user as Types.ObjectId;
    }

    // If not found as CoachingCenter, try to find User by custom ID (UUID)
    let user = await UserModel.findOne({ 
      id: recipientId, 
      isDeleted: false 
    }).select('_id').lean();

    // If not found, try User by ObjectId
    if (!user && Types.ObjectId.isValid(recipientId) && recipientId.length === 24) {
      user = await UserModel.findById(recipientId).select('_id').lean();
    }

    if (user) {
      // Verify that this user owns at least one academy
      const userAcademies = await CoachingCenterModel.find({
        user: user._id,
        is_deleted: false
      }).select('_id').lean();

      if (userAcademies.length === 0) {
        console.log(`⚠️  User found but does not own any academies.`);
        return null;
      }

      return user._id as Types.ObjectId;
    }

    return null;
  } catch (error) {
    logger.error('Failed to get academy owner user ID:', error);
    return null;
  }
};

// Dummy notification templates
const notificationTemplates = [
  {
    title: 'New Booking Received',
    body: 'You have received a new booking for your academy. Please review and confirm.',
    priority: 'high' as NotificationPriority,
    channels: ['push', 'email'] as NotificationChannel[],
    data: { type: 'booking', action: 'review' },
  },
  {
    title: 'Payment Received',
    body: 'A payment of ₹2,500 has been received for booking #BK123456.',
    priority: 'high' as NotificationPriority,
    channels: ['push', 'email'] as NotificationChannel[],
    data: { type: 'payment', amount: 2500 },
  },
  {
    title: 'Batch Starting Soon',
    body: 'Your batch "Morning Cricket Training" is starting in 2 days. Make sure everything is ready.',
    priority: 'medium' as NotificationPriority,
    channels: ['push'] as NotificationChannel[],
    data: { type: 'batch', action: 'reminder' },
  },
  {
    title: 'Student Enrolled',
    body: 'A new student has enrolled in your academy. Welcome them!',
    priority: 'medium' as NotificationPriority,
    channels: ['push'] as NotificationChannel[],
    data: { type: 'enrollment' },
  },
  {
    title: 'Review Submitted',
    body: 'You have received a new 5-star review from a student. Great job!',
    priority: 'low' as NotificationPriority,
    channels: ['push'] as NotificationChannel[],
    data: { type: 'review', rating: 5 },
  },
  {
    title: 'Profile Update Required',
    body: 'Please update your academy profile information to keep it current.',
    priority: 'low' as NotificationPriority,
    channels: ['push', 'email'] as NotificationChannel[],
    data: { type: 'profile', action: 'update' },
  },
  {
    title: 'Monthly Report Available',
    body: 'Your monthly academy performance report is now available. Check it out!',
    priority: 'medium' as NotificationPriority,
    channels: ['push', 'email'] as NotificationChannel[],
    data: { type: 'report', period: 'monthly' },
  },
  {
    title: 'Booking Cancelled',
    body: 'A booking has been cancelled. The refund will be processed within 5-7 business days.',
    priority: 'high' as NotificationPriority,
    channels: ['push', 'email'] as NotificationChannel[],
    data: { type: 'booking', action: 'cancelled' },
  },
  {
    title: 'New Message Received',
    body: 'You have received a new message from a student. Please respond.',
    priority: 'medium' as NotificationPriority,
    channels: ['push'] as NotificationChannel[],
    data: { type: 'message' },
  },
  {
    title: 'Academy Verified',
    body: 'Congratulations! Your academy has been verified and is now live on the platform.',
    priority: 'high' as NotificationPriority,
    channels: ['push', 'email'] as NotificationChannel[],
    data: { type: 'verification', status: 'approved' },
  },
];

// Helper function to generate random date within last 30 days
const getRandomDate = (daysAgo: number = 30): Date => {
  const now = new Date();
  const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
};

const seedAcademyNotifications = async () => {
  try {
    console.log('\n🚀 Starting Academy Notifications Seeding...\n');

    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Get academy owner user ObjectId
    console.log(`🔍 Finding academy owner for recipientId: ${recipientIdArg}...`);
    const userObjectId = await getAcademyOwnerUserId(recipientIdArg);

    if (!userObjectId) {
      console.error(`❌ Could not find academy or user with ID: ${recipientIdArg}`);
      console.error('   Please verify the recipientId is correct.\n');
      
      // Try to find if it exists but is deleted
      const deletedCenter = await CoachingCenterModel.findOne({ id: recipientIdArg }).select('_id is_deleted').lean();
      if (deletedCenter) {
        console.error(`   ⚠️  Found CoachingCenter but it is ${deletedCenter.is_deleted ? 'deleted' : 'active'}`);
      }
      
      const deletedUser = await UserModel.findOne({ id: recipientIdArg }).select('_id isDeleted').lean();
      if (deletedUser) {
        console.error(`   ⚠️  Found User but it is ${deletedUser.isDeleted ? 'deleted' : 'active'}`);
      }
      
      if (!deletedCenter && !deletedUser) {
        console.error('   ℹ️  No record found with this ID in CoachingCenter or User collections.');
      }
      
      await disconnectDatabase();
      process.exit(1);
    }

    console.log(`✅ Found academy owner user ObjectId: ${userObjectId}\n`);

    // Create notifications
    console.log(`📝 Creating ${notificationCount} dummy notifications...\n`);

    const notifications: any[] = [];
    const notificationStats = {
      read: 0,
      unread: 0,
      sent: 0,
      failed: 0,
    };

    for (let i = 0; i < notificationCount; i++) {
      const template = notificationTemplates[i % notificationTemplates.length];
      const randomDate = getRandomDate(30);
      const isRead = Math.random() > 0.5; // 50% chance of being read
      const sent = Math.random() > 0.2; // 80% chance of being sent

      if (isRead) notificationStats.read++;
      else notificationStats.unread++;
      if (sent) notificationStats.sent++;
      else notificationStats.failed++;

      const notification = {
        id: uuidv4(),
        recipientType: 'academy' as const,
        recipientId: userObjectId,
        recipientTypeRef: 'User' as const,
        title: template.title,
        body: template.body,
        channels: template.channels,
        priority: template.priority,
        data: template.data,
        imageUrl: null,
        isRead: isRead,
        readAt: isRead ? randomDate : null,
        sent: sent,
        sentAt: sent ? randomDate : null,
        error: sent ? null : 'Failed to send notification',
        metadata: {
          seeded: true,
          seedDate: new Date(),
        },
        createdAt: randomDate,
        updatedAt: randomDate,
      };

      notifications.push(notification);
    }

    // Insert notifications
    await NotificationModel.insertMany(notifications);
    console.log(`✅ Successfully created ${notificationCount} notifications\n`);

    // Display summary
    const readCount = notificationStats.read;
    const unreadCount = notificationStats.unread;
    const sentCount = notificationStats.sent;
    const failedCount = notificationStats.failed;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Seeding Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`  ✅ Total notifications created: ${notificationCount}`);
    console.log(`  📖 Read: ${readCount}`);
    console.log(`  📬 Unread: ${unreadCount}`);
    console.log(`  ✅ Sent: ${sentCount}`);
    console.log(`  ❌ Failed: ${failedCount}`);
    console.log(`  🎯 Recipient ID: ${recipientIdArg}`);
    console.log(`  👤 User ObjectId: ${userObjectId}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✅ SUCCESS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Disconnect and exit
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Fatal error during Academy Notifications seeding:', error);
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error);
    await disconnectDatabase();
    process.exit(1);
  }
};

// Run seeder
seedAcademyNotifications();
