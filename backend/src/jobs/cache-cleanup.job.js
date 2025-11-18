const cacheService = require('../services/cricket-api/cache-service');

/**
 * Cache Cleanup Job
 * Deletes expired cache entries from MongoDB
 * 
 * Runs:
 * - On server startup
 * - Scheduled: Daily at 2 AM
 */
const cleanupExpiredCache = async () => {
  try {
    console.log('\n🧹 [CACHE CLEANUP] Starting cache cleanup job...');
    console.log(`⏰ [CACHE CLEANUP] Time: ${new Date().toISOString()}`);

    const result = await cacheService.cleanExpiredCache();

    if (result.error) {
      console.error('❌ [CACHE CLEANUP] Error:', result.error);
      return;
    }

    const totalDeleted = result.series + result.matches + result.players + result.scores;

    console.log('✅ [CACHE CLEANUP] Cleanup completed successfully!');
    console.log(`   📊 Series deleted: ${result.series}`);
    console.log(`   📊 Matches deleted: ${result.matches}`);
    console.log(`   📊 Players deleted: ${result.players}`);
    console.log(`   📊 Scores deleted: ${result.scores}`);
    console.log(`   🎯 Total entries cleaned: ${totalDeleted}\n`);

    return result;
  } catch (error) {
    console.error('❌ [CACHE CLEANUP] Failed:', error.message);
    console.error('Stack:', error.stack);
  }
};

module.exports = { cleanupExpiredCache };

