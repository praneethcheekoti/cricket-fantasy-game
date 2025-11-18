const cacheService = require('./cache-service');
const apiSelector = require('./api-selector');
const apiUsageTracker = require('./api-usage-tracker');

/**
 * Main Cricket API Service
 * Orchestrates cache + API providers + fallback logic
 * This is the single entry point for all cricket data
 */
class CricketApiService {
  /**
   * Initialize the service
   */
  async initialize() {
    await apiSelector.initialize();
    console.log('[Cricket API] ✅ Service initialized');
  }

  // ========================================
  // SERIES OPERATIONS
  // ========================================

  /**
   * Get all available series
   * @returns {Array} List of series
   */
  async getSeries() {
    try {
      console.log('[Cricket API] 📋 Fetching series...');

      // Check cache first
      const cached = await cacheService.getAllSeriesCache();
      if (cached && cached.length > 0) {
        console.log(`[Cricket API] ✅ Returning ${cached.length} series from cache`);
        return cached;
      }

      // Cache miss - fetch from API
      await cacheService.recordCacheMiss();
      console.log('[Cricket API] 🌐 Cache miss, fetching from API...');

      const result = await apiSelector.executeWithFallback('series', 'fetchSeries');
      
      if (result.success && result.data) {
        // Save each series to cache
        for (const series of result.data) {
          await cacheService.saveSeriesCache(series, result.provider);
        }

        await cacheService.recordApiCall();
        console.log(`[Cricket API] ✅ Fetched and cached ${result.data.length} series`);
        return result.data;
      }

      return [];
    } catch (error) {
      console.error('[Cricket API] ❌ Error fetching series:', error.message);
      return [];
    }
  }

  /**
   * Get series by ID
   * @param {string} seriesId - API series ID
   * @returns {Object} Series details
   */
  async getSeriesById(seriesId) {
    try {
      console.log(`[Cricket API] 📋 Fetching series ${seriesId}...`);

      // Check cache
      const cached = await cacheService.getSeriesCache(seriesId);
      if (cached) {
        return cached;
      }

      // Cache miss
      await cacheService.recordCacheMiss();
      const result = await apiSelector.executeWithFallback('series', 'fetchSeriesById', [seriesId]);

      if (result.success && result.data) {
        await cacheService.saveSeriesCache(result.data, result.provider);
        await cacheService.recordApiCall();
        return result.data;
      }

      return null;
    } catch (error) {
      console.error(`[Cricket API] ❌ Error fetching series ${seriesId}:`, error.message);
      return null;
    }
  }

  // ========================================
  // MATCH OPERATIONS
  // ========================================

  /**
   * Get matches for a series
   * @param {string} seriesId - API series ID
   * @returns {Array} List of matches
   */
  async getMatchesBySeries(seriesId) {
    try {
      console.log(`[Cricket API] 🏏 Fetching matches for series ${seriesId}...`);

      // Check cache
      const cached = await cacheService.getMatchesBySeriesCache(seriesId);
      if (cached && cached.length > 0) {
        console.log(`[Cricket API] ✅ Returning ${cached.length} matches from cache`);
        return cached;
      }

      // Cache miss
      await cacheService.recordCacheMiss();
      const result = await apiSelector.executeWithFallback('match', 'fetchMatchesBySeries', [seriesId]);

      if (result.success && result.data) {
        // Save each match to cache
        for (const match of result.data) {
          await cacheService.saveMatchCache(match, result.provider);
        }

        await cacheService.recordApiCall();
        console.log(`[Cricket API] ✅ Fetched and cached ${result.data.length} matches`);
        return result.data;
      }

      return [];
    } catch (error) {
      console.error(`[Cricket API] ❌ Error fetching matches for series ${seriesId}:`, error.message);
      return [];
    }
  }

  /**
   * Get match details
   * @param {string} matchId - API match ID
   * @returns {Object} Match details
   */
  async getMatchDetails(matchId) {
    try {
      console.log(`[Cricket API] 🏏 Fetching match ${matchId}...`);

      // Check cache
      const cached = await cacheService.getMatchCache(matchId);
      if (cached) {
        return cached;
      }

      // Cache miss
      await cacheService.recordCacheMiss();
      const result = await apiSelector.executeWithFallback('match', 'fetchMatchDetails', [matchId]);

      if (result.success && result.data) {
        await cacheService.saveMatchCache(result.data, result.provider);
        await cacheService.recordApiCall();
        return result.data;
      }

      return null;
    } catch (error) {
      console.error(`[Cricket API] ❌ Error fetching match ${matchId}:`, error.message);
      return null;
    }
  }

  // ========================================
  // LIVE SCORE OPERATIONS
  // ========================================

