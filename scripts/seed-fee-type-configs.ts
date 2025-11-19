import fs from 'fs';
import path from 'path';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { FeeTypeConfigModel } from '../src/models/feeTypeConfig.model';
import { logger } from '../src/utils/logger';

const seedFeeTypeConfigs = async () => {
  try {
    console.log('\n🚀 Starting Fee Type Config Seeding...\n');

    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Read JSON file
    const jsonFilePath = path.join(process.cwd(), 'data', 'fee-type-configs.json');
    if (!fs.existsSync(jsonFilePath)) {
      throw new Error(`JSON file not found: ${jsonFilePath}`);
    }

    console.log(`📖 Reading JSON file: ${jsonFilePath}\n`);
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
    const feeTypeConfigurations = JSON.parse(jsonContent);

    console.log(`✅ Loaded ${feeTypeConfigurations.length} fee type configurations from JSON\n`);

    // Get existing count
    const existingCount = await FeeTypeConfigModel.countDocuments({ is_deleted: false });
    console.log(`📊 Current fee type configs count: ${existingCount}\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    for (const config of feeTypeConfigurations) {
      try {
        // Check if fee type already exists
        const existing = await FeeTypeConfigModel.findOne({
          fee_type: config.fee_type,
          is_deleted: false,
        });

        if (existing) {
          // Update existing record
          existing.label = config.label;
          existing.description = config.description;
          existing.formFields = config.formFields as any;
          existing.validationRules = config.validationRules || null;
          existing.is_active = true;
          existing.is_deleted = false;
          existing.deletedAt = null;
          await existing.save();

          console.log(`🔄 Updated fee type: "${config.label}" (${config.fee_type})`);
          updated++;
        } else {
          // Create new record
          const feeTypeConfig = new FeeTypeConfigModel({
            fee_type: config.fee_type,
            label: config.label,
            description: config.description,
            formFields: config.formFields as any,
            validationRules: config.validationRules || null,
            is_active: true,
            is_deleted: false,
            deletedAt: null,
          });

          await feeTypeConfig.save();

          console.log(`✅ Created fee type: "${config.label}" (${config.fee_type})`);
          created++;
        }
      } catch (error: any) {
        const errorMessage = `Failed to seed "${config.label}" (${config.fee_type}): ${error?.message || 'Unknown error'}`;
        console.error(`❌ ${errorMessage}`);
        errorMessages.push(errorMessage);
        errors++;
        logger.error(errorMessage, error);
      }
    }

    // Display results
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Seeding Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`  ✅ Created: ${created} fee type configs`);
    console.log(`  🔄 Updated: ${updated} fee type configs`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}`);

    if (errorMessages.length > 0) {
      console.log('\n  Error Details:');
      errorMessages.slice(0, 10).forEach((msg) => {
        console.log(`     - ${msg}`);
      });
      if (errorMessages.length > 10) {
        console.log(`     ... and ${errorMessages.length - 10} more errors`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Disconnect from database
    await disconnectDatabase();
    console.log('✅ Database disconnected\n');
    console.log('✨ Seeding completed successfully!\n');

    process.exit(0);
  } catch (error) {
    logger.error('Seeder failed:', error);
    console.error('\n❌ Seeding failed:', error instanceof Error ? error.message : error);
    await disconnectDatabase();
    process.exit(1);
  }
};

// Run seeder
seedFeeTypeConfigs();

