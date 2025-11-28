const { PrismaClient } = require('@prisma/client');
const zlib = require('zlib');
const { promisify } = require('util');

const prisma = new PrismaClient();
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Cache Service
 * Manages all caching logic with smart TTL and expiration
 */
class CacheService {
  constructor() {
    // TTL Configuration (in milliseconds)
    this.TTL = {
      series: {
        upcoming: 24 * 60 * 60 * 1000,      // 24 hours
        live: 6 * 60 * 60 * 1000,           // 6 hours
        completed: Infinity                  // Never expire
      },
      match: {
        upcoming: 60 * 60 * 1000,           // 1 hour
        live: 2 * 60 * 1000,                // 2 minutes
        completed: Infinity                  // Never expire
      },
      player: 7 * 24 * 60 * 60 * 1000,      // 7 days
      liveScore: {
        live: 30 * 1000,                    // 30 seconds
        completed: Infinity,
        upcoming: 60 * 60 * 1000            // 1 hour
      }
    };
  }

  // ========================================
  // SERIES CACHE
  // ========================================

  async getSeriesCache(apiSeriesId) {
    try {
      const cached = await prisma.seriesCache.findUnique({
        where: { apiSeriesId }
      });

      if (!cached) {
        console.log(`[Cache] ❌ Series ${apiSeriesId} - MISS`);
        return null;
      }

      if (this.isExpired(cached.expiresAt)) {
        console.log(`[Cache] ⏰ Series ${apiSeriesId} - EXPIRED`);
        await this.deleteSeriesCache(apiSeriesId);
        return null;
      }

      console.log(`[Cache] ✅ Series ${apiSeriesId} - HIT`);
      await this.recordCacheHit();
      return this.parseSeriesCache(cached);
    } catch (error) {
      console.error('[Cache] Error getting series cache:', error);
      return null;
    }
  }

  async getAllSeriesCache() {
    try {
      const cached = await prisma.seriesCache.findMany({
        where: {
          expiresAt: { gte: new Date() }
        },
        orderBy: { startDate: 'desc' }
      });

      if (cached.length === 0) {
        console.log('[Cache] ❌ All series - MISS');
        return null;
      }

      console.log(`[Cache] ✅ All series - HIT (${cached.length} items)`);
      await this.recordCacheHit();
      return cached.map(item => this.parseSeriesCache(item));
    } catch (error) {
      console.error('[Cache] Error getting all series cache:', error);
      return null;
    }
  }

  async saveSeriesCache(seriesData, apiSource) {
    try {
      const ttl = this.getTTL('series', seriesData.status);
      const expiresAt = ttl === Infinity ? new Date('2099-12-31') : new Date(Date.now() + ttl);

      await prisma.seriesCache.upsert({
        where: { apiSeriesId: seriesData.apiSeriesId },
        update: {
          ...seriesData,
          apiSource,
          teams: JSON.stringify(seriesData.teams),
          metadata: JSON.stringify(seriesData.metadata),
          cachedAt: new Date(),
          expiresAt
        },
        create: {
          ...seriesData,
          apiSource,
          teams: JSON.stringify(seriesData.teams),
          metadata: JSON.stringify(seriesData.metadata),
          cachedAt: new Date(),
          expiresAt
        }
      });

      console.log(`[Cache] 💾 Saved series ${seriesData.apiSeriesId}`);
    } catch (error) {
      console.error('[Cache] Error saving series cache:', error);
    }
  }

  async deleteSeriesCache(apiSeriesId) {
    try {
      await prisma.seriesCache.delete({
        where: { apiSeriesId }
      });
    } catch (error) {
      // Ignore if not found
    }
  }

  parseSeriesCache(cached) {
    return {
      ...cached,
      teams: JSON.parse(cached.teams),
      metadata: cached.metadata ? JSON.parse(cached.metadata) : {}
    };
  }

  // ========================================
  // MATCH CACHE
  // ========================================

