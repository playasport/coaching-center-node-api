import { importLocationData, getLocationDataCounts } from '../src/services/location-import.service';
import { disconnectDatabase } from '../src/config/database';
import { logger } from '../src/utils/logger';

const runImport = async () => {
  try {
    console.log('\n🚀 Starting Location Data Import...\n');

    // Check current counts
    try {
      const counts = await getLocationDataCounts();
      console.log('📊 Current data counts:');
      console.log(`   Countries: ${counts.countries}`);
      console.log(`   States: ${counts.states}`);
      console.log(`   Cities: ${counts.cities}\n`);
    } catch (error) {
      logger.warn('Could not fetch current counts (database might be empty)');
    }

    // Import data
    const result = await importLocationData({
      dropExisting: true, // Drop existing collections before import
    });

    // Display results
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Import Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`  ✅ Countries: ${result.countries.imported} imported`);
    if (result.countries.errors.length > 0) {
      console.log(`     Errors: ${result.countries.errors.join(', ')}`);
    }

    console.log(`  ✅ States: ${result.states.imported} imported`);
    if (result.states.errors.length > 0) {
      console.log(`     Errors: ${result.states.errors.join(', ')}`);
    }

    console.log(`  ✅ Cities: ${result.cities.imported} imported`);
    if (result.cities.errors.length > 0) {
      console.log(`     Errors: ${result.cities.errors.join(', ')}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  ${result.success ? '✅ SUCCESS' : '⚠️  COMPLETED WITH ERRORS'}`);
    console.log(`  ${result.message}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Disconnect and exit
    await disconnectDatabase();
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    logger.error('Failed to import location data:', error);
    console.error('\n❌ Import failed:', error instanceof Error ? error.message : 'Unknown error\n');
    await disconnectDatabase();
    process.exit(1);
  }
};

// Run the import
runImport();

