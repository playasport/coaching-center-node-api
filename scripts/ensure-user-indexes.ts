import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { UserModel } from '../src/models/user.model';
import { logger } from '../src/utils/logger';

const ensureUserIndexes = async () => {
  try {
    console.log('\n🚀 Ensuring User model indexes are created...\n');

    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Get the collection
    const collection = UserModel.collection;

    // List current indexes
    const indexesBefore = await collection.indexes();
    console.log('📊 Current indexes:');
    indexesBefore.forEach((index) => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    console.log('');

    // Ensure all indexes are created (Mongoose will create them if they don't exist)
    // Use syncIndexes() instead of createIndexes() to handle conflicts better
    console.log('🔄 Creating/updating indexes...');
    try {
      await UserModel.syncIndexes();
      console.log('✅ Indexes synced\n');
    } catch (error: any) {
      // If syncIndexes fails, try createIndexes with error handling
      if (error.code === 86 || error.codeName === 'IndexKeySpecsConflict') {
        console.log('⚠️  Some indexes already exist, continuing...\n');
        // Try to create indexes individually, ignoring conflicts
        try {
          await UserModel.createIndexes();
        } catch (createError: any) {
          if (createError.code !== 86) {
            throw createError;
          }
          console.log('ℹ️  Indexes already exist, skipping creation\n');
        }
      } else {
        throw error;
      }
    }

    // List indexes after
    const indexesAfter = await collection.indexes();
    console.log('📊 Indexes after ensure:');
    indexesAfter.forEach((index) => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    console.log('');

    // Verify critical indexes exist
    const indexNames = indexesAfter.map(idx => idx.name);
    const criticalIndexes = [
      'isDeleted_1',
      'isDeleted_1_roles_1_createdAt_-1',
      'isDeleted_1_userType_1_createdAt_-1',
      'isDeleted_1_isActive_1_createdAt_-1',
    ];

    console.log('🔍 Verifying critical indexes:');
    let allPresent = true;
    for (const criticalIndex of criticalIndexes) {
      const exists = indexNames.some(name => name.includes(criticalIndex.split('_')[0]));
      if (exists) {
        console.log(`   ✅ Index for ${criticalIndex.split('_')[0]} exists`);
      } else {
        console.log(`   ⚠️  Index for ${criticalIndex.split('_')[0]} might be missing`);
        allPresent = false;
      }
    }

    if (allPresent) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  ✅ SUCCESS - All indexes verified');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  ⚠️  WARNING - Some indexes might be missing');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    // Disconnect and exit
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Fatal error during index creation:', error);
    console.error('\n❌ Error:', error);
    await disconnectDatabase();
    process.exit(1);
  }
};

// Run the script
ensureUserIndexes();

