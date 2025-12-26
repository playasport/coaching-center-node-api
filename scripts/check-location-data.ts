import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { CountryModel, StateModel, CityModel } from '../src/models/location.model';
import { logger } from '../src/utils/logger';

const checkLocationData = async () => {
  try {
    console.log('\n🔍 Checking Location Data Structure...\n');

    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Check countries
    const countries = await CountryModel.find({}).limit(5).lean();
    console.log(`📊 Sample Countries (showing ${countries.length}):`);
    countries.forEach((country: any) => {
      console.log(`   ID: ${country._id} (type: ${typeof country._id})`);
      console.log(`   Name: ${country.name}`);
      console.log(`   isDeleted: ${country.isDeleted} (type: ${typeof country.isDeleted})`);
      console.log(`   deletedAt: ${country.deletedAt}`);
      console.log('');
    });

    // Check states
    const states = await StateModel.find({}).limit(5).lean();
    console.log(`📊 Sample States (showing ${states.length}):`);
    states.forEach((state: any) => {
      console.log(`   ID: ${state._id} (type: ${typeof state._id})`);
      console.log(`   Name: ${state.name}`);
      console.log(`   countryId: ${state.countryId} (type: ${typeof state.countryId})`);
      console.log(`   isDeleted: ${state.isDeleted} (type: ${typeof state.isDeleted})`);
      console.log(`   deletedAt: ${state.deletedAt}`);
      console.log('');
    });

    // Check cities
    const cities = await CityModel.find({}).limit(5).lean();
    console.log(`📊 Sample Cities (showing ${cities.length}):`);
    cities.forEach((city: any) => {
      console.log(`   ID: ${city._id} (type: ${typeof city._id})`);
      console.log(`   Name: ${city.name}`);
      console.log(`   stateId: ${city.stateId} (type: ${typeof city.stateId})`);
      console.log(`   countryId: ${city.countryId} (type: ${typeof city.countryId})`);
      console.log(`   isDeleted: ${city.isDeleted} (type: ${typeof city.isDeleted})`);
      console.log(`   deletedAt: ${city.deletedAt}`);
      console.log('');
    });

    // Check counts
    const totalCountries = await CountryModel.countDocuments({});
    const countriesWithIsDeleted = await CountryModel.countDocuments({ isDeleted: { $exists: true } });
    const countriesWithoutIsDeleted = await CountryModel.countDocuments({ isDeleted: { $exists: false } });
    
    const totalStates = await StateModel.countDocuments({});
    const statesWithIsDeleted = await StateModel.countDocuments({ isDeleted: { $exists: true } });
    const statesWithoutIsDeleted = await StateModel.countDocuments({ isDeleted: { $exists: false } });
    
    const totalCities = await CityModel.countDocuments({});
    const citiesWithIsDeleted = await CityModel.countDocuments({ isDeleted: { $exists: true } });
    const citiesWithoutIsDeleted = await CityModel.countDocuments({ isDeleted: { $exists: false } });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Data Statistics');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`📍 Countries:`);
    console.log(`   Total: ${totalCountries}`);
    console.log(`   With isDeleted field: ${countriesWithIsDeleted}`);
    console.log(`   Without isDeleted field: ${countriesWithoutIsDeleted}\n`);

    console.log(`📍 States:`);
    console.log(`   Total: ${totalStates}`);
    console.log(`   With isDeleted field: ${statesWithIsDeleted}`);
    console.log(`   Without isDeleted field: ${statesWithoutIsDeleted}\n`);

    console.log(`📍 Cities:`);
    console.log(`   Total: ${totalCities}`);
    console.log(`   With isDeleted field: ${citiesWithIsDeleted}`);
    console.log(`   Without isDeleted field: ${citiesWithoutIsDeleted}\n`);

    // Check countryId/stateId types
    const sampleState = await StateModel.findOne({}).lean();
    if (sampleState) {
      console.log(`🔍 Sample State countryId analysis:`);
      console.log(`   countryId value: ${sampleState.countryId}`);
      console.log(`   countryId type: ${typeof sampleState.countryId}`);
      console.log(`   countryId is ObjectId instance: ${sampleState.countryId?.constructor?.name === 'ObjectId'}`);
      if (sampleState.countryId) {
        const country = await CountryModel.findById(sampleState.countryId).lean();
        console.log(`   Found country with this ID: ${country ? 'Yes' : 'No'}`);
        if (!country) {
          // Try as string
          const countryAsString = await CountryModel.findOne({ _id: sampleState.countryId.toString() }).lean();
          console.log(`   Found country with ID as string: ${countryAsString ? 'Yes' : 'No'}`);
        }
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Disconnect and exit
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Fatal error during location data check:', error);
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    await disconnectDatabase();
    process.exit(1);
  }
};

// Run the check
checkLocationData();

