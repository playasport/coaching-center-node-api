import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { UserModel } from '../src/models/user.model';
import { RoleModel } from '../src/models/role.model';
import { ParticipantModel } from '../src/models/participant.model';
import { DefaultRoles } from '../src/enums/defaultRoles.enum';
import { logger } from '../src/utils/logger';
import { hashPassword } from '../src/utils/password';
import { v4 as uuidv4 } from 'uuid';

const DEMO_MOBILE = '9876543210';
const DEMO_EMAIL = 'demo9876543210@playasport.in';
const DEMO_PASSWORD = 'Demo@123';

const seedDemoUser = async () => {
  try {
    console.log('\n🚀 Starting Demo User Seeding...\n');

    await connectDatabase();
    console.log('✅ Database connected\n');

    const [userRole, academyRole] = await Promise.all([
      RoleModel.findOne({ name: DefaultRoles.USER }),
      RoleModel.findOne({ name: DefaultRoles.ACADEMY }),
    ]);

    if (!userRole || !academyRole) {
      console.error('❌ User or Academy role not found. Please run "npm run seed:roles" first.');
      await disconnectDatabase();
      process.exit(1);
    }
    console.log('✅ User and Academy roles found\n');

    const existingUser = await UserModel.findOne({ mobile: DEMO_MOBILE });
    if (existingUser) {
      console.log(`⚠️  Demo user with mobile ${DEMO_MOBILE} already exists.`);
      console.log(`   User ID: ${existingUser.id}`);
      const roleIds = (existingUser.roles as any[]) || [];
      const hasUser = roleIds.some((r) => r?.toString() === userRole._id.toString());
      const hasAcademy = roleIds.some((r) => r?.toString() === academyRole._id.toString());
      if (hasUser && hasAcademy) {
        console.log('   Has both USER and ACADEMY roles. No changes needed.\n');
      } else {
        console.log('   Ensuring both USER and ACADEMY roles...');
        await UserModel.updateOne(
          { mobile: DEMO_MOBILE },
          { $set: { roles: [userRole._id, academyRole._id], isActive: true, isDeleted: false } }
        );
        console.log('   ✅ Roles updated.\n');
      }
      await disconnectDatabase();
      process.exit(0);
      return;
    }

    const hashedPassword = await hashPassword(DEMO_PASSWORD);
    const demoUserId = uuidv4();

    const demoUser = new UserModel({
      id: demoUserId,
      firstName: 'Demo',
      lastName: 'User',
      email: DEMO_EMAIL,
      mobile: DEMO_MOBILE,
      password: hashedPassword,
      roles: [userRole._id, academyRole._id],
      registrationMethod: 'mobile',
      isActive: true,
      isDeleted: false,
    });

    await demoUser.save();
    console.log('✅ Demo user created successfully!');

    try {
      await ParticipantModel.create({
        userId: demoUser._id,
        firstName: 'Demo',
        lastName: 'User',
        contactNumber: DEMO_MOBILE,
        isSelf: '1',
        is_active: true,
        is_deleted: false,
      });
      console.log('✅ Participant record created.');
    } catch (participantError) {
      logger.warn('Participant creation skipped (may already exist):', participantError);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Demo Authentication');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`  📱 Mobile: ${DEMO_MOBILE}`);
    console.log(`  🔑 OTP: 123456`);
    console.log(`  📧 Email: ${DEMO_EMAIL}`);
    console.log(`  🔐 Password: ${DEMO_PASSWORD}`);
    console.log('\n  Use send-otp + verify-otp for both Academy and User auth.');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✅ SUCCESS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Fatal error during demo user seeding:', error);
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error);
    await disconnectDatabase();
    process.exit(1);
  }
};

seedDemoUser();
