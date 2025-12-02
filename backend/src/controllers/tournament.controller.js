const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { getDefaultScoringRules, generateTournamentCode } = require('../utils/tournament.utils');
const auctionService = require('../services/auction.service');
const { calculateLeaderboard } = require('../services/scoring.service');
const leaderboardService = require('../services/leaderboard.service');
const cricketApiService = require('../services/cricket-api');

const prisma = new PrismaClient();

const tournamentController = {
  async createTournament(req, res) {
    try {
      const { name, seriesId, format, scoringRules, bidTimer } = req.body;
      const userId = req.userId;

      // Validate format
      if (!format || !['Test', 'ODI', 'T20'].includes(format)) {
        return res.status(400).json({ error: 'Invalid format. Must be Test, ODI, or T20' });
      }

      // Validate series exists (now in SeriesCache)
      const series = await prisma.seriesCache.findUnique({ where: { id: seriesId } });
      if (!series) {
        return res.status(404).json({ error: 'Series not found' });
      }

      // Check if squad data is available for this series format
      console.log(`🔍 Checking ${format} squad availability for series: ${series.name}`);
      const squadCheck = await cricketApiService.checkSquadAvailability(seriesId, format);
      
      if (!squadCheck.available) {
        console.log(`❌ ${format} squad not available for series: ${series.name}`);
        return res.status(400).json({ 
          error: 'Squad data not available',
          message: squadCheck.message,
          details: `${format} squad data is not yet available for this series. Please try a different format or series.`
        });
      }

      console.log(`✅ ${format} squad available: ${squadCheck.playerCount} players found`);

      // Generate unique tournament code
      const code = generateTournamentCode();

      // Get default rules or use provided ones
      const rules = scoringRules || getDefaultScoringRules();

      // Create tournament - store apiSeriesId so it never expires
      const tournament = await prisma.tournament.create({
        data: {
          name,
          code,
          seriesId,
          apiSeriesId: series.apiSeriesId,  // Store API ID permanently
          seriesName: series.name,           // Store series name
          format, // Store selected format
          creatorId: userId,
          bidTimer: bidTimer || 30, // Default to 30 seconds if not provided
          battingRules: JSON.stringify(rules.batting),
          bowlingRules: JSON.stringify(rules.bowling),
          fieldingRules: JSON.stringify(rules.fielding),
          captainRules: JSON.stringify(rules.captain),
          awardRules: JSON.stringify(rules.awards),
          compositionRules: JSON.stringify(rules.composition)
        }
      });

      // Add creator as first participant
      await prisma.tournamentParticipant.create({
        data: {
          tournamentId: tournament.id,
          userId
        }
      });

      // Create team for creator
      await prisma.team.create({
        data: {
          tournamentId: tournament.id,
          userId,
          name: `${req.userEmail}'s Team`,
          walletBalance: tournament.walletAmount
        }
      });

      // 🆕 NEW: Fetch and save matches during tournament creation
      console.log(`\n🏏 [Tournament Creation] Fetching matches for series...`);
      try {
        const allMatches = await cricketApiService.getMatchesBySeries(series.apiSeriesId);
        
        if (allMatches && allMatches.length > 0) {
          console.log(`   ✅ Found ${allMatches.length} total matches from API`);
          
          // Filter matches by tournament format
          const matches = allMatches.filter(match => {
            const matchFormat = match.format || match.matchType || '';
            return matchFormat.toLowerCase().includes(format.toLowerCase());
          });
          
          console.log(`   🔍 Filtered to ${matches.length} ${format} matches`);
          
          // Save matches to database
          let savedCount = 0;
          for (let i = 0; i < matches.length; i++) {
            const apiMatch = matches[i];
            
            // Extract matchDesc from metadata if available
            let matchDesc = null;
            if (apiMatch.metadata) {
              try {
                const metadata = typeof apiMatch.metadata === 'string' 
                  ? JSON.parse(apiMatch.metadata) 
                  : apiMatch.metadata;
                matchDesc = metadata.matchDesc || null;
              } catch (e) {
                // Ignore metadata parse errors
              }
            }
            
            // Check if match already exists
            const existingMatch = await prisma.match.findFirst({
              where: { externalMatchId: apiMatch.apiMatchId }
            });
            
            if (!existingMatch) {
              await prisma.match.create({
                data: {
                  seriesId: tournament.seriesId,
                  matchNumber: i + 1,
                  matchDesc: matchDesc,
                  team1: apiMatch.team1,
                  team2: apiMatch.team2,
                  venue: apiMatch.venue || 'TBD',
                  matchDate: apiMatch.date || new Date(),
                  format: apiMatch.format || format,
                  status: apiMatch.status || 'upcoming',
                  externalMatchId: apiMatch.apiMatchId
                }
              });
              savedCount++;
            }
          }
          
          console.log(`   ✅ Saved ${savedCount} matches to database`);
        } else {
          console.log(`   ⚠️  No matches found for series (may be too early)`);
        }
      } catch (matchError) {
        // Don't fail tournament creation if match fetching fails
        console.error(`   ⚠️  Failed to fetch matches:`, matchError.message);
        console.log(`   Tournament created successfully, but matches not loaded`);
        console.log(`   User can load them later from Match Center`);
      }

      res.status(201).json({
        success: true,
        message: 'Tournament created successfully',
        data: {
          id: tournament.id,
          name: tournament.name,
          code: tournament.code,
          seriesId: tournament.seriesId
        }
      });
    } catch (error) {
      console.error('Error creating tournament:', error);
      res.status(500).json({ error: 'Failed to create tournament' });
    }
  },

  async joinTournament(req, res) {
    try {
      const { code } = req.body;
      const userId = req.userId;

      // Find tournament by code
      const tournament = await prisma.tournament.findUnique({
        where: { code }
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      if (tournament.status !== 'setup') {
        return res.status(400).json({ error: 'Tournament has already started' });
      }

      // Check if already joined
      const existing = await prisma.tournamentParticipant.findFirst({
        where: {
          tournamentId: tournament.id,
          userId: userId
        }
      });

      if (existing) {
        return res.status(400).json({ error: 'Already joined this tournament' });
      }

      // Add participant
      await prisma.tournamentParticipant.create({
        data: {
          tournamentId: tournament.id,
          userId
        }
      });

      // Create team
      await prisma.team.create({
        data: {
          tournamentId: tournament.id,
          userId,
          name: `${req.userEmail}'s Team`,
          walletBalance: tournament.walletAmount
        }
      });

      res.json({
        success: true,
        message: 'Joined tournament successfully',
        data: { tournamentId: tournament.id }
      });
    } catch (error) {
      console.error('Error joining tournament:', error);
      res.status(500).json({ error: 'Failed to join tournament' });
    }
  },

  async getSeriesFormats(req, res) {
    try {
      const { seriesId } = req.params;
      
      console.log(`🔍 Fetching formats for series: ${seriesId}`);
      
      // Fetch available formats for this series
      const formats = await cricketApiService.getSeriesFormats(seriesId);
      
      console.log(`📊 [Controller] Formats received from service:`, JSON.stringify(formats, null, 2));
      
      if (!formats || formats.length === 0) {
        console.log('❌ No formats available');
        return res.status(404).json({ 
          success: false,
          error: 'No formats available',
          message: 'Squad data not yet released for this series'
        });
      }
      
      console.log(`✅ Returning ${formats.length} formats to frontend: ${formats.map(f => f.format).join(', ')}`);
      
      res.json({
        success: true,
        data: formats
      });
    } catch (error) {
      console.error('❌ Error fetching series formats:', error);
      console.error('Stack:', error.stack);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch formats',
        message: error.message
      });
    }
  },

  async getTournamentDetails(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          teams: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              },
              players: true
            }
          }
        }
      });
      
      // Fetch series from SeriesCache separately
      if (tournament) {
        const series = await prisma.seriesCache.findUnique({
          where: { id: tournament.seriesId }
        });
        console.log(`[Tournament Controller] Series lookup for ID ${tournament.seriesId}:`);
        console.log(`   Found: ${series ? 'YES' : 'NO'}`);
        if (series) {
          console.log(`   Name: ${series.name}, API ID: ${series.apiSeriesId}`);
        }
        tournament.series = series;
      }

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      // Check if user is participant
      const isParticipant = tournament.participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get pauser name if auction is paused
      let pausedByName = null;
      if (tournament.isPaused && tournament.pausedBy) {
        const pauser = await prisma.user.findUnique({
          where: { id: tournament.pausedBy },
          select: { name: true }
        });
        pausedByName = pauser?.name || 'Unknown';
      }

      res.json({
        success: true,
        data: {
          ...tournament,
          pausedByName, // Add pauser name to response
          series: tournament.series ? {
            ...tournament.series,
            teams: typeof tournament.series.teams === 'string'
              ? JSON.parse(tournament.series.teams)
              : tournament.series.teams || []
          } : null,
          battingRules: JSON.parse(tournament.battingRules),
          bowlingRules: JSON.parse(tournament.bowlingRules),
          fieldingRules: JSON.parse(tournament.fieldingRules),
          captainRules: JSON.parse(tournament.captainRules),
          awardRules: JSON.parse(tournament.awardRules),
          compositionRules: JSON.parse(tournament.compositionRules)
        }
      });
    } catch (error) {
      console.error('Error fetching tournament:', error);
      res.status(500).json({ error: 'Failed to fetch tournament details' });
    }
  },

  async getUserTournaments(req, res) {
    try {
      const userId = req.userId;

      const participants = await prisma.tournamentParticipant.findMany({
        where: { userId },
        include: {
          tournament: {
            include: {
              participants: true
            }
          }
        }
      });

      // Fetch series data from SeriesCache for each tournament
      for (const participant of participants) {
        if (participant.tournament && participant.tournament.seriesId) {
          const series = await prisma.seriesCache.findUnique({
            where: { id: participant.tournament.seriesId }
          });
          participant.tournament.series = series;
        }
      }

      res.json({
        success: true,
        data: participants.map(p => ({
          ...p.tournament,
          series: p.tournament.series ? {
            ...p.tournament.series,
            teams: typeof p.tournament.series.teams === 'string'
              ? JSON.parse(p.tournament.series.teams)
              : p.tournament.series.teams || []
          } : null,
          rulesLocked: p.rulesLocked
        }))
      });
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Failed to fetch tournaments', details: error.message });
    }
  },

  async updateRules(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const { scoringRules } = req.body;

      const tournament = await prisma.tournament.findUnique({ where: { id } });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      if (tournament.creatorId !== userId) {
        return res.status(403).json({ error: 'Only creator can update rules' });
      }

      if (tournament.status !== 'setup') {
        return res.status(400).json({ error: 'Cannot update rules after tournament started' });
      }

      // Update rules
      await prisma.tournament.update({
        where: { id },
        data: {
          battingRules: JSON.stringify(scoringRules.batting),
          bowlingRules: JSON.stringify(scoringRules.bowling),
          fieldingRules: JSON.stringify(scoringRules.fielding),
          captainRules: JSON.stringify(scoringRules.captain),
          awardRules: JSON.stringify(scoringRules.awards),
          compositionRules: JSON.stringify(scoringRules.composition)
        }
      });

      // Reset all lock statuses
      await prisma.tournamentParticipant.updateMany({
        where: { tournamentId: id },
        data: { rulesLocked: false }
      });

      res.json({
        success: true,
        message: 'Rules updated successfully'
      });
    } catch (error) {
      console.error('Error updating rules:', error);
      res.status(500).json({ error: 'Failed to update rules' });
    }
  },

  async lockRules(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: { participants: true }
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      console.log(`📋 Tournament ${id} current status: ${tournament.status}`);

      // Find participant by tournamentId and userId
      const participant = await prisma.tournamentParticipant.findFirst({
        where: {
          tournamentId: id,
          userId: userId
        }
      });

      if (!participant) {
        return res.status(404).json({ error: 'You are not a participant in this tournament' });
      }

      console.log(`🔒 User ${userId} locking rules for tournament ${id}`);

      // Lock rules for this user
      await prisma.tournamentParticipant.update({
        where: { id: participant.id },
        data: { rulesLocked: true }
      });

      // Check if all participants have locked
      const participants = await prisma.tournamentParticipant.findMany({
        where: { tournamentId: id }
      });

      console.log(`👥 Total participants: ${participants.length}`);
      console.log(`🔓 Locked count: ${participants.filter(p => p.rulesLocked).length}`);

      const allLocked = participants.every(p => p.rulesLocked);

      if (allLocked) {
        console.log(`✅ All participants locked! Updating tournament status to 'locked'`);
        await prisma.tournament.update({
          where: { id },
          data: { status: 'locked' }
        });
      } else {
        console.log(`⏳ Waiting for more participants to lock rules`);
      }

      res.json({
        success: true,
        message: 'Rules locked',
        data: { allLocked }
      });
    } catch (error) {
      console.error('Error locking rules:', error);
      res.status(500).json({ error: 'Failed to lock rules' });
    }
  },

  async startAuction(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: { participants: true }
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      console.log(`🚀 Start auction requested for tournament ${id}`);
      console.log(`📊 Current tournament status: ${tournament.status}`);
      console.log(`👤 Creator ID: ${tournament.creatorId}, Requester ID: ${userId}`);

      if (tournament.creatorId !== userId) {
        return res.status(403).json({ error: 'Only creator can start auction' });
      }

      if (tournament.status !== 'locked') {
        console.log(`❌ Cannot start auction. Status is '${tournament.status}', expected 'locked'`);
        console.log(`📋 Participants status:`, tournament.participants.map(p => ({ 
          userId: p.userId, 
          rulesLocked: p.rulesLocked 
        })));
        return res.status(400).json({ error: 'All participants must lock rules first' });
      }

      // Generate auction players
      await auctionService.generateAuctionPlayers(tournament);

      // Update tournament status
      await prisma.tournament.update({
        where: { id },
        data: { status: 'auction' }
      });

      res.json({
        success: true,
        message: 'Auction started'
      });
    } catch (error) {
      console.error('Error starting auction:', error);
      res.status(500).json({ error: 'Failed to start auction' });
    }
  },

  async deleteTournament(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      // Get tournament with participants
      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          participants: true
        }
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      // Check if user is the creator
      if (tournament.creatorId !== userId) {
        return res.status(403).json({ error: 'Only the creator can delete this tournament' });
      }

      // Check if tournament has only one participant (the creator)
      if (tournament.participants.length > 1) {
        return res.status(400).json({ 
          error: 'Cannot delete tournament with multiple participants',
          participantCount: tournament.participants.length
        });
      }

      // Delete related data in transaction (order matters for foreign key constraints)
      await prisma.$transaction(async (tx) => {
        // 1. Delete bids first (references AuctionPlayer and Team)
        const teams = await tx.team.findMany({
          where: { tournamentId: id },
          select: { id: true }
        });
        const teamIds = teams.map(t => t.id);
        
        if (teamIds.length > 0) {
          await tx.bid.deleteMany({
            where: { teamId: { in: teamIds } }
          });
        }

        // 2. Delete team players (references Team)
        await tx.teamPlayer.deleteMany({
          where: { teamId: { in: teamIds } }
        });

        // 3. Delete teams
        await tx.team.deleteMany({
          where: { tournamentId: id }
        });

        // 4. Delete auction players (no longer referenced by bids)
        await tx.auctionPlayer.deleteMany({
          where: { tournamentId: id }
        });

        // 5. Delete match player scores (if any)
        await tx.matchPlayerScore.deleteMany({
          where: {
            match: {
              seriesId: tournament.seriesId
            }
          }
        });

        // 6. Delete participants
        await tx.tournamentParticipant.deleteMany({
          where: { tournamentId: id }
        });

        // 7. Finally, delete tournament
        await tx.tournament.delete({
          where: { id }
        });
      });

      console.log(`🗑️ Tournament ${id} deleted by creator ${userId}`);

      res.json({
        success: true,
        message: 'Tournament deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting tournament:', error);
      res.status(500).json({ error: 'Failed to delete tournament' });
    }
  },

  async getLeaderboard(req, res) {
    try {
      const { id } = req.params;
      const { matchId } = req.query;

      // Use mock leaderboard service (Phase 1)
      // TODO: Replace with real scoring in Phase 2
      const leaderboard = await leaderboardService.generateMockLeaderboard(id, matchId);

      res.json({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  },

  /**
   * Get all participants in a tournament (for dropdown)
   */
  async getTournamentParticipants(req, res) {
    try {
      const { tournamentId } = req.params;

      const participants = await prisma.team.findMany({
        where: { tournamentId },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: {
          user: { name: 'asc' }
        }
      });

      res.json({
        success: true,
        data: participants.map(p => ({
          userId: p.user.id,
          userName: p.user.name,
          userEmail: p.user.email,
          teamId: p.id,
          teamName: p.name
        }))
      });
    } catch (error) {
      console.error('[Tournament Controller] Error fetching participants:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch participants'
      });
    }
  },

  /**
   * Get match-wise breakdown for a specific user
   */
  async getMatchWiseBreakdown(req, res) {
    try {
      const { tournamentId, matchId } = req.params;
      const { userId } = req.query; // Get userId from query param (optional)
      const currentUserId = req.userId; // From auth middleware
      
      // Use provided userId or default to current user
      const targetUserId = userId || currentUserId;

      console.log(`[Tournament Controller] Match-wise breakdown:`);
      console.log(`   Tournament: ${tournamentId}`);
      console.log(`   Match: ${matchId}`);
      console.log(`   User: ${targetUserId}`);

      const breakdown = await leaderboardService.getMatchWiseBreakdown(
        tournamentId,
        matchId,
        targetUserId
      );

      res.json({
        success: true,
        data: breakdown
      });
    } catch (error) {
      console.error('[Tournament Controller] Error fetching match-wise breakdown:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch match-wise breakdown'
      });
    }
  },

  /**
   * Get overall standings with current user stats
   */
  async getOverallStandings(req, res) {
    try {
      const { tournamentId } = req.params;
      const userId = req.userId; // From auth middleware (corrected)

      console.log(`[Tournament Controller] Overall standings:`);
      console.log(`   Tournament: ${tournamentId}`);
      console.log(`   User: ${userId}`);

      const standings = await leaderboardService.getOverallStandings(
        tournamentId,
        userId
      );

      res.json({
        success: true,
        data: standings
      });
    } catch (error) {
      console.error('[Tournament Controller] Error fetching overall standings:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch overall standings'
      });
    }
  }
};

module.exports = tournamentController;

