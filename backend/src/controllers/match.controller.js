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
              isProcessed: playerScores.length > 0,
              playerCount: playerScores.length,
              manOfMatchPlayerId: match.manOfMatchPlayerId,
              manOfMatchName: match.manOfMatchName
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

          if (!match) {
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
          } else {
            // Update existing Match record with latest status from API
            // This ensures status changes (upcoming → completed) are reflected in DB
            if (match.status !== apiMatch.status && apiMatch.status) {
              console.log(`   🔄 Updating match ${match.id} status: ${match.status} → ${apiMatch.status}`);
              match = await prisma.match.update({
                where: { id: match.id },
                data: { 
                  status: apiMatch.status,
                  matchDesc: matchDesc || match.matchDesc // Update matchDesc if available
                }
              });
            }
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
            playerCount: playerScores.length,
            manOfMatchPlayerId: match.manOfMatchPlayerId,
            manOfMatchName: match.manOfMatchName
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

      // Check if Man of the Match is selected
      if (!match.manOfMatchPlayerId) {
        return res.status(400).json({
          success: false,
          error: 'Please select Man of the Match before calculating points'
        });
      }

      // Process match using scorecard processor service
      const result = await scorecardProcessorService.processMatch(
        tournamentId,
        matchId,
        match.externalMatchId,
        match.manOfMatchPlayerId // Pass MoM player ID
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
  },

  /**
   * Set Man of the Match for a match
   */
  async setManOfMatch(req, res) {
    try {
      const { matchId } = req.params;
      const { playerId, playerName } = req.body;

      console.log(`[Match Controller] Setting Man of Match for match ${matchId}:`);
      console.log(`   Player ID: ${playerId}`);
      console.log(`   Player Name: ${playerName}`);

      // Get match
      const match = await prisma.match.findUnique({
        where: { id: matchId }
      });

      if (!match) {
        return res.status(404).json({
          success: false,
          error: 'Match not found'
        });
      }

      // Check if match is completed
      if (match.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Can only set Man of Match for completed matches'
        });
      }

      // Check if fantasy points already calculated
      const existingScores = await prisma.matchPlayerScore.findMany({
        where: { matchId }
      });

      if (existingScores.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot change Man of Match after fantasy points are calculated'
        });
      }

      // Update match with MoM
      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: {
          manOfMatchPlayerId: playerId,
          manOfMatchName: playerName
        }
      });

      console.log(`[Match Controller] ✅ Man of Match set: ${playerName}`);

      res.json({
        success: true,
        message: `Man of Match set to ${playerName}`,
        data: {
          matchId,
          manOfMatchPlayerId: playerId,
          manOfMatchName: playerName
        }
      });
    } catch (error) {
      console.error('[Match Controller] ❌ Error setting Man of Match:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to set Man of Match'
      });
    }
  },

  /**
   * Set Player of the Series for a tournament
   */
  async setPlayerOfSeries(req, res) {
    try {
      const { tournamentId } = req.params;
      const { playerId, playerName } = req.body;

      console.log(`[Match Controller] Setting Player of Series for tournament ${tournamentId}:`);
      console.log(`   Player ID: ${playerId}`);
      console.log(`   Player Name: ${playerName}`);

      // Get tournament
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId }
      });

      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found'
        });
      }

      // Get all matches for this tournament's series
      const matches = await prisma.match.findMany({
        where: { seriesId: tournament.seriesId }
      });

      // Check if all matches are completed
      const allCompleted = matches.every(m => m.status === 'completed');
      if (!allCompleted) {
        return res.status(400).json({
          success: false,
          error: 'Can only set Player of Series after all matches are completed'
        });
      }

      // Update tournament with PoTS (don't apply bonus yet)
      const updatedTournament = await prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          playerOfSeriesId: playerId,
          playerOfSeriesName: playerName
        }
      });

      console.log(`[Match Controller] ✅ Player of Series set: ${playerName}`);

      res.json({
        success: true,
        message: `Player of Series set to ${playerName}`,
        data: {
          tournamentId,
          playerOfSeriesId: playerId,
          playerOfSeriesName: playerName
        }
      });
    } catch (error) {
      console.error('[Match Controller] ❌ Error setting Player of Series:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to set Player of Series'
      });
    }
  },

  /**
   * Apply Player of the Series bonus to all scores
   */
  async applyPlayerOfSeriesBonus(req, res) {
    try {
      const { tournamentId } = req.params;

      console.log(`[Match Controller] Applying Player of Series bonus for tournament ${tournamentId}`);

      // Get tournament
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId }
      });

      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found'
        });
      }

      if (!tournament.playerOfSeriesId) {
        return res.status(400).json({
          success: false,
          error: 'Please select Player of Series first'
        });
      }

      if (tournament.playerOfSeriesApplied) {
        return res.status(400).json({
          success: false,
          error: 'Player of Series bonus has already been applied'
        });
      }

      // Get award rules
      const awardRules = JSON.parse(tournament.awardRules);
      const potsBonus = awardRules.playerOfTheSeries || 100;

      // Find all TeamPlayers with this playerId across all teams in this tournament
      const teams = await prisma.team.findMany({
        where: { tournamentId },
        include: {
          players: true
        }
      });

      let updatedCount = 0;

      for (const team of teams) {
        // Find the team player matching the PoTS
        const potsPlayer = team.players.find(p => p.playerId === tournament.playerOfSeriesId);
        
        if (potsPlayer) {
          // Get all match scores for this team player
          const matchScores = await prisma.matchPlayerScore.findMany({
            where: { teamPlayerId: potsPlayer.id }
          });

          // Add PoTS bonus to the last match score (or first if only one)
          if (matchScores.length > 0) {
            // Add bonus to the last match
            const lastScore = matchScores[matchScores.length - 1];
            await prisma.matchPlayerScore.update({
              where: { id: lastScore.id },
              data: {
                fantasyPoints: lastScore.fantasyPoints + potsBonus
              }
            });
            updatedCount++;
            console.log(`   ✅ Added ${potsBonus} PoTS bonus to ${potsPlayer.playerName} in team ${team.name}`);
          }
        }
      }

      // Mark as applied and set tournament status to 'completed'
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { 
          playerOfSeriesApplied: true,
          status: 'completed'  // Tournament is now fully complete
        }
      });

      console.log(`[Match Controller] ✅ Player of Series bonus applied to ${updatedCount} team(s)`);
      console.log(`[Match Controller] 🏆 Tournament status set to 'completed'`);

      res.json({
        success: true,
        message: `Player of Series bonus (${potsBonus} points) applied to ${tournament.playerOfSeriesName}`,
        data: {
          playerName: tournament.playerOfSeriesName,
          bonusPoints: potsBonus,
          teamsUpdated: updatedCount
        }
      });
    } catch (error) {
      console.error('[Match Controller] ❌ Error applying Player of Series bonus:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to apply Player of Series bonus'
      });
    }
  }
};

module.exports = matchController;

