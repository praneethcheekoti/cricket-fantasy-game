const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * API Usage Reset Job
 * Resets daily API call counters for all providers
 * 
 * Runs:
 * - On server startup (if new day)
 * - Scheduled: Daily at midnight
 */
const resetApiUsageCounters = async () => {
  try {
    console.log('\n🔄 [API RESET] Starting API usage reset job...');
    console.log(`⏰ [API RESET] Time: ${new Date().toISOString()}`);

    // Get all API trackers
    const trackers = await prisma.apiUsageTracker.findMany();

    if (trackers.length === 0) {
      console.log('⚠️  [API RESET] No API trackers found. Skipping.');
      return;
    }

    let resetCount = 0;
    const now = new Date();

    for (const tracker of trackers) {
      // Check if last reset was on a different day
      const lastReset = new Date(tracker.lastResetAt);
      const isDifferentDay = lastReset.toDateString() !== now.toDateString();

      if (isDifferentDay || tracker.callsToday > 0) {
        await prisma.apiUsageTracker.update({
          where: { id: tracker.id },
          data: {
            callsToday: 0,
            lastResetAt: now,
            errorCount: 0 // Also reset error count
          }
        });

        console.log(`   ✅ Reset ${tracker.apiName}: ${tracker.callsToday} → 0 calls`);
        resetCount++;
      } else {
        console.log(`   ⏭️  ${tracker.apiName}: Already at 0, skipping`);
      }
    }

    console.log(`✅ [API RESET] Reset completed!`);
    console.log(`   🎯 Providers reset: ${resetCount}/${trackers.length}\n`);

    return { resetCount, totalTrackers: trackers.length };
  } catch (error) {
    console.error('❌ [API RESET] Failed:', error.message);
    console.error('Stack:', error.stack);
  }
};

/**
 * Check if API counters need reset (for startup)
 * Only resets if it's a new day since last reset
 */
const checkAndResetIfNeeded = async () => {
  try {
    const trackers = await prisma.apiUsageTracker.findMany();
    
    if (trackers.length === 0) {
      return { needed: false };
    }

    const now = new Date();
    let needsReset = false;

    // Check if any tracker was last reset on a different day
    for (const tracker of trackers) {
      const lastReset = new Date(tracker.lastResetAt);
      if (lastReset.toDateString() !== now.toDateString()) {
        needsReset = true;
        break;
      }
    }

    if (needsReset) {
      console.log('🔄 [API RESET] New day detected, resetting counters...');
      await resetApiUsageCounters();
      return { needed: true, reset: true };
    } else {
      console.log('✅ [API RESET] Counters already reset today, skipping.');
      return { needed: false };
    }
  } catch (error) {
    console.error('❌ [API RESET] Check failed:', error.message);
    return { needed: false, error: error.message };
  }
};

module.exports = { 
  resetApiUsageCounters, 
  checkAndResetIfNeeded 
};