  async getMatchCache(apiMatchId) {
    try {
      const cached = await prisma.matchCache.findUnique({
        where: { apiMatchId }
      });

      if (!cached) {
        console.log(`[Cache] ❌ Match ${apiMatchId} - MISS`);
        return null;
      }

      if (this.isExpired(cached.expiresAt)) {
        console.log(`[Cache] ⏰ Match ${apiMatchId} - EXPIRED`);
        await this.deleteMatchCache(apiMatchId);
        return null;
      }

      console.log(`[Cache] ✅ Match ${apiMatchId} - HIT`);
      await this.recordCacheHit();
      return this.parseMatchCache(cached);
    } catch (error) {
      console.error('[Cache] Error getting match cache:', error);
      return null;
    }
  }

  async getMatchesBySeriesCache(apiSeriesId) {
    try {
      const cached = await prisma.matchCache.findMany({
        where: {
          apiSeriesId,
          expiresAt: { gte: new Date() }
        },
        orderBy: { matchDate: 'asc' }
      });

      if (cached.length === 0) {
        console.log(`[Cache] ❌ Matches for series ${apiSeriesId} - MISS`);
        return null;
      }

      console.log(`[Cache] ✅ Matches for series ${apiSeriesId} - HIT (${cached.length} items)`);
      await this.recordCacheHit();
      return cached.map(item => this.parseMatchCache(item));
    } catch (error) {
      console.error('[Cache] Error getting matches cache:', error);
      return null;
    }
  }

  async saveMatchCache(matchData, apiSource) {
    try {
      const ttl = this.getTTL('match', matchData.status);
      const expiresAt = ttl === Infinity ? new Date('2099-12-31') : new Date(Date.now() + ttl);

      await prisma.matchCache.upsert({
        where: { apiMatchId: matchData.apiMatchId },
        update: {
          ...matchData,
          apiSource,
          metadata: JSON.stringify(matchData.metadata),
          cachedAt: new Date(),
          expiresAt
        },
        create: {
          ...matchData,
          apiSource,
          metadata: JSON.stringify(matchData.metadata),
          cachedAt: new Date(),
          expiresAt
        }
      });

      console.log(`[Cache] 💾 Saved match ${matchData.apiMatchId}`);
    } catch (error) {
      console.error('[Cache] Error saving match cache:', error);
    }
  }

  async deleteMatchCache(apiMatchId) {
    try {
      await prisma.matchCache.delete({
        where: { apiMatchId }
      });
    } catch (error) {
      // Ignore if not found
    }
  }

  parseMatchCache(cached) {
    return {
      ...cached,
      metadata: cached.metadata ? JSON.parse(cached.metadata) : {}
    };
  }

  // ========================================
  // PLAYER CACHE
  // ========================================

  async getPlayerCache(apiPlayerId) {
    try {
      const cached = await prisma.playerCache.findUnique({
        where: { apiPlayerId }
      });

      if (!cached) {
        console.log(`[Cache] ❌ Player ${apiPlayerId} - MISS`);
        return null;
      }

      if (this.isExpired(cached.expiresAt)) {
        console.log(`[Cache] ⏰ Player ${apiPlayerId} - EXPIRED`);
        await this.deletePlayerCache(apiPlayerId);
        return null;
      }

      console.log(`[Cache] ✅ Player ${apiPlayerId} - HIT`);
      await this.recordCacheHit();
      return this.parsePlayerCache(cached);
    } catch (error) {
      console.error('[Cache] Error getting player cache:', error);
      return null;
    }
  }

  async getPlayerByName(playerName) {
    try {
      const cached = await prisma.playerCache.findFirst({
        where: { name: playerName }
      });

      if (!cached) {
        console.log(`[Cache] ❌ Player ${playerName} - MISS`);
        return null;
      }

      if (this.isExpired(cached.expiresAt)) {
        console.log(`[Cache] ⏰ Player ${playerName} - EXPIRED`);
        await this.deletePlayerCache(cached.apiPlayerId);
        return null;
      }

      console.log(`[Cache] ✅ Player ${playerName} - HIT (cached stats)`);
      await this.recordCacheHit();
      return this.parsePlayerCache(cached);
    } catch (error) {
      console.error('[Cache] Error getting player by name:', error);
      return null;
    }
  }

