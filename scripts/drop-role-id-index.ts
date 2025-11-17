import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { RoleModel } from '../src/models/role.model';
import { logger } from '../src/utils/logger';

const dropRoleIdIndex = async () => {
  try {
    console.log('\n🚀 Dropping old id_1 index from roles collection...\n');

    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Get the collection
    const collection = RoleModel.collection;

    // List all indexes
    const indexes = await collection.indexes();
    console.log('📊 Current indexes:');
    indexes.forEach((index) => {
      console.log(`   - ${JSON.stringify(index)}`);
    });
    console.log('');

    // Try to drop the id_1 index if it exists
    try {
      await collection.dropIndex('id_1');
      console.log('✅ Successfully dropped id_1 index\n');
    } catch (error: any) {
      if (error.code === 27 || error.codeName === 'IndexNotFound') {
        console.log('ℹ️  id_1 index does not exist (already dropped or never created)\n');
      } else {
        throw error;
      }
    }

    // List indexes again to confirm
    const indexesAfter = await collection.indexes();
    console.log('📊 Indexes after drop:');
    indexesAfter.forEach((index) => {
      console.log(`   - ${JSON.stringify(index)}`);
    });
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✅ SUCCESS - Index dropped');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Disconnect and exit
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Fatal error during index drop:', error);
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error);
    await disconnectDatabase();
    process.exit(1);
  }
};

// Run script
dropRoleIdIndex();

