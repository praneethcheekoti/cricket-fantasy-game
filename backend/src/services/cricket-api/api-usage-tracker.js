const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * API Usage Tracker Service
 * Manages API call limits and tracks usage across providers
 */
class ApiUsageTracker {
  constructor() {
    this.initialized = false;
    this.providers = {
      cricapi: {
        name: 'CricAPI',
        dailyLimit: 100,
        isEnabled: true
      },
      rapidapi: {
        name: 'RapidAPI',
        dailyLimit: 16, // 500/month ≈ 16/day
        isEnabled: true
      },
      cricbuzz: {
        name: 'Cricbuzz',
        dailyLimit: 500, // Self-imposed rate limit
        isEnabled: true
      },
      cricketdata: {
        name: 'CricketData',
        dailyLimit: 50,
        isEnabled: true
      },
      unofficial: {
        name: 'Unofficial Cricbuzz',
        dailyLimit: 16, // 500/month ≈ 16/day (same RapidAPI key)
        isEnabled: true
      }
    };
  }

  /**
   * Initialize API usage trackers in database
   */
  async initialize() {
    try {
      if (!this.initialized) {
        for (const [key, config] of Object.entries(this.providers)) {
          await prisma.apiUsageTracker.upsert({
            where: { apiName: key },
            update: {
              dailyLimit: config.dailyLimit,
              isActive: config.isEnabled
            },
            create: {
              apiName: key,
              callsToday: 0,
              dailyLimit: config.dailyLimit,
              isActive: config.isEnabled,
              lastResetAt: new Date(),
              errorCount: 0
            }
          });
        }
        this.initialized = true;
        console.log('[API Usage] ✅ Trackers initialized');
      }
    } catch (error) {
      console.error('[API Usage] ❌ Initialization failed:', error.message);
    }
  }

  /**
   * Get usage for a specific API
   */
  async getUsage(apiName) {
    try {
      const tracker = await prisma.apiUsageTracker.findUnique({
        where: { apiName }
      });

      if (!tracker) {
        // Silently initialize missing tracker
        await this.initialize();
        return this.getUsage(apiName);
      }

      return tracker;
    } catch (error) {
      console.error(`[API Usage] Error getting usage for ${apiName}:`, error.message);
      return null;
    }
  }

  /**
   * Get all API usage
   */
  async getAllUsage() {
    try {
      const trackers = await prisma.apiUsageTracker.findMany();
      return trackers;
    } catch (error) {
      console.error('[API Usage] Error getting all usage:', error.message);
      return [];
    }
  }

  /**
   * Check if API has remaining quota
   */
  async hasQuota(apiName) {
    const tracker = await this.getUsage(apiName);
    
    if (!tracker || !tracker.isActive) {
      return false;
    }

    const remaining = tracker.dailyLimit - tracker.callsToday;
    console.log(`[API Usage] ${apiName}: ${tracker.callsToday}/${tracker.dailyLimit} (${remaining} remaining)`);
    
    // Allow calls until actually exhausted (no buffer for player stats)
    return remaining > 0;
  }

  /**
   * Get remaining quota for an API
   */
  async getRemainingQuota(apiName) {
    const tracker = await this.getUsage(apiName);
    
    if (!tracker) {
      return 0;
    }

    return Math.max(0, tracker.dailyLimit - tracker.callsToday);
  }

  /**
   * Record an API call
   */
  async recordCall(apiName, success = true) {
    try {
      await prisma.apiUsageTracker.update({
        where: { apiName },
        data: {
          callsToday: { increment: 1 },
          lastCallAt: new Date(),
          errorCount: success ? undefined : { increment: 1 }
        }
      });

      console.log(`[API Usage] 📊 Recorded call to ${apiName} (success: ${success})`);
    } catch (error) {
      console.error(`[API Usage] Error recording call for ${apiName}:`, error.message);
    }
  }

  /**
   * Record an error for an API
   */
  async recordError(apiName) {
    try {
      await prisma.apiUsageTracker.update({
        where: { apiName },
        data: {
          errorCount: { increment: 1 },
          lastCallAt: new Date()
        }
      });

      // If too many errors, temporarily disable
      const tracker = await this.getUsage(apiName);
      if (tracker && tracker.errorCount >= 10) {
        console.warn(`[API Usage] ⚠️ ${apiName} has ${tracker.errorCount} errors, considering disable`);
      }
    } catch (error) {
      console.error(`[API Usage] Error recording error for ${apiName}:`, error.message);
    }
  }

  /**
   * Reset daily counters (called at midnight)
   */
  async resetDailyCounters() {
    try {
      await prisma.apiUsageTracker.updateMany({
        data: {
          callsToday: 0,
          lastResetAt: new Date(),
          errorCount: 0
        }
      });

      console.log('[API Usage] 🔄 Daily counters reset');
      return true;
    } catch (error) {
      console.error('[API Usage] Error resetting counters:', error.message);
      return false;
    }
  }

  /**
   * Disable an API
   */
  async disableApi(apiName, reason = 'Manual disable') {
    try {
      await prisma.apiUsageTracker.update({
        where: { apiName },
        data: {
          isActive: false
        }
      });

      console.log(`[API Usage] 🚫 Disabled ${apiName}: ${reason}`);
    } catch (error) {
      console.error(`[API Usage] Error disabling ${apiName}:`, error.message);
    }
  }

  /**
   * Enable an API
   */
  async enableApi(apiName) {
    try {
      await prisma.apiUsageTracker.update({
        where: { apiName },
        data: {
          isActive: true,
          errorCount: 0
        }
      });

      console.log(`[API Usage] ✅ Enabled ${apiName}`);
    } catch (error) {
      console.error(`[API Usage] Error enabling ${apiName}:`, error.message);
    }
  }

  /**
   * Get API health status
   */
  async getHealthStatus() {
    const trackers = await this.getAllUsage();
    
    return trackers.map(tracker => ({
      api: tracker.apiName,
      active: tracker.isActive,
      usage: `${tracker.callsToday}/${tracker.dailyLimit}`,
      remaining: tracker.dailyLimit - tracker.callsToday,
      errors: tracker.errorCount,
      lastCall: tracker.lastCallAt,
      lastReset: tracker.lastResetAt,
      status: this.getStatusLabel(tracker)
    }));
  }

  getStatusLabel(tracker) {
    if (!tracker.isActive) return '🔴 Disabled';
    
    const usage = tracker.callsToday / tracker.dailyLimit;
    
    if (usage >= 0.95) return '🔴 Exhausted';
    if (usage >= 0.8) return '🟡 High Usage';
    if (usage >= 0.5) return '🟢 Moderate';
    return '🟢 Available';
  }
}

module.exports = new ApiUsageTracker();

