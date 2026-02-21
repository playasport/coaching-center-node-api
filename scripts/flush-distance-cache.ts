import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  db: 1,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

(async () => {
  const distanceKeys = await redis.keys('distance:*');
  console.log(`Found ${distanceKeys.length} distance cache keys`);
  if (distanceKeys.length > 0) {
    const deleted = await redis.del(...distanceKeys);
    console.log(`Deleted ${deleted} distance cache keys`);
  }

  const homeKeys = await redis.keys('home:*');
  console.log(`Found ${homeKeys.length} home data cache keys`);
  if (homeKeys.length > 0) {
    const deleted = await redis.del(...homeKeys);
    console.log(`Deleted ${deleted} home data cache keys`);
  }

  console.log('Cache flushed successfully');
  await redis.quit();
  process.exit(0);
})();
