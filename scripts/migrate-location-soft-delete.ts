import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { CountryModel, StateModel, CityModel } from '../src/models/location.model';
import { logger } from '../src/utils/logger';

const migrateLocationSoftDelete = async () => {
  try {
    console.log('\n🚀 Starting Location Soft Delete Migration...\n');

    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Migrate countries - add isDeleted: false to records that don't have it
    const countriesResult = await CountryModel.updateMany(
      { isDeleted: { $exists: false } },
      { $set: { isDeleted: false, deletedAt: null } }
    );
    console.log(`✅ Countries migrated: ${countriesResult.modifiedCount} records updated\n`);

    // Migrate states - add isDeleted: false to records that don't have it
    const statesResult = await StateModel.updateMany(
      { isDeleted: { $exists: false } },
      { $set: { isDeleted: false, deletedAt: null } }
    );
    console.log(`✅ States migrated: ${statesResult.modifiedCount} records updated\n`);

    // Migrate cities - add isDeleted: false to records that don't have it
    const citiesResult = await CityModel.updateMany(
      { isDeleted: { $exists: false } },
      { $set: { isDeleted: false, deletedAt: null } }
    );
    console.log(`✅ Cities migrated: ${citiesResult.modifiedCount} records updated\n`);

    // Verify migration
    const countriesWithoutField = await CountryModel.countDocuments({ isDeleted: { $exists: false } });
    const statesWithoutField = await StateModel.countDocuments({ isDeleted: { $exists: false } });
    const citiesWithoutField = await CityModel.countDocuments({ isDeleted: { $exists: false } });

    const countriesWithField = await CountryModel.countDocuments({ isDeleted: { $exists: true } });
    const statesWithField = await StateModel.countDocuments({ isDeleted: { $exists: true } });
    const citiesWithField = await CityModel.countDocuments({ isDeleted: { $exists: true } });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Migration Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`📍 Countries:`);
    console.log(`   With isDeleted field: ${countriesWithField}`);
    console.log(`   Without isDeleted field: ${countriesWithoutField}\n`);

    console.log(`📍 States:`);
    console.log(`   With isDeleted field: ${statesWithField}`);
    console.log(`   Without isDeleted field: ${statesWithoutField}\n`);

    console.log(`📍 Cities:`);
    console.log(`   With isDeleted field: ${citiesWithField}`);
    console.log(`   Without isDeleted field: ${citiesWithoutField}\n`);

    // Test query to ensure records are returned
    const testCountries = await CountryModel.find({ isDeleted: false }).limit(5).countDocuments();
    const testStates = await StateModel.find({ isDeleted: false }).limit(5).countDocuments();
    const testCities = await CityModel.find({ isDeleted: false }).limit(5).countDocuments();

    console.log('🧪 Test Queries:');
    console.log(`   Countries with isDeleted: false: ${testCountries} (should be > 0)`);
    console.log(`   States with isDeleted: false: ${testStates} (should be > 0)`);
    console.log(`   Cities with isDeleted: false: ${testCities} (should be > 0)\n`);

    if (countriesWithoutField === 0 && statesWithoutField === 0 && citiesWithoutField === 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  ✅ SUCCESS - Migration Complete');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  ⚠️  WARNING - Some records still missing isDeleted field');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    // Disconnect and exit
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Fatal error during location soft delete migration:', error);
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    await disconnectDatabase();
    process.exit(1);
  }
};

// Run the migration
migrateLocationSoftDelete();

