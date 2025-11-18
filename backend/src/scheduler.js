const cron = require('node-cron');
const { cleanupExpiredCache } = require('./jobs/cache-cleanup.job');
const { resetApiUsageCounters } = require('./jobs/api-reset.job');
const { refreshLiveScores } = require('./jobs/live-score.job');

/**
 * Background Job Scheduler
 * Registers all cron jobs for the application
 */
class JobScheduler {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  [SCHEDULER] Already running, skipping start');
      return;
    }

    console.log('\n🚀 [SCHEDULER] Starting background jobs...\n');

    // Job 1: Cache Cleanup - Daily at 2 AM
    const cacheCleanupJob = cron.schedule('0 2 * * *', async () => {
      await cleanupExpiredCache();
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata" // Adjust to your timezone
    });

    this.jobs.push({
      name: 'Cache Cleanup',
      schedule: '0 2 * * *',
      description: 'Daily at 2:00 AM',
      job: cacheCleanupJob
    });

    // Job 2: API Usage Reset - Daily at Midnight
    const apiResetJob = cron.schedule('0 0 * * *', async () => {
      await resetApiUsageCounters();
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    this.jobs.push({
      name: 'API Usage Reset',
      schedule: '0 0 * * *',
      description: 'Daily at 12:00 AM (Midnight)',
      job: apiResetJob
    });

    // Job 3: Live Score Refresh - Every 5 minutes
    const liveScoreJob = cron.schedule('*/5 * * * *', async () => {
      await refreshLiveScores();
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    this.jobs.push({
      name: 'Live Score Refresh',
      schedule: '*/5 * * * *',
      description: 'Every 5 minutes',
      job: liveScoreJob
    });

    this.isRunning = true;

    // Log all registered jobs
    console.log('✅ [SCHEDULER] All jobs registered successfully!\n');
    console.log('📋 [SCHEDULER] Active Jobs:');
    this.jobs.forEach((job, index) => {
      console.log(`   ${index + 1}. ${job.name}`);
      console.log(`      Schedule: ${job.schedule} (${job.description})`);
    });
    console.log('\n⏰ [SCHEDULER] Jobs will run according to schedule.');
    console.log('💡 [SCHEDULER] Tip: Keep the server running to ensure jobs execute.\n');
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  [SCHEDULER] Not running, nothing to stop');
      return;
    }

    console.log('\n🛑 [SCHEDULER] Stopping all background jobs...');

    this.jobs.forEach(job => {
      job.job.stop();
      console.log(`   ✅ Stopped: ${job.name}`);
    });

    this.isRunning = false;
    this.jobs = [];

    console.log('✅ [SCHEDULER] All jobs stopped.\n');
  }

  /**
   * Get status of all jobs
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      totalJobs: this.jobs.length,
      jobs: this.jobs.map(j => ({
        name: j.name,
        schedule: j.schedule,
        description: j.description
      }))
    };
  }
}

// Create singleton instance
const scheduler = new JobScheduler();

module.exports = scheduler;

