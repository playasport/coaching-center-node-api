/**
 * Migration: Populate location.geo for existing coaching centers
 * Required for 2dsphere $geoNear queries
 * Run: npm run migrate:coaching-center-geo
 */

import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { CoachingCenterModel } from '../src/models/coachingCenter.model';
import { logger } from '../src/utils/logger';

async function main() {
  try {
    await connectDatabase();
    logger.info('Starting coaching center geo migration');

    const docs = await CoachingCenterModel.find(
      {
        'location.latitude': { $exists: true, $ne: null },
        'location.longitude': { $exists: true, $ne: null },
        $or: [
          { 'location.geo': { $exists: false } },
          { 'location.geo': null },
        ],
      },
      { id: 1, 'location.latitude': 1, 'location.longitude': 1 }
    ).lean();

    if (docs.length === 0) {
      logger.info('No coaching centers need geo migration');
      await disconnectDatabase();
      process.exit(0);
      return;
    }

    const ops = docs.map((doc: any) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            'location.geo': {
              type: 'Point',
              coordinates: [doc.location.longitude, doc.location.latitude],
            },
          },
        },
      },
    }));

    const bulkResult = await CoachingCenterModel.collection.bulkWrite(ops);
    logger.info(`Migrated ${bulkResult.modifiedCount} coaching centers with location.geo`);

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Geo migration failed', { error });
    await disconnectDatabase();
    process.exit(1);
  }
}

main();
