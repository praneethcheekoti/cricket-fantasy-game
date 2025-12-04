const { PrismaClient } = require('@prisma/client');
const cacheService = require('./cache-service');
const apiSelector = require('./api-selector');
const apiUsageTracker = require('./api-usage-tracker');

const prisma = new PrismaClient();

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
   * Returns raw series WITHOUT splitting by format (saves API calls!)
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
        // Return raw series WITHOUT splitting
        const allSeries = result.data.map(series => ({
          ...series,
          apiSource: result.provider
        }));
        
        // Save each series to cache
        for (const series of allSeries) {
          await cacheService.saveSeriesCache(series, result.provider);
        }

        await cacheService.recordApiCall();
        console.log(`[Cricket API] ✅ Fetched and cached ${allSeries.length} series from ${result.provider}`);
        
        // Now fetch from cache to get MongoDB IDs
        const cachedSeries = await cacheService.getAllSeriesCache();
        if (cachedSeries && cachedSeries.length > 0) {
          console.log(`[Cricket API] ✅ Returning series with MongoDB IDs from cache`);
          return cachedSeries;
        }
        
        // Fallback to returning without MongoDB IDs if cache fetch fails
        return allSeries;
      }

      return [];
    } catch (error) {
      console.error('[Cricket API] ❌ Error fetching series:', error.message);
      return [];
    }
  }

  /**
   * Get available formats for a specific series
   * Fetches squads and returns which formats are available
   * @param {string} seriesId - MongoDB series ID
   * @returns {Array} Available formats with metadata
   */
  async getSeriesFormats(seriesId) {
    try {
      console.log(`[Cricket API] 🔍 Fetching formats for series ${seriesId}...`);

      // Get the series from database using MongoDB ID
      const series = await prisma.seriesCache.findUnique({
        where: { id: seriesId }
      });
      
      if (!series) {
        throw new Error('Series not found');
      }
      
      console.log(`[Cricket API] ✅ Found series: ${series.name}`);

      // Get the provider instance - always try unofficial first for format detection
      console.log('[Cricket API] 🔍 Checking providers:', {
        providersExist: !!apiSelector.providers,
        unofficialExists: !!apiSelector.providers?.unofficial,
        unofficialEnabled: apiSelector.providers?.unofficial?.isEnabled
      });
      
      const providerInstance = apiSelector.providers?.unofficial;
      
      if (!providerInstance) {
        console.log('[Cricket API] ⚠️  Unofficial provider not found in apiSelector.providers');
        console.log('[Cricket API] 🔍 Available providers:', Object.keys(apiSelector.providers || {}));
        return [{
          format: series.format || 'ODI',
          available: true,
          squadCount: 2
        }];
      }
      
      if (!providerInstance.isEnabled) {
        console.log('[Cricket API] ⚠️  Unofficial provider is disabled (isEnabled=false)');
        return [{
          format: series.format || 'ODI',
          available: true,
          squadCount: 2
        }];
      }

      console.log(`[Cricket API] 📋 Using Unofficial Cricbuzz to fetch formats for series API ID: ${series.apiSeriesId}`);
      
      // Fetch squads to determine available formats (works regardless of original apiSource)
      const squadsByFormat = await providerInstance.fetchSquadsBySeries(series.apiSeriesId);
      
      const availableFormats = [];
      
      ['Test', 'ODI', 'T20'].forEach(format => {
        const squads = squadsByFormat[format] || [];
        if (squads.length > 0) {
          availableFormats.push({
            format: format,
            available: true,
            squadCount: squads.length,
            squadIds: squads.map(s => s.squadId),
            teams: squads.map(s => s.teamName)
          });
        }
      });

      await cacheService.recordApiCall();
      console.log(`[Cricket API] ✅ Found ${availableFormats.length} formats: ${availableFormats.map(f => f.format).join(', ')}`);
      
      return availableFormats;
    } catch (error) {
      console.error(`[Cricket API] ❌ Error fetching formats:`, error.message);
      throw error;
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
   * @param {boolean} forceRefresh - If true, bypass cache and fetch from API, then replace cache
   * @returns {Array} List of matches
   */
  async getMatchesBySeries(seriesId, forceRefresh = false) {
    try {
      console.log(`[Cricket API] 🏏 Fetching matches for series ${seriesId}...`);
      console.log(`[Cricket API] 🔄 Force refresh: ${forceRefresh}`);

      // If force refresh, skip cache and go directly to API
      if (!forceRefresh) {
        // Check cache
        const cached = await cacheService.getMatchesBySeriesCache(seriesId);
        if (cached && cached.length > 0) {
          console.log(`[Cricket API] ✅ Returning ${cached.length} matches from cache`);
          return cached;
        }
      } else {
        console.log(`[Cricket API] 🗑️ Clearing old match cache for series ${seriesId}...`);
        await cacheService.clearMatchCacheForSeries(seriesId);
      }

      // Cache miss or force refresh - fetch from API
      await cacheService.recordCacheMiss();
      const result = await apiSelector.executeWithFallback('match', 'fetchMatchesBySeries', [seriesId]);

      if (result.success && result.data) {
        // Save each match to cache (replacing old data)
        for (const match of result.data) {
          await cacheService.saveMatchCache(match, result.provider);
        }

        await cacheService.recordApiCall();
        console.log(`[Cricket API] ✅ Fetched and cached ${result.data.length} matches from API`);
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
   * Get all squads for a series (all teams at once)
   * For Unofficial Cricbuzz: Fetches squads for the specified format only
   * @param {string} seriesId - MongoDB series ID (from our SeriesCache)
   * @param {string} format - Format to fetch (Test/ODI/T20)
   * @returns {Array} List of all players from all teams
   */
  async getAllSquads(seriesId, format = 'ODI') {
    try {
      console.log(`[Cricket API] 👥 Fetching ${format} squads for series ${seriesId}...`);

      // First, get the series from database using MongoDB ID
      const series = await prisma.seriesCache.findUnique({
        where: { id: seriesId }
      });
      
      if (!series) {
        throw new Error('Series not found');
      }

      // Check if this is an Unofficial Cricbuzz series
      if (series.apiSource === 'unofficial') {
        console.log('[Cricket API] 📋 Using Unofficial Cricbuzz, fetching format-specific squads');
        return await this.getAllSquadsFromSquadIds(series, format);
      }

      // Fallback to old method for other providers
      const result = await apiSelector.executeWithFallback('squad', 'fetchAllSquads', [series.apiSeriesId]);

      if (result.success && result.data) {
        // Save each player to cache
        for (const player of result.data) {
          if (player.id) {
            const playerData = {
              apiPlayerId: player.id,
              name: player.name,
              fullName: player.name,
              role: player.role,
              battingStyle: player.battingStyle || null,
              bowlingStyle: player.bowlingStyle || null,
              team: player.team,
              country: player.country,
              imageUrl: player.imageUrl || null,
              overallStats: {}
            };
            await cacheService.savePlayerCache(playerData, result.provider);
          }
        }

        await cacheService.recordApiCall();
        console.log(`[Cricket API] ✅ Fetched ${result.data.length} players from all teams`);
        return result.data;
      }

      return [];
    } catch (error) {
      console.error(`[Cricket API] ❌ Error fetching all squads:`, error.message);
      return [];
    }
  }

  /**
   * Get all squads using squad IDs (for Unofficial Cricbuzz)
   * Fetches squads for a specific format only
   * @param {Object} series - Series object
   * @param {string} format - Format to fetch (Test/ODI/T20)
   * @returns {Array} List of all players
   */
  async getAllSquadsFromSquadIds(series, format = 'ODI') {
    const allPlayers = [];
    const providerInstance = apiSelector.providers?.unofficial;
    
    if (!providerInstance) {
      throw new Error('Unofficial Cricbuzz provider not available');
    }

    const rawSeriesId = series.apiSeriesId;
    
    console.log(`[Cricket API] 📋 Fetching ${format} squads for series ${rawSeriesId}...`);
    
    // Fetch squads for this series to get format-specific squadIds
    const squadsByFormat = await providerInstance.fetchSquadsBySeries(rawSeriesId);
    const formatSquads = squadsByFormat[format] || [];
    
    if (formatSquads.length === 0) {
      console.log(`[Cricket API] ⚠️  No squads found for ${format} format`);
      return [];
    }
    
    console.log(`[Cricket API] ✅ Found ${formatSquads.length} ${format} squads`);
    
    for (const squad of formatSquads) {
      try {
        const players = await providerInstance.fetchPlayersBySquad(rawSeriesId, squad.squadId);
        
        // Add team info to each player
        const playersWithTeam = players.map(p => ({
          ...p,
          team: p.team || squad.teamName || series.teams[0] || 'Unknown'
        }));
        
        allPlayers.push(...playersWithTeam);
        
        // Save each player to cache
        for (const player of playersWithTeam) {
          if (player.apiPlayerId) {
            const playerData = {
              apiPlayerId: player.apiPlayerId,
              name: player.name,
              fullName: player.name,
              role: player.role,
              battingStyle: player.battingStyle || null,
              bowlingStyle: player.bowlingStyle || null,
              team: player.team,
              country: player.country || player.team,
              imageUrl: player.imageUrl || null,
              overallStats: {}
            };
            await cacheService.savePlayerCache(playerData, 'unofficial');
          }
        }
        
        await cacheService.recordApiCall();
        console.log(`[Cricket API] ✅ Fetched ${players.length} players from ${squad.teamName}`);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`[Cricket API] ❌ Error fetching squad ${squad.squadId}:`, error.message);
      }
    }
    
    console.log(`[Cricket API] ✅ Total: ${allPlayers.length} players from ${formatSquads.length} squads`);
    return allPlayers;
  }

  /**
   * Check if squad data is available for a series
   * This prevents tournament creation for series without player rosters
   * @param {string} seriesId - MongoDB series ID
   * @param {string} format - Format to check (Test/ODI/T20)
   * @returns {Promise<{available: boolean, playerCount: number, message: string}>}
   */
  async checkSquadAvailability(seriesId, format = 'ODI') {
    try {
      console.log(`[Cricket API] 🔍 Checking ${format} squad availability for series ${seriesId}...`);

      const players = await this.getAllSquads(seriesId, format);
      
      if (players && players.length > 0) {
        console.log(`[Cricket API] ✅ Squad available: ${players.length} players found`);
        return {
          available: true,
          playerCount: players.length,
          message: `${players.length} players available`
        };
      } else {
        console.log(`[Cricket API] ❌ Squad not available for series ${seriesId}`);
        return {
          available: false,
          playerCount: 0,
          message: 'Squad not yet released for this series'
        };
      }

    } catch (error) {
      console.error(`[Cricket API] ❌ Error checking squad availability:`, error.message);
      return {
        available: false,
        playerCount: 0,
        message: 'Unable to verify squad availability'
      };
    }
  }

  /**
   * Get player statistics by player name
   * @param {string} playerName - Player's full name
   * @param {string} playerRole - Player's role (Batsman, Bowler, All-Rounder, Wicket-Keeper)
   * @param {string} playerTeam - Player's team (e.g., "Pakistan", "South Africa")
   * @param {string} format - Match format (T20, ODI, Test) for format-specific stats
   * @returns {Object} Player statistics or null
   */
  async getPlayerStats(playerName, playerRole = 'Batsman', playerTeam = 'Unknown', format = 'ODI') {
    try {
      // Check cache first (cache key includes format for format-specific caching)
      const cacheKey = `${playerName}_${format}`;
      const cached = await cacheService.getPlayerByName(playerName);
      if (cached && cached.overallStats && Object.keys(cached.overallStats).length > 0) {
        console.log(`[Cricket API] ✅ Using cached stats for ${playerName}`);
        // Extract format-specific stats from cached data
        return this.extractFormatStats(cached.overallStats, format);
      }

      // Ensure API selector is initialized
      await apiSelector.initialize();

      // Get CricketData provider (REPLACED RapidAPI with CricketData)
      const cricketdataProvider = apiSelector.providers?.cricketdata;
      if (!cricketdataProvider || !cricketdataProvider.isEnabled) {
        console.log(`[Cricket API] ⚠️  CricketData not available - skipping stats for ${playerName}`);
        return null;
      }

      // Check quota before attempting
      const hasQuota = await apiUsageTracker.hasQuota('cricketdata');
      if (!hasQuota) {
        console.log(`[Cricket API] ⚠️  CricketData quota exhausted - skipping stats for ${playerName}`);
        return null;
      }

      // Use fetchPlayerStatsByName which handles search + stats internally
      // Pass format to get format-specific stats
      const stats = await cricketdataProvider.fetchPlayerStatsByName(playerName, format);
      
      if (stats) {
        console.log(`[Cricket API] ✅ Got ${format} stats for ${playerName} from CricketData`);
        
        // Cache stats with role, team, and country
        await cacheService.savePlayerCache({
          apiPlayerId: `cricketdata_${playerName.replace(/\s+/g, '_')}`,
          name: playerName,
          fullName: playerName,
          role: playerRole,
          team: playerTeam,
          country: playerTeam, // For international cricket, country = team
          overallStats: stats
        }, 'cricketdata');
        
        await cacheService.recordApiCall();
        return stats;
      }

      console.log(`[Cricket API] ⚠️  No stats found for ${playerName} in CricketData`);
      return null;

    } catch (error) {
      console.error(`[Cricket API] ⚠️  Error fetching stats for ${playerName}:`, error.message);
      return null;
    }
  }

  /**
   * Extract format-specific stats from overall stats
   * @param {Object} overallStats - Complete player stats with all formats
   * @param {string} format - Format to extract (T20, ODI, Test)
   * @returns {Object} Format-specific stats
   */
  extractFormatStats(overallStats, format) {
    if (!overallStats) return null;
    
    const normalizedFormat = (format || 'ODI').toUpperCase();
    
    // If stats already have format-specific data, return it
    if (overallStats.format === normalizedFormat) {
      return overallStats;
    }
    
    // If stats have batting/bowling with format breakdown, extract it
    if (overallStats.batting && overallStats.batting[normalizedFormat]) {
      return {
        batting: overallStats.batting[normalizedFormat],
        bowling: overallStats.bowling ? overallStats.bowling[normalizedFormat] : {},
        format: normalizedFormat
      };
    }
    
    // Otherwise return overall stats (better than nothing)
    return overallStats;
  }

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
              battingStyle: player.battingStyle || null,
              bowlingStyle: player.bowlingStyle || null,
              team: player.team,
              country: player.country,
              imageUrl: player.imageUrl || null,
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