  async savePlayerCache(playerData, apiSource) {
    try {
      const ttl = this.TTL.player;
      const expiresAt = new Date(Date.now() + ttl);

      await prisma.playerCache.upsert({
        where: { apiPlayerId: playerData.apiPlayerId },
        update: {
          ...playerData,
          apiSource,
          overallStats: JSON.stringify(playerData.overallStats),
          cachedAt: new Date(),
          expiresAt
        },
        create: {
          ...playerData,
          apiSource,
          overallStats: JSON.stringify(playerData.overallStats),
          cachedAt: new Date(),
          expiresAt
        }
      });

      console.log(`[Cache] 💾 Saved player ${playerData.apiPlayerId}`);
    } catch (error) {
      console.error('[Cache] Error saving player cache:', error);
    }
  }

  async deletePlayerCache(apiPlayerId) {
    try {
      await prisma.playerCache.delete({
        where: { apiPlayerId }
      });
    } catch (error) {
      // Ignore if not found
    }
  }

  parsePlayerCache(cached) {
    return {
      ...cached,
      overallStats: cached.overallStats ? JSON.parse(cached.overallStats) : {}
    };
  }

  // ========================================
  // LIVE SCORE CACHE
  // ========================================

  async getLiveScoreCache(apiMatchId) {
    try {
      const cached = await prisma.liveScoreCache.findUnique({
        where: { apiMatchId }
      });

      if (!cached) {
        console.log(`[Cache] ❌ Live score ${apiMatchId} - MISS`);
        return null;
      }

      if (this.isExpired(cached.expiresAt)) {
        console.log(`[Cache] ⏰ Live score ${apiMatchId} - EXPIRED`);
        return null; // Don't delete, just return null
      }

      console.log(`[Cache] ✅ Live score ${apiMatchId} - HIT`);
      await this.recordCacheHit();
      return this.parseLiveScoreCache(cached);
    } catch (error) {
      console.error('[Cache] Error getting live score cache:', error);
      return null;
    }
  }

  async saveLiveScoreCache(matchId, scorecardData, apiSource, status = 'live') {
    try {
      const ttl = this.getTTL('liveScore', status);
      const expiresAt = ttl === Infinity ? new Date('2099-12-31') : new Date(Date.now() + ttl);

      // Compress scorecard for storage
      const scorecardString = JSON.stringify(scorecardData);
      
      await prisma.liveScoreCache.upsert({
        where: { apiMatchId: matchId },
        update: {
          apiSource,
          scorecard: scorecardString,
          isCompressed: false,
          currentInning: scorecardData.currentInning,
          team1Score: scorecardData.team1Score,
          team2Score: scorecardData.team2Score,
          currentOver: scorecardData.currentOver,
          recentBalls: JSON.stringify(scorecardData.recentBalls),
          lastBallTime: scorecardData.lastBallTime || new Date(),
          cachedAt: new Date(),
          expiresAt
        },
        create: {
          apiMatchId: matchId,
          apiSource,
          scorecard: scorecardString,
          isCompressed: false,
          currentInning: scorecardData.currentInning,
          team1Score: scorecardData.team1Score,
          team2Score: scorecardData.team2Score,
          currentOver: scorecardData.currentOver,
          recentBalls: JSON.stringify(scorecardData.recentBalls),
          lastBallTime: scorecardData.lastBallTime || new Date(),
          cachedAt: new Date(),
          expiresAt
        }
      });

      console.log(`[Cache] 💾 Saved live score ${matchId}`);
    } catch (error) {
      console.error('[Cache] Error saving live score cache:', error);
    }
  }

