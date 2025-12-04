const { PrismaClient } = require('@prisma/client');
const cricketApiService = require('../services/cricket-api');
const scorecardProcessorService = require('../services/scorecard-processor.service');

const prisma = new PrismaClient();

const matchController = {
  /**
   * Get all matches for a series (from cache/API)
   */
  async getSeriesMatches(req, res) {
    try {
      const { seriesId } = req.params;
      console.log(`[Match Controller] Fetching matches for series ${seriesId}...`);

      // Fetch from new cricket API service (uses cache + fallback)
      const matches = await cricketApiService.getMatchesBySeries(seriesId);

      if (!matches || matches.length === 0) {
        console.log(`[Match Controller] ⚠️  No matches found for series ${seriesId}`);
        return res.json({
          success: true,
          data: []
        });
      }

      console.log(`[Match Controller] ✅ Returning ${matches.length} matches`);

      res.json({
        success: true,
        data: matches
      });
    } catch (error) {
      console.error('[Match Controller] ❌ Error fetching matches:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch matches' 
      });
    }
  },

  /**
   * Get match details by ID (from cache/API)
   */
  async getMatchDetails(req, res) {
    try {
      const { id } = req.params;
      console.log(`[Match Controller] Fetching match ${id}...`);

      // Fetch from cricket API service
      const match = await cricketApiService.getMatchDetails(id);

      if (!match) {
        console.log(`[Match Controller] ⚠️  Match ${id} not found`);
        return res.status(404).json({ 
          success: false,
          error: 'Match not found' 
        });
      }

      console.log(`[Match Controller] ✅ Match ${id} found`);

      res.json({
        success: true,
        data: match
      });
    } catch (error) {
      console.error('[Match Controller] ❌ Error fetching match:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch match details' 
      });
    }
  },

  /**
   * Get live score for a match
   */
  async getLiveScore(req, res) {
    try {
      const { id } = req.params;
      console.log(`[Match Controller] Fetching live score for match ${id}...`);

      // Fetch live score from cricket API service
      const scorecard = await cricketApiService.getLiveScore(id);

      if (!scorecard) {
        console.log(`[Match Controller] ⚠️  No live score available for match ${id}`);
        return res.status(404).json({
          success: false,
          error: 'Live score not available'
        });
      }

      console.log(`[Match Controller] ✅ Live score retrieved for match ${id}`);

      res.json({
        success: true,
        data: scorecard
      });
    } catch (error) {
      console.error('[Match Controller] ❌ Error fetching live score:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch live score'
      });
    }
  },

  /**
   * Get fantasy match scores (calculated points from our DB)
   */
  async getMatchScores(req, res) {
    try {
      const { id } = req.params;
      console.log(`[Match Controller] Fetching fantasy scores for match ${id}...`);

      // This fetches from our own MatchPlayerScore table (calculated fantasy points)
      const scores = await prisma.matchPlayerScore.findMany({
        where: { matchId: id },
        include: {
          teamPlayer: {
            include: {
              team: {
                include: {
                  user: {
                    select: { id: true, name: true, email: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { fantasyPoints: 'desc' }
      });

      console.log(`[Match Controller] ✅ Found ${scores.length} player scores`);

      res.json({
        success: true,
        data: scores
      });
    } catch (error) {
      console.error('[Match Controller] ❌ Error fetching match scores:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch match scores' 
      });
    }
  },

  /**
   * Get all matches for a tournament (from its series)
   * Also checks if fantasy points have been calculated
   */
  async getTournamentMatches(req, res) {
    try {
      const { tournamentId } = req.params;
      
      console.log(`\n🎯 [Match Controller] getTournamentMatches called`);
      console.log(`   Tournament ID: ${tournamentId}`);

      // Step 1: Get tournament with apiSeriesId
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId }
      });

      if (!tournament) {
        console.log(`   ❌ Tournament not found`);
        return res.status(404).json({
          success: false,
          error: 'Tournament not found'
        });
      }
      console.log(`   ✅ Tournament: ${tournament.name}`);
      console.log(`   API Series ID stored: ${tournament.apiSeriesId || 'NOT STORED'}`);

      // Step 2: Check if refresh is requested
      const shouldRefresh = req.query.refresh === 'true';
      console.log(`   🔄 Refresh requested: ${shouldRefresh}`);

      // Step 3: Default behavior - Load from DB (NO API CALL)
      if (!shouldRefresh) {
        console.log(`   💾 Loading matches from database (no API call)...`);
        const existingMatches = await prisma.match.findMany({
          where: {
            seriesId: tournament.seriesId
          },
          orderBy: {
            matchDate: 'asc'
          }
        });

        console.log(`   ✅ Found ${existingMatches.length} matches in DB`);
        
        // Check each match for fantasy points
        const matchesWithStatus = await Promise.all(
          existingMatches.map(async (match) => {
            const playerScores = await prisma.matchPlayerScore.findMany({
              where: { matchId: match.id }
            });
            
            return {
              id: match.id,
              team1: match.team1,
              team2: match.team2,
              matchDate: match.matchDate,
              venue: match.venue,
              matchDesc: match.matchDesc,
              format: match.format,
              status: match.status,
              externalMatchId: match.externalMatchId,
              isProcessed: playerScores.length > 0
            };
          })
        );

        return res.json({
          success: true,
          data: matchesWithStatus,
          source: 'database'
        });
      }

      // Step 4: Refresh mode - Fetch from API (bypass cache, replace old data)
      console.log(`   📡 Refresh mode: Fetching from Unofficial Cricbuzz API...`);
      console.log(`   Tournament Format: ${tournament.format}`);

      // Validate apiSeriesId exists
      if (!tournament.apiSeriesId) {
        console.log(`   ❌ Old tournament - apiSeriesId not stored. User needs to recreate.`);
        return res.status(400).json({
          success: false,
          error: 'This tournament was created before the apiSeriesId feature. Please create a new tournament.'
        });
      }

      let allMatches = [];
      
      try {
        // Pass forceRefresh=true to bypass cache and get fresh data from API
        allMatches = await cricketApiService.getMatchesBySeries(tournament.apiSeriesId, true);
        if (!allMatches || allMatches.length === 0) {
          console.log(`   ⚠️  API returned no matches, falling back to DB`);
          
          // Return existing DB matches
          const existingMatches = await prisma.match.findMany({
            where: { seriesId: tournament.seriesId },
            orderBy: { matchDate: 'asc' }
          });

          const matchesWithStatus = await Promise.all(
            existingMatches.map(async (match) => {
              const playerScores = await prisma.matchPlayerScore.findMany({
                where: { matchId: match.id }
              });
              return {
                id: match.id,
                team1: match.team1,
                team2: match.team2,
                matchDate: match.matchDate,
                venue: match.venue,
                matchDesc: match.matchDesc,
                format: match.format,
                status: match.status,
                externalMatchId: match.externalMatchId,
                isProcessed: playerScores.length > 0
              };
            })
          );

          return res.json({
            success: true,
            data: matchesWithStatus,
            source: 'database',
            message: 'API returned no matches, showing cached data'
          });
        }
        
        console.log(`   ✅ Found ${allMatches.length} total matches from API`);
      } catch (apiError) {
        console.log(`   ❌ API fetch failed: ${apiError.message}`);
        
        // Return existing DB matches on API error
        const existingMatches = await prisma.match.findMany({
          where: { seriesId: tournament.seriesId },
          orderBy: { matchDate: 'asc' }
        });

        const matchesWithStatus = await Promise.all(
          existingMatches.map(async (match) => {
            const playerScores = await prisma.matchPlayerScore.findMany({
              where: { matchId: match.id }
            });
            return {
              id: match.id,
              team1: match.team1,
              team2: match.team2,
              matchDate: match.matchDate,
              venue: match.venue,
              matchDesc: match.matchDesc,
              format: match.format,
              status: match.status,
              externalMatchId: match.externalMatchId,
              isProcessed: playerScores.length > 0
            };
          })
        );

        return res.json({
          success: true,
          data: matchesWithStatus,
          source: 'database',
          message: `API error: ${apiError.message}`
        });
      }

      // Filter matches by tournament format
      console.log(`   🔍 Filtering matches by format: "${tournament.format}"`);
      
      const matches = allMatches.filter(match => {
        const matchFormat = match.format || match.matchType || '';
        console.log(`      Match: ${match.team1} vs ${match.team2}, Format: "${matchFormat}" → ${matchFormat.toLowerCase().includes(tournament.format.toLowerCase()) ? '✅ MATCH' : '❌ SKIP'}`);
        return matchFormat.toLowerCase().includes(tournament.format.toLowerCase());
      });

      console.log(`   🎯 Filtered to ${matches.length} ${tournament.format} matches`);

      if (matches.length === 0) {
        console.log(`   ⚠️  No ${tournament.format} matches found for this series`);
        return res.json({
          success: true,
          data: []
        });
      }

      // Step 4: Check which matches have fantasy points calculated
      const matchesWithStatus = await Promise.all(
        matches.map(async (apiMatch, index) => {
          // Try to find Match record in database
          let match = await prisma.match.findFirst({
            where: { 
              externalMatchId: apiMatch.apiMatchId 
            }
          });

          if (!match) {
            // Extract matchDesc from metadata if available
            let matchDesc = null;
            if (apiMatch.metadata) {
              try {
                const metadata = typeof apiMatch.metadata === 'string' 
                  ? JSON.parse(apiMatch.metadata) 
                  : apiMatch.metadata;
                matchDesc = metadata.matchDesc || null;
              } catch (e) {
                console.warn('   ⚠️  Could not parse match metadata');
              }
            }

            // Create Match record for tracking
            match = await prisma.match.create({
              data: {
                seriesId: tournament.seriesId,
                matchNumber: index + 1,
                matchDesc: matchDesc, // "1st ODI", "2nd Test", etc.
                team1: apiMatch.team1,
                team2: apiMatch.team2,
                matchDate: apiMatch.date || new Date(),
                venue: apiMatch.venue || 'TBD',
                format: apiMatch.format || tournament.format, // Save format from API or use tournament format
                status: apiMatch.status || 'upcoming',
                externalMatchId: apiMatch.apiMatchId
              }
            });
          }

          // Check if fantasy points calculated (by checking if MatchPlayerScore records exist)
          const playerScores = await prisma.matchPlayerScore.findMany({
            where: { matchId: match.id }
          });

          const isProcessed = playerScores.length > 0;

          return {
            id: match.id,
            apiMatchId: apiMatch.apiMatchId,
            matchDesc: match.matchDesc || apiMatch.matchDesc || null, // Include matchDesc
            team1: apiMatch.team1,
            team2: apiMatch.team2,
            date: apiMatch.date,
            venue: apiMatch.venue,
            status: apiMatch.status,
            result: apiMatch.result || null,
            isProcessed,
            playerCount: playerScores.length
          };
        })
      );

      console.log(`   ✅ SUCCESS: Returning ${matchesWithStatus.length} matches\n`);

      return res.json({
        success: true,
        data: matchesWithStatus
      });
    } catch (error) {
      console.error('\n❌ [Match Controller] ERROR in getTournamentMatches:');
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
      console.error('   Tournament ID:', req.params.tournamentId);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch tournament matches'
      });
    }
  },

  /**
   * Calculate fantasy points for a match
   * Fetches scorecard from API and processes it
   */
  async calculateMatchPoints(req, res) {
    try {
      const { tournamentId, matchId } = req.params;
      console.log(`[Match Controller] Calculate points request:`);
      console.log(`   Tournament: ${tournamentId}`);
      console.log(`   Match: ${matchId}`);

      // Get match details
      const match = await prisma.match.findUnique({
        where: { id: matchId }
      });

      if (!match) {
        return res.status(404).json({
          success: false,
          error: 'Match not found'
        });
      }

      if (!match.externalMatchId) {
        return res.status(400).json({
          success: false,
          error: 'Match does not have external API ID'
        });
      }

      // Check if match is completed
      if (match.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Can only calculate points for completed matches'
        });
      }

      // Process match using scorecard processor service
      const result = await scorecardProcessorService.processMatch(
        tournamentId,
        matchId,
        match.externalMatchId
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[Match Controller] ❌ Error calculating match points:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to calculate match points'
      });
    }
  }
};

module.exports = matchController;

