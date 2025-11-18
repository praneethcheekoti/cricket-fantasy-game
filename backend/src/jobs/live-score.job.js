const { PrismaClient } = require('@prisma/client');
const cricketApiService = require('../services/cricket-api');

const prisma = new PrismaClient();

/**
 * Live Score Refresh Job
 * Fetches and updates scores for all live matches
 * 
 * Runs:
 * - On server startup
 * - Scheduled: Every 5 minutes
 */
const refreshLiveScores = async () => {
  try {
    console.log('\n🔴 [LIVE SCORES] Starting live score refresh job...');
    console.log(`⏰ [LIVE SCORES] Time: ${new Date().toISOString()}`);

    // Find all matches with status 'live' from MatchCache
    const liveMatches = await prisma.matchCache.findMany({
      where: { status: 'live' }
    });

    if (liveMatches.length === 0) {
      console.log('✅ [LIVE SCORES] No live matches found. Nothing to update.\n');
      return { updated: 0, total: 0 };
    }

    console.log(`📊 [LIVE SCORES] Found ${liveMatches.length} live match(es)`);

    let successCount = 0;
    let errorCount = 0;

    for (const match of liveMatches) {
      try {
        console.log(`   🔄 Refreshing: ${match.team1} vs ${match.team2}`);
        
        // Fetch live score from API (with caching)
        const scorecard = await cricketApiService.getLiveScore(match.apiMatchId);

        if (scorecard) {
          console.log(`   ✅ Updated: ${match.team1} vs ${match.team2}`);
          successCount++;
        } else {
          console.log(`   ⚠️  No scorecard available for: ${match.team1} vs ${match.team2}`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to update ${match.team1} vs ${match.team2}:`, error.message);
        errorCount++;
      }
    }

    console.log(`✅ [LIVE SCORES] Refresh completed!`);
    console.log(`   🎯 Updated: ${successCount}/${liveMatches.length}`);
    if (errorCount > 0) {
      console.log(`   ⚠️  Errors: ${errorCount}`);
    }
    console.log('');

    return {
      updated: successCount,
      errors: errorCount,
      total: liveMatches.length
    };
  } catch (error) {
    console.error('❌ [LIVE SCORES] Job failed:', error.message);
    console.error('Stack:', error.stack);
    return { error: error.message };
  }
};

/**
 * Refresh scores for a specific tournament
 * (Optional: for more granular control)
 */
const refreshTournamentScores = async (tournamentId) => {
  try {
    console.log(`🔴 [LIVE SCORES] Refreshing tournament ${tournamentId}...`);

    // Get tournament and its series
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      console.log('❌ Tournament not found');
      return;
    }

    // Get series from cache
    const series = await prisma.seriesCache.findUnique({
      where: { id: tournament.seriesId }
    });

    if (!series) {
      console.log('❌ Series not found');
      return;
    }

    // Get live matches for this series
    const liveMatches = await prisma.matchCache.findMany({
      where: {
        apiSeriesId: series.apiSeriesId,
        status: 'live'
      }
    });

    console.log(`📊 Found ${liveMatches.length} live match(es) for this tournament`);

    for (const match of liveMatches) {
      const scorecard = await cricketApiService.getLiveScore(match.apiMatchId);
      if (scorecard) {
        console.log(`   ✅ Updated: ${match.team1} vs ${match.team2}`);
      }
    }

    return { updated: liveMatches.length };
  } catch (error) {
    console.error('❌ [LIVE SCORES] Tournament refresh failed:', error.message);
  }
};

module.exports = { 
  refreshLiveScores,
  refreshTournamentScores
};