  parseLiveScoreCache(cached) {
    return {
      matchId: cached.apiMatchId,
      scorecard: JSON.parse(cached.scorecard),
      currentInning: cached.currentInning,
      team1Score: cached.team1Score,
      team2Score: cached.team2Score,
      currentOver: cached.currentOver,
      recentBalls: cached.recentBalls ? JSON.parse(cached.recentBalls) : [],
      lastBallTime: cached.lastBallTime,
      cachedAt: cached.cachedAt
    };
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  getTTL(dataType, status) {
    const ttlConfig = this.TTL[dataType];
    if (!ttlConfig) return 60 * 60 * 1000; // Default 1 hour

    if (typeof ttlConfig === 'number') {
      return ttlConfig;
    }

    return ttlConfig[status] || ttlConfig.upcoming || 60 * 60 * 1000;
  }

  isExpired(expiresAt) {
    if (!expiresAt) return true;
    if (expiresAt.getFullYear() >= 2099) return false; // Infinity marker
    return new Date() > new Date(expiresAt);
  }

  async recordCacheHit() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.cacheStatistics.upsert({
        where: { date: today },
        update: {
          cacheHits: { increment: 1 }
        },
        create: {
          date: today,
          cacheHits: 1,
          cacheMisses: 0,
          apiCalls: 0
        }
      });
    } catch (error) {
      console.error('[Cache] Error recording cache hit:', error);
    }
  }

  async recordCacheMiss() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.cacheStatistics.upsert({
        where: { date: today },
        update: {
          cacheMisses: { increment: 1 }
        },
        create: {
          date: today,
          cacheHits: 0,
          cacheMisses: 1,
          apiCalls: 0
        }
      });
    } catch (error) {
      console.error('[Cache] Error recording cache miss:', error);
    }
  }

  async recordApiCall() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.cacheStatistics.upsert({
        where: { date: today },
        update: {
          apiCalls: { increment: 1 }
        },
        create: {
          date: today,
          cacheHits: 0,
          cacheMisses: 0,
          apiCalls: 1
        }
      });
    } catch (error) {
      console.error('[Cache] Error recording API call:', error);
    }
  }

  // ========================================
  // STATISTICS METHODS
  // ========================================

  async getTodayStatistics() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = await prisma.cacheStatistics.findFirst({
        where: {
          date: { gte: today }
        }
      });

      if (!stats) {
        return {
          cacheHits: 0,
          cacheMisses: 0,
          apiCalls: 0
        };
      }

      return {
        cacheHits: stats.cacheHits,
        cacheMisses: stats.cacheMisses,
        apiCalls: stats.apiCalls
      };
    } catch (error) {
      console.error('[Cache] Error getting today statistics:', error);
      return {
        cacheHits: 0,
        cacheMisses: 0,
        apiCalls: 0
      };
    }
  }

  // ========================================
  // CLEANUP METHODS
  // ========================================

  async cleanExpiredCache() {
    try {
      const now = new Date();
      
      const deletedSeries = await prisma.seriesCache.deleteMany({
        where: {
          expiresAt: { lt: now }
        }
      });

      const deletedMatches = await prisma.matchCache.deleteMany({
        where: {
          expiresAt: { lt: now }
        }
      });

      const deletedPlayers = await prisma.playerCache.deleteMany({
        where: {
          expiresAt: { lt: now }
        }
      });

      // Delete old live scores (> 30 days old)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const deletedScores = await prisma.liveScoreCache.deleteMany({
        where: {
          cachedAt: { lt: thirtyDaysAgo }
        }
      });

      console.log('[Cache] 🧹 Cleanup complete:', {
        series: deletedSeries.count,
        matches: deletedMatches.count,
        players: deletedPlayers.count,
        scores: deletedScores.count
      });

      return {
        series: deletedSeries.count,
        matches: deletedMatches.count,
        players: deletedPlayers.count,
        scores: deletedScores.count
      };
    } catch (error) {
      console.error('[Cache] Error cleaning cache:', error);
      return { error: error.message };
    }
  }
}

module.exports = new CacheService();

