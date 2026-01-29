import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { PermissionModel } from '../src/models/permission.model';
import { RoleModel } from '../src/models/role.model';
import { DefaultRoles } from '../src/enums/defaultRoles.enum';
import { Section } from '../src/enums/section.enum';
import { Action } from '../src/enums/section.enum';
import { logger } from '../src/utils/logger';

// All available sections
const allSections = Object.values(Section);
// All available actions
const allActions = Object.values(Action);

/**
 * Create permissions for a role
 */
const createPermissionsForRole = async (
  roleName: string,
  permissions: Array<{ section: Section; actions: Action[] }>
): Promise<number> => {
  const role = await RoleModel.findOne({ name: roleName });
  if (!role) {
    logger.warn(`Role ${roleName} not found, skipping permissions`);
    return 0;
  }

  let created = 0;
  for (const perm of permissions) {
    try {
      // Check if permission already exists
      const existing = await PermissionModel.findOne({
        role: role._id,
        section: perm.section,
      });

      if (existing) {
        // Update existing permission
        existing.actions = perm.actions;
        existing.isActive = true;
        await existing.save();
        logger.info(`Updated permission: ${roleName} - ${perm.section}`);
      } else {
        // Create new permission
        const permission = new PermissionModel({
          role: role._id,
          section: perm.section,
          actions: perm.actions,
          isActive: true,
        });
        await permission.save();
        logger.info(`Created permission: ${roleName} - ${perm.section}`);
        created++;
      }
    } catch (error) {
      logger.error(`Failed to create/update permission ${roleName} - ${perm.section}:`, error);
    }
  }

  return created;
};

const seedPermissions = async () => {
  try {
    console.log('\n🚀 Starting Permissions Seeding...\n');

    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Check existing permissions
    const existingPermissions = await PermissionModel.countDocuments({});
    console.log(`📊 Current permissions count: ${existingPermissions}\n`);

    let totalCreated = 0;
    const errors: string[] = [];

    // Super Admin - All permissions for all sections
    console.log('📝 Seeding Super Admin permissions...');
    try {
      const superAdminPerms = allSections.map((section) => ({
        section,
        actions: allActions,
      }));
      const created = await createPermissionsForRole(DefaultRoles.SUPER_ADMIN, superAdminPerms);
      totalCreated += created;
      console.log(`✅ Super Admin: ${created} new permissions created\n`);
    } catch (error) {
      const errorMessage = `Failed to seed Super Admin permissions: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMessage}`);
      errors.push(errorMessage);
    }

    // Admin - Most permissions except permission management
    console.log('📝 Seeding Admin permissions...');
    try {
      const adminSections = allSections.filter((s) => s !== Section.PERMISSION);
      const adminPerms = adminSections.map((section) => ({
        section,
        actions: allActions,
      }));
      const created = await createPermissionsForRole(DefaultRoles.ADMIN, adminPerms);
      totalCreated += created;
      console.log(`✅ Admin: ${created} new permissions created\n`);
    } catch (error) {
      const errorMessage = `Failed to seed Admin permissions: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMessage}`);
      errors.push(errorMessage);
    }

    // Employee - Limited permissions (view, create, update on assigned sections)
    console.log('📝 Seeding Employee permissions...');
    try {
      const employeeSections = [
        Section.COACHING_CENTER,
        Section.EMPLOYEE,
        Section.BATCH,
        Section.BOOKING,
        Section.STUDENT,
      ];
      const employeePerms = employeeSections.map((section) => ({
        section,
        actions: [Action.VIEW, Action.CREATE, Action.UPDATE], // No delete
      }));
      const created = await createPermissionsForRole(DefaultRoles.EMPLOYEE, employeePerms);
      totalCreated += created;
      console.log(`✅ Employee: ${created} new permissions created\n`);
    } catch (error) {
      const errorMessage = `Failed to seed Employee permissions: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMessage}`);
      errors.push(errorMessage);
    }

    // Agent - View-only on most sections, limited create/update
    console.log('📝 Seeding Agent permissions...');
    try {
      const agentViewSections = [
        Section.COACHING_CENTER,
        Section.EMPLOYEE,
        Section.BATCH,
        Section.BOOKING,
        Section.STUDENT,
        Section.USER,
      ];
      const agentPerms = [
        // View-only for most sections
        ...agentViewSections.map((section) => ({
          section,
          actions: [Action.VIEW],
        })),
        // Limited create/update for bookings
        {
          section: Section.BOOKING,
          actions: [Action.VIEW, Action.CREATE, Action.UPDATE],
        },
      ];
      const created = await createPermissionsForRole(DefaultRoles.AGENT, agentPerms);
      totalCreated += created;
      console.log(`✅ Agent: ${created} new permissions created\n`);
    } catch (error) {
      const errorMessage = `Failed to seed Agent permissions: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMessage}`);
      errors.push(errorMessage);
    }

    // Display results
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Seeding Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`  ✅ Created/Updated: ${totalCreated} permissions`);
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
    logger.error('Fatal error during permissions seeding:', error);
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error);
    await disconnectDatabase();
    process.exit(1);
  }
};

// Run seeder
seedPermissions();
