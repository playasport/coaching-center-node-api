import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { CountryModel, StateModel, CityModel } from '../src/models/location.model';
import { logger } from '../src/utils/logger';

const fixLocationAssociations = async () => {
  try {
    console.log('\n🚀 Starting Location Associations Fix...\n');

    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Find India country record
    const indiaCountry = await CountryModel.findOne({
      $or: [
        { name: 'India' },
        { name: { $regex: /^india$/i } },
        { iso2: 'IN' },
        { iso3: 'IND' },
      ],
    });

    if (!indiaCountry) {
      console.error('❌ India country record not found. Please ensure India is in the countries collection.');
      await disconnectDatabase();
      process.exit(1);
    }

    console.log(`✅ India country found:`);
    console.log(`   ID: ${indiaCountry._id}`);
    console.log(`   Name: ${indiaCountry.name}`);
    console.log(`   ISO2: ${indiaCountry.iso2 || 'N/A'}`);
    console.log(`   ISO3: ${indiaCountry.iso3 || 'N/A'}\n`);

    const indiaId = indiaCountry._id.toString();
    const indiaName = indiaCountry.name;
    const indiaCode = indiaCountry.iso2 || indiaCountry.code || 'IN';

    // Get all states
    const states = await StateModel.find({});
    console.log(`📊 Found ${states.length} states\n`);

    // Update all states with India's countryId
    let statesUpdated = 0;
    let statesAlreadyCorrect = 0;

    for (const state of states) {
      const needsUpdate = 
        !state.countryId || 
        state.countryId !== indiaId ||
        !state.countryName ||
        state.countryName !== indiaName ||
        !state.countryCode ||
        state.countryCode !== indiaCode;

      if (needsUpdate) {
        await StateModel.updateOne(
          { _id: state._id },
          {
            $set: {
              countryId: indiaId,
              countryName: indiaName,
              countryCode: indiaCode,
            },
          }
        );
        statesUpdated++;
      } else {
        statesAlreadyCorrect++;
      }
    }

    console.log(`✅ States updated: ${statesUpdated}`);
    console.log(`   States already correct: ${statesAlreadyCorrect}\n`);

    // Get all cities
    const cities = await CityModel.find({});
    console.log(`📊 Found ${cities.length} cities\n`);

    // Update cities with correct stateId and countryId
    let citiesUpdated = 0;
    let citiesAlreadyCorrect = 0;
    let citiesWithInvalidState = 0;

    // First, create a map of state names to state IDs for quick lookup
    const stateNameToIdMap = new Map<string, string>();
    const stateIdToNameMap = new Map<string, { name: string; code?: string }>();

    for (const state of states) {
      if (state.name) {
        stateNameToIdMap.set(state.name.toLowerCase(), state._id.toString());
        stateIdToNameMap.set(state._id.toString(), {
          name: state.name,
          code: state.stateCode,
        });
      }
    }

    for (const city of cities) {
      let needsUpdate = false;
      let stateId: string | undefined = city.stateId;
      let stateName: string | undefined = city.stateName;
      let stateCode: string | undefined = city.stateCode;

      // Try to find stateId if it's missing or invalid
      if (!stateId || !stateIdToNameMap.has(stateId)) {
        // Try to find state by name
        if (city.stateName) {
          const foundStateId = stateNameToIdMap.get(city.stateName.toLowerCase());
          if (foundStateId) {
            stateId = foundStateId;
            const stateInfo = stateIdToNameMap.get(foundStateId);
            stateName = stateInfo?.name || city.stateName;
            stateCode = stateInfo?.code || city.stateCode;
            needsUpdate = true;
          } else {
            citiesWithInvalidState++;
            console.log(`⚠️  City "${city.name}" has invalid state reference: ${city.stateName || 'N/A'}`);
          }
        } else {
          citiesWithInvalidState++;
          console.log(`⚠️  City "${city.name}" has no state information`);
        }
      }

      // Check if country association needs update
      if (
        !city.countryId ||
        city.countryId !== indiaId ||
        !city.countryName ||
        city.countryName !== indiaName ||
        !city.countryCode ||
        city.countryCode !== indiaCode
      ) {
        needsUpdate = true;
      }

      // Check if state association needs update
      if (stateId && (city.stateId !== stateId || city.stateName !== stateName)) {
        needsUpdate = true;
      }

      if (needsUpdate && stateId) {
        await CityModel.updateOne(
          { _id: city._id },
          {
            $set: {
              countryId: indiaId,
              countryName: indiaName,
              countryCode: indiaCode,
              stateId: stateId,
              stateName: stateName || undefined,
              stateCode: stateCode || undefined,
            },
          }
        );
        citiesUpdated++;
      } else if (stateId) {
        citiesAlreadyCorrect++;
      }
    }

    console.log(`\n✅ Cities updated: ${citiesUpdated}`);
    console.log(`   Cities already correct: ${citiesAlreadyCorrect}`);
    if (citiesWithInvalidState > 0) {
      console.log(`   Cities with invalid/missing state: ${citiesWithInvalidState}`);
    }

    // Display summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Fix Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`  📍 Country: ${indiaName} (${indiaCode})`);
    console.log(`     ID: ${indiaId}\n`);

    console.log(`  ✅ States:`);
    console.log(`     Updated: ${statesUpdated}`);
    console.log(`     Already correct: ${statesAlreadyCorrect}`);
    console.log(`     Total: ${states.length}\n`);

    console.log(`  ✅ Cities:`);
    console.log(`     Updated: ${citiesUpdated}`);
    console.log(`     Already correct: ${citiesAlreadyCorrect}`);
    if (citiesWithInvalidState > 0) {
      console.log(`     ⚠️  Invalid/missing state: ${citiesWithInvalidState}`);
    }
    console.log(`     Total: ${cities.length}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✅ SUCCESS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Disconnect and exit
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Fatal error during location associations fix:', error);
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    await disconnectDatabase();
    process.exit(1);
  }
};

// Run the fix
fixLocationAssociations();

