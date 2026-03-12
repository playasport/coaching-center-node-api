/**
 * Test script for distance calculation.
 * Run with: npm run test:distance
 *
 * Set DEBUG_DISTANCE_METHOD=1 to log which method is used (redis_cache, google_maps_api, haversine)
 * to distance-method-log.txt in project root.
 *
 * Methods:
 * - redis_cache: Distance was found in Redis cache
 * - google_maps_api: Distance calculated via Google Maps Distance Matrix API
 * - haversine: Distance calculated via Haversine formula (fallback - straight-line)
 */

import path from 'path';
import fs from 'fs';
import { calculateDistance, calculateDistances, calculateHaversineDistance } from '../src/utils/distance';

const LOG_FILE = path.join(process.cwd(), 'distance-method-log.txt');

async function main() {
  // Clear previous log if exists
  if (process.env.DEBUG_DISTANCE_METHOD === '1') {
    if (fs.existsSync(LOG_FILE)) {
      fs.unlinkSync(LOG_FILE);
    }
    fs.writeFileSync(LOG_FILE, `Distance Method Test Log - ${new Date().toISOString()}\n`);
    fs.appendFileSync(LOG_FILE, '==========================================\n\n');
  }

  console.log('Testing distance calculation...\n');
  console.log('Set DEBUG_DISTANCE_METHOD=1 to log methods to distance-method-log.txt\n');

  // Test 1: Single distance - Delhi to Mumbai approximate
  const origin = { lat: 28.6139, lon: 77.209 }; // Delhi
  const dest = { lat: 19.076, lon: 72.8777 };   // Mumbai

  console.log('Test 1: calculateDistance (single)');
  console.log(`  Origin: Delhi (${origin.lat}, ${origin.lon})`);
  console.log(`  Dest: Mumbai (${dest.lat}, ${dest.lon})`);

  const dist1 = await calculateDistance(origin.lat, origin.lon, dest.lat, dest.lon);
  console.log(`  Result: ${dist1} km\n`);

  // Test 2: Haversine directly (for comparison)
  const haversineDist = calculateHaversineDistance(origin.lat, origin.lon, dest.lat, dest.lon);
  console.log('Test 2: calculateHaversineDistance (direct)');
  console.log(`  Result: ${haversineDist} km\n`);

  // Test 3: Batch distances
  const destinations = [
    { latitude: 19.076, longitude: 72.8777 },   // Mumbai
    { latitude: 12.9716, longitude: 77.5946 },  // Bangalore
    { latitude: 28.6139, longitude: 77.209 },   // Delhi (same as origin - ~0 km)
  ];
  console.log('Test 3: calculateDistances (batch of 3)');
  const dists = await calculateDistances(origin.lat, origin.lon, destinations);
  console.log(`  Results: ${dists.join(', ')} km\n`);

  if (process.env.DEBUG_DISTANCE_METHOD === '1') {
    console.log(`Methods logged to: ${LOG_FILE}`);
    console.log('\nLog contents:');
    console.log(fs.readFileSync(LOG_FILE, 'utf-8'));
  } else {
    console.log('Tip: Run with DEBUG_DISTANCE_METHOD=1 to see which method was used');
    console.log('     npm run test:distance:debug');
    console.log('     Or: $env:DEBUG_DISTANCE_METHOD="1"; npm run test:distance  (PowerShell)');
  }
}

main().catch(console.error).finally(() => process.exit(0));
