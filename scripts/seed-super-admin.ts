import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { AdminUserModel } from '../src/models/adminUser.model';
import { RoleModel } from '../src/models/role.model';
import { DefaultRoles } from '../src/enums/defaultRoles.enum';
import { logger } from '../src/utils/logger';
import { hashPassword } from '../src/utils/password';
import { v4 as uuidv4 } from 'uuid';

const SUPER_ADMIN_EMAIL = 'admin@playasport.in';
const SUPER_ADMIN_PASSWORD = 'Admin@123';

const seedSuperAdmin = async () => {
  try {
    console.log('\n🚀 Starting Super Admin Seeding...\n');

    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Check if Super Admin role exists
    const superAdminRole = await RoleModel.findOne({ name: DefaultRoles.SUPER_ADMIN });
    if (!superAdminRole) {
      console.error('❌ Super Admin role not found. Please run "npm run seed:roles" first.');
      await disconnectDatabase();
      process.exit(1);
    }
    console.log(`✅ Super Admin role found: ${superAdminRole._id}\n`);

    // Check if user already exists
    const existingUser = await AdminUserModel.findOne({ email: SUPER_ADMIN_EMAIL });
    if (existingUser) {
      console.log(`⚠️  Admin user with email ${SUPER_ADMIN_EMAIL} already exists.`);
      console.log(`   User ID: ${existingUser.id}`);
      console.log(`   Checking if user has Super Admin role...\n`);

      // Check if user has Super Admin role
      const userWithRoles = await AdminUserModel.findOne({ email: SUPER_ADMIN_EMAIL })
        .populate('roles', 'name')
        .lean();

      const userRoles = userWithRoles?.roles as any[];
      const hasSuperAdminRole = userRoles?.some((r: any) => r?.name === DefaultRoles.SUPER_ADMIN);

      if (hasSuperAdminRole) {
        console.log('✅ User already has Super Admin role.');
        console.log('   Skipping creation. If you want to update password, delete the user first.\n');
      } else {
        console.log('⚠️  User exists but does not have Super Admin role.');
        console.log('   Adding Super Admin role to existing user...\n');

        // Add Super Admin role to existing user
        await AdminUserModel.updateOne(
          { email: SUPER_ADMIN_EMAIL },
          {
            $addToSet: { roles: superAdminRole._id },
            $set: { isActive: true, isDeleted: false },
          }
        );

        // Update password
        const hashedPassword = await hashPassword(SUPER_ADMIN_PASSWORD);
        await AdminUserModel.updateOne(
          { email: SUPER_ADMIN_EMAIL },
          { $set: { password: hashedPassword } }
        );

        console.log('✅ Super Admin role added and password updated.\n');
      }

      await disconnectDatabase();
      process.exit(0);
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await hashPassword(SUPER_ADMIN_PASSWORD);
    console.log('✅ Password hashed\n');

    // Create Super Admin user
    console.log('👤 Creating Super Admin user...');
    const superAdminUser = new AdminUserModel({
      id: uuidv4(),
      firstName: 'Super',
      lastName: 'Admin',
      email: SUPER_ADMIN_EMAIL,
      password: hashedPassword,
      roles: [superAdminRole._id],
      isActive: true,
      isDeleted: false,
    });

    await superAdminUser.save();
    console.log(`✅ Super Admin user created successfully!`);
    console.log(`   User ID: ${superAdminUser.id}`);
    console.log(`   Email: ${superAdminUser.email}`);
    console.log(`   Password: ${SUPER_ADMIN_PASSWORD}`);
    console.log(`   Role: ${DefaultRoles.SUPER_ADMIN}\n`);

    // Display results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Seeding Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('  ✅ Super Admin user created successfully');
    console.log(`  📧 Email: ${SUPER_ADMIN_EMAIL}`);
    console.log(`  🔑 Password: ${SUPER_ADMIN_PASSWORD}`);
    console.log('\n  ⚠️  IMPORTANT: Change the password after first login!');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✅ SUCCESS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Disconnect and exit
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Fatal error during Super Admin seeding:', error);
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error);
    await disconnectDatabase();
    process.exit(1);
  }
};

// Run seeder
seedSuperAdmin();
