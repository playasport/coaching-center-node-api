import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { logger } from '../src/utils/logger';

// Import all models so their schema indexes are registered
import { UserModel } from '../src/models/user.model';
import { ParticipantModel } from '../src/models/participant.model';
import { BookingModel } from '../src/models/booking.model';
import { BatchModel } from '../src/models/batch.model';
import { NotificationModel } from '../src/models/notification.model';
import { CoachingCenterModel } from '../src/models/coachingCenter.model';
import { CountryModel, StateModel, CityModel } from '../src/models/location.model';
import { ReelModel } from '../src/models/reel.model';
import { StreamHighlightModel } from '../src/models/streamHighlight.model';
import { SettingsModel } from '../src/models/settings.model';
import { CmsPageModel } from '../src/models/cmsPage.model';
import { BannerModel } from '../src/models/banner.model';
import { PermissionModel } from '../src/models/permission.model';
import { DeviceTokenModel } from '../src/models/deviceToken.model';
import { SportModel } from '../src/models/sport.model';
import { TransactionModel } from '../src/models/transaction.model';
import { RoleModel } from '../src/models/role.model';
import { OtpModel } from '../src/models/otp.model';
import { EmployeeModel } from '../src/models/employee.model';
import { FacilityModel } from '../src/models/facility.model';

type AnyModel = {
  modelName: string;
  collection: {
    name: string;
    indexes: (options?: any) => Promise<Array<{ name: string; key: Record<string, any> }>>;
  };
  syncIndexes: () => Promise<any>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const models = [
  UserModel,
  ParticipantModel,
  BookingModel,
  BatchModel,
  NotificationModel,
  CoachingCenterModel,
  CountryModel,
  StateModel,
  CityModel,
  ReelModel,
  StreamHighlightModel,
  SettingsModel,
  CmsPageModel,
  BannerModel,
  PermissionModel,
  DeviceTokenModel,
  SportModel,
  TransactionModel,
  RoleModel,
  OtpModel,
  EmployeeModel,
  FacilityModel,
] as AnyModel[];

const fmtIndexes = (idx: Array<{ name: string; key: Record<string, any> }>) =>
  idx
    .map((i) => `  - ${i.name}: ${JSON.stringify(i.key)}`)
    .sort((a, b) => a.localeCompare(b))
    .join('\n');

async function main() {
  try {
    console.log('\n🚀 Syncing indexes for ALL models...\n');

    await connectDatabase();
    console.log('✅ Database connected\n');

    const results: Array<{
      model: string;
      collection: string;
      ok: boolean;
      created?: string[];
      dropped?: string[];
      error?: string;
    }> = [];

    for (const m of models) {
      const modelName = m.modelName;
      const collectionName = m.collection?.name || 'unknown';

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📦 ${modelName} (${collectionName})`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      try {
        const before = await m.collection.indexes();
        console.log('\n📊 Indexes before:\n' + fmtIndexes(before));

        const syncResult = await m.syncIndexes();
        const created = (syncResult?.created || []) as string[];
        const dropped = (syncResult?.dropped || []) as string[];

        console.log('\n🔄 syncIndexes() done');
        if (created.length) console.log(`✅ Created: ${created.join(', ')}`);
        if (dropped.length) console.log(`🗑️ Dropped: ${dropped.join(', ')}`);
        if (!created.length && !dropped.length) console.log('ℹ️ No changes');

        const after = await m.collection.indexes();
        console.log('\n📊 Indexes after:\n' + fmtIndexes(after));

        results.push({ model: modelName, collection: collectionName, ok: true, created, dropped });
      } catch (err: any) {
        const message = err?.message || String(err);
        console.log(`\n❌ Failed to sync indexes for ${modelName}: ${message}`);
        results.push({ model: modelName, collection: collectionName, ok: false, error: message });
      }
    }

    console.log('\n\n==================== SUMMARY ====================');
    const okCount = results.filter((r) => r.ok).length;
    const failCount = results.length - okCount;
    console.log(`✅ Success: ${okCount}`);
    console.log(`❌ Failed:  ${failCount}`);

    if (failCount) {
      console.log('\nFailures:');
      results
        .filter((r) => !r.ok)
        .forEach((r) => console.log(`- ${r.model} (${r.collection}): ${r.error}`));
    }

    console.log('================================================\n');

    await disconnectDatabase();
    process.exit(failCount ? 1 : 0);
  } catch (error) {
    logger.error('Fatal error during index sync:', error);
    console.error('\n❌ Fatal error:', error);
    await disconnectDatabase();
    process.exit(1);
  }
}

main();


