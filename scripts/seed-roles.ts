import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { RoleModel } from '../src/models/role.model';
import { DefaultRoles } from '../src/enums/defaultRoles.enum';
import { logger } from '../src/utils/logger';

// Default roles to seed
const defaultRoles = [
  {
    name: DefaultRoles.SUPER_ADMIN,
    description: 'Super Administrator with full system access',
    visibleToRoles: null, // null means only SUPER_ADMIN and ADMIN can view this role
  },
  {
    name: DefaultRoles.ADMIN,
    description: 'Administrator with elevated permissions',
    visibleToRoles: null, // null means only SUPER_ADMIN and ADMIN can view this role
  },
  {
    name: DefaultRoles.USER,
    description: 'Regular user with standard permissions',
    visibleToRoles: [DefaultRoles.SUPER_ADMIN, DefaultRoles.ADMIN, DefaultRoles.ACADEMY], // Can be viewed by SUPER_ADMIN, ADMIN, and ACADEMY
  },
  {
    name: DefaultRoles.ACADEMY,
    description: 'Academy user with coaching center management permissions',
    visibleToRoles: [DefaultRoles.SUPER_ADMIN, DefaultRoles.ADMIN], // Can be viewed by SUPER_ADMIN, ADMIN, and ACADEMY
  },
  {
    name: DefaultRoles.EMPLOYEE,
    description: 'Employee with employee management permissions',
    visibleToRoles: [DefaultRoles.SUPER_ADMIN, DefaultRoles.ADMIN, DefaultRoles.ACADEMY], // Can be viewed by SUPER_ADMIN, ADMIN, and ACADEMY
  },
  {
    name: DefaultRoles.AGENT,
    description: 'Agent with agent-specific permissions',
    visibleToRoles: [DefaultRoles.SUPER_ADMIN, DefaultRoles.ADMIN], // Can be viewed by SUPER_ADMIN, ADMIN, and ACADEMY
  },
  {
    name: 'staff',
    description: 'Staff with staff management permissions',
    visibleToRoles: [DefaultRoles.SUPER_ADMIN, DefaultRoles.ADMIN, DefaultRoles.USER, DefaultRoles.ACADEMY], // Can be viewed by SUPER_ADMIN, ADMIN, USER, and ACADEMY
  },
  {
    name: 'coach',
    description: 'coach with coach management permissions',
    visibleToRoles: [DefaultRoles.SUPER_ADMIN, DefaultRoles.ADMIN, DefaultRoles.USER, DefaultRoles.ACADEMY], // Can be viewed by SUPER_ADMIN, ADMIN, USER, and ACADEMY
  },
];

const seedRoles = async () => {
  try {
    console.log('\n🚀 Starting Roles Seeding...\n');

    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Check existing roles
    const existingRoles = await RoleModel.find({});
    console.log(`📊 Current roles count: ${existingRoles.length}`);

    if (existingRoles.length > 0) {
      console.log('  Existing roles:');
      existingRoles.forEach((role) => {
        console.log(`     - ${role.name} (${role._id})`);
      });
      console.log('');
    }

    // Seed roles
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const roleData of defaultRoles) {
      try {
        // Check if role already exists
        const existingRole = await RoleModel.findOne({
          name: roleData.name,
        });

        if (existingRole) {
          console.log(`⏭️  Skipping ${roleData.name} (already exists)`);
          skipped++;
          continue;
        }

        // Create new role
        const role = new RoleModel(roleData);
        await role.save();
        console.log(`✅ Created role: ${roleData.name} (${role._id})`);
        created++;
      } catch (error) {
        const errorMessage = `Failed to create role ${roleData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`❌ ${errorMessage}`);
        errors.push(errorMessage);
        logger.error(errorMessage, error);
      }
    }

    // Display results
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Seeding Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`  ✅ Created: ${created} roles`);
    console.log(`  ⏭️  Skipped: ${skipped} roles (already exist)`);
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
    logger.error('Fatal error during roles seeding:', error);
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error);
    await disconnectDatabase();
    process.exit(1);
  }
};

// Run seeder
seedRoles();