  /**
   * Get live score for a match
   * @param {string} matchId - API match ID
   * @returns {Object} Live scorecard
   */
  async getLiveScore(matchId) {
    try {
      console.log(`[Cricket API] 📊 Fetching live score for match ${matchId}...`);

      // Check cache (shorter TTL for live data)
      const cached = await cacheService.getLiveScoreCache(matchId);
      if (cached) {
        const age = Date.now() - new Date(cached.cachedAt).getTime();
        if (age < 30000) { // Less than 30 seconds old
          console.log(`[Cricket API] ✅ Returning live score from cache (${Math.floor(age/1000)}s old)`);
          return cached.scorecard;
        }
      }

      // Cache miss or stale
      await cacheService.recordCacheMiss();
      const result = await apiSelector.executeWithFallback('liveScore', 'fetchLiveScore', [matchId]);

      if (result.success && result.data) {
        await cacheService.saveLiveScoreCache(matchId, result.data, result.provider, 'live');
        await cacheService.recordApiCall();
        return result.data;
      }

      return null;
    } catch (error) {
      console.error(`[Cricket API] ❌ Error fetching live score for ${matchId}:`, error.message);
      
      // Return stale cache if available
      const cached = await cacheService.getLiveScoreCache(matchId);
      if (cached) {
        console.warn(`[Cricket API] ⚠️  Returning stale cache due to API error`);
        return cached.scorecard;
      }

      return null;
    }
  }

  // ========================================
  // PLAYER OPERATIONS
  // ========================================

  /**
   * Get squad for a series/team
   * @param {string} seriesId - API series ID
   * @param {string} teamName - Team name
   * @returns {Array} List of players
   */
  async getSquad(seriesId, teamName) {
    try {
      console.log(`[Cricket API] 👥 Fetching squad for ${teamName} in series ${seriesId}...`);

      // For now, fetch from API directly
      // TODO: Implement squad caching
      const result = await apiSelector.executeWithFallback('squad', 'fetchSquad', [seriesId, teamName]);

      if (result.success && result.data) {
        // Save each player to cache
        for (const player of result.data) {
          if (player.id) {
            const playerData = {
              apiPlayerId: player.id,
              name: player.name,
              fullName: player.name,
              role: player.role,
              battingStyle: null,
              bowlingStyle: null,
              team: player.team,
              country: player.team,
              imageUrl: null,
              overallStats: {}
            };
            await cacheService.savePlayerCache(playerData, result.provider);
          }
        }

        await cacheService.recordApiCall();
        return result.data;
      }

      return [];
    } catch (error) {
      console.error(`[Cricket API] ❌ Error fetching squad:`, error.message);
      return [];
    }
  }

  /**
   * Get player stats
   * @param {string} playerId - API player ID
   * @returns {Object} Player stats
   */
  async getPlayerStats(playerId) {
    try {
      console.log(`[Cricket API] 📊 Fetching stats for player ${playerId}...`);

      // Check cache
      const cached = await cacheService.getPlayerCache(playerId);
      if (cached) {
        return cached;
      }

      // Cache miss
      await cacheService.recordCacheMiss();
      const result = await apiSelector.executeWithFallback('player', 'fetchPlayerStats', [playerId]);

      if (result.success && result.data) {
        await cacheService.savePlayerCache(result.data, result.provider);
        await cacheService.recordApiCall();
        return result.data;
      }

      return null;
    } catch (error) {
      console.error(`[Cricket API] ❌ Error fetching player stats for ${playerId}:`, error.message);
      return null;
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get API health status
   */
  async getHealthStatus() {
    const health = await apiSelector.getHealthSummary();
    const cacheStats = await this.getCacheStatistics();

    return {
      ...health,
      cache: cacheStats
    };
  }

  /**
   * Get cache statistics
   */
  async getCacheStatistics() {
    try {
      const stats = await cacheService.getTodayStatistics();

      const total = stats.cacheHits + stats.cacheMisses;
      const hitRate = total > 0 ? ((stats.cacheHits / total) * 100).toFixed(1) : 0;

      return {
        hits: stats.cacheHits,
        misses: stats.cacheMisses,
        apiCalls: stats.apiCalls,
        hitRate: `${hitRate}%`
      };
    } catch (error) {
      console.error('[Cricket API] Error getting cache statistics:', error.message);
      return { hits: 0, misses: 0, apiCalls: 0, hitRate: '0%' };
    }
  }

  /**
   * Force refresh series (bypass cache)
   */
  async refreshSeries() {
    console.log('[Cricket API] 🔄 Force refreshing series...');
    
    const result = await apiSelector.executeWithFallback('series', 'fetchSeries');
    
    if (result.success && result.data) {
      for (const series of result.data) {
        await cacheService.saveSeriesCache(series, result.provider);
      }
      return result.data;
    }

    return [];
  }

  /**
   * Clean expired cache
   */
  async cleanCache() {
    return await cacheService.cleanExpiredCache();
  }
}

module.exports = new CricketApiService();

