require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const seriesRoutes = require('./routes/series.routes');
const tournamentRoutes = require('./routes/tournament.routes');
const auctionRoutes = require('./routes/auction.routes');
const matchRoutes = require('./routes/match.routes');

// Background Jobs
const scheduler = require('./scheduler');
const { cleanupExpiredCache } = require('./jobs/cache-cleanup.job');
const { checkAndResetIfNeeded } = require('./jobs/api-reset.job');
const { refreshLiveScores } = require('./jobs/live-score.job');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/auction', auctionRoutes);
app.use('/api/matches', matchRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Cricket Fantasy API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

/**
 * Run startup jobs
 * These run immediately when the server starts
 */
const runStartupJobs = async () => {
  console.log('\n========================================');
  console.log('🌟 RUNNING STARTUP JOBS');
  console.log('========================================\n');

  try {
    // Job 1: Cleanup expired cache
    console.log('1️⃣ Running cache cleanup...');
    await cleanupExpiredCache();

    // Job 2: Reset API counters if new day
    console.log('2️⃣ Checking API usage counters...');
    await checkAndResetIfNeeded();

    // Job 3: Refresh live scores
    console.log('3️⃣ Refreshing live match scores...');
    await refreshLiveScores();

    console.log('========================================');
    console.log('✅ STARTUP JOBS COMPLETED');
    console.log('========================================\n');
  } catch (error) {
    console.error('❌ Startup jobs failed:', error.message);
    console.error('Server will continue, but some data might be stale.\n');
  }
};

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🏏 Cricket Fantasy API ready!`);

  // Run startup jobs
  await runStartupJobs();

  // Start background job scheduler
  scheduler.start();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Received SIGINT, shutting down gracefully...');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Received SIGTERM, shutting down gracefully...');
  scheduler.stop();
  process.exit(0);
});

