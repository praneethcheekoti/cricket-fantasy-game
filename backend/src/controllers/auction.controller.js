const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const auctionController = {
  async getAuctionPlayers(req, res) {
    try {
      const { tournamentId } = req.params;
      
      const players = await prisma.auctionPlayer.findMany({
        where: { tournamentId },
        orderBy: [
          { tier: 'asc' },
          { playerName: 'asc' }
        ]
      });

      // OPTIMIZED: Fetch ALL bids for this tournament in ONE query (fixes N+1 problem)
      const playerIds = players.map(p => p.id);
      const allBids = await prisma.bid.findMany({
        where: { playerId: { in: playerIds } },
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Create a map of playerId -> latest bid (first bid in desc order)
      const latestBidByPlayer = new Map();
      for (const bid of allBids) {
        if (!latestBidByPlayer.has(bid.playerId)) {
          latestBidByPlayer.set(bid.playerId, bid);
        }
      }

      // Map players with their bidders
      const playersWithBidders = players.map(player => {
        const latestBid = latestBidByPlayer.get(player.id);
        return {
          ...player,
          overallStats: player.overallStats ? JSON.parse(player.overallStats) : {},
          vsOpponentStats: player.vsOpponentStats ? JSON.parse(player.vsOpponentStats) : {},
          highestBidder: latestBid ? {
            id: latestBid.user.id,
            name: latestBid.user.name,
            email: latestBid.user.email
          } : null
        };
      });

      res.json({
        success: true,
        data: playersWithBidders
      });
    } catch (error) {
      console.error('Error fetching auction players:', error);
      res.status(500).json({ error: 'Failed to fetch players' });
    }
  },

  async placeBid(req, res) {
    try {
      const { tournamentId } = req.params;
      const { playerId, amount } = req.body;
      const userId = req.userId;

      // Get player
      const player = await prisma.auctionPlayer.findUnique({
        where: { id: playerId }
      });

      if (!player || player.tournamentId !== tournamentId) {
        return res.status(404).json({ error: 'Player not found' });
      }

      if (player.status === 'sold') {
        return res.status(400).json({ error: 'Player already sold' });
      }

      // Get team
      const team = await prisma.team.findFirst({
        where: {
          tournamentId: tournamentId,
          userId: userId
        }
      });

      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Validate bid amount (must be in whole Crores, increment of 1 Cr)
      const minBid = player.currentPrice ? player.currentPrice + 10000000 : player.basePrice; // +1 Cr increment
      if (amount < minBid) {
        return res.status(400).json({ 
          error: `Minimum bid is Rs ${minBid / 10000000} Cr` 
        });
      }
      
      // Ensure bid is in whole Crores (no decimal values)
      if (amount % 10000000 !== 0) {
        return res.status(400).json({ 
          error: 'Bids must be in whole Crores (e.g., 5 Cr, 6 Cr, not 5.5 Cr)' 
        });
      }

      if (amount > team.walletBalance) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Create bid
      const bid = await prisma.bid.create({
        data: {
          playerId,
          userId,
          teamId: team.id,
          amount
        }
      });

      // Update player current price
      await prisma.auctionPlayer.update({
        where: { id: playerId },
        data: { currentPrice: amount }
      });

      res.json({
        success: true,
        message: 'Bid placed successfully',
        data: bid
      });
    } catch (error) {
      console.error('Error placing bid:', error);
      res.status(500).json({ error: 'Failed to place bid' });
    }
  },

  async getAllTeams(req, res) {
    try {
      const { tournamentId } = req.params;

      const teams = await prisma.team.findMany({
        where: { tournamentId },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          players: true
        }
      });

      res.json({
        success: true,
        data: teams
      });
    } catch (error) {
      console.error('Error fetching teams:', error);
      res.status(500).json({ error: 'Failed to fetch teams' });
    }
  },

  async getPlayerBidHistory(req, res) {
    try {
      const { tournamentId, playerId } = req.params;

      // Get all bids for this player (playerId is unique per tournament, so we don't need to filter by tournamentId)
      // Sort by timestamp DESC (latest bid first) so users see the most recent bids at the top
      const bids = await prisma.bid.findMany({
        where: {
          playerId
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          team: {
            select: { 
              id: true, 
              name: true,
              user: {
                select: { name: true, email: true }
              }
            }
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      res.json({
        success: true,
        data: bids
      });
    } catch (error) {
      console.error('❌ [BID HISTORY] Error fetching bid history:', error);
      res.status(500).json({ error: 'Failed to fetch bid history' });
    }
  },

  async getMyTeam(req, res) {
    try {
      const { tournamentId } = req.params;
      const userId = req.userId;

      const team = await prisma.team.findFirst({
        where: {
          tournamentId: tournamentId,
          userId: userId
        },
        include: {
          players: true
        }
      });

      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      res.json({
        success: true,
        data: team
      });
    } catch (error) {
      console.error('Error fetching team:', error);
      res.status(500).json({ error: 'Failed to fetch team' });
    }
  },

  async completePlayerAuction(req, res) {
    try {
      const { tournamentId, playerId } = req.params;
      
      console.log(`⏰ Complete player auction request:`);
      console.log(`   Tournament ID: ${tournamentId}`);
      console.log(`   Player ID: ${playerId}`);

      // Get the auction player WITH A LOCK to prevent race conditions
      const player = await prisma.auctionPlayer.findUnique({
        where: { id: playerId }
      });

      if (!player) {
        console.log(`❌ Player not found: ${playerId}`);
        return res.status(404).json({ error: 'Player not found' });
      }
      
      console.log(`👤 Player found: ${player.playerName}, Status: ${player.status}`);

      if (player.status === 'sold' || player.status === 'unsold') {
        console.log(`⚠️ Player already processed (status: ${player.status})!`);
        
        // Return consistent response format so all users get same notification
        if (player.status === 'sold') {
          // Player was sold - fetch the buyer information
          const soldTeam = await prisma.team.findUnique({
            where: { id: player.soldTo },
            include: {
              user: { select: { name: true } }
            }
          });
          
          console.log(`ℹ️ Player already sold to ${soldTeam?.user?.name || 'Unknown'}`);
          
          return res.json({
            success: true,
            message: `Player already sold to ${soldTeam?.user?.name || 'Unknown'}`,
            data: {
              playerName: player.playerName,
              soldTo: soldTeam?.user?.name || 'Unknown',
              price: player.currentPrice
            }
          });
        } else {
          // Player was unsold
          console.log(`ℹ️ Player already marked as unsold`);
          
          return res.json({
            success: true,
            message: 'Player already marked as unsold',
            data: {
              playerName: player.playerName
              // No soldTo field - frontend will show unsold
            }
          });
        }
      }

      if (player.status !== 'available') {
        console.log(`⚠️ Player status is ${player.status}, not available`);
        return res.status(400).json({ error: 'Player not available for auction' });
      }

      // 🛡️ LAYER 1: Anti-Snipe Protection - Check for recent bids (last 5 seconds)
      const fiveSecondsAgo = new Date(Date.now() - 5000);
      const recentBid = await prisma.bid.findFirst({
        where: {
          playerId,
          timestamp: { gte: fiveSecondsAgo }
        },
        orderBy: { timestamp: 'desc' },
        include: {
          user: { select: { name: true } }
        }
      });

      if (recentBid) {
        const timeSinceBid = Date.now() - new Date(recentBid.timestamp).getTime();
        console.log(`🛡️ ANTI-SNIPE: Recent bid detected from ${recentBid.user.name}`);
        console.log(`   Bid placed ${timeSinceBid}ms ago (< 5000ms)`);
        console.log(`   Timer should reset - rejecting completion request`);
        
        return res.status(400).json({ 
          error: 'Recent bid detected',
          message: 'A bid was placed in the last 5 seconds. Timer should reset.',
          bidPlacedAt: recentBid.timestamp,
          timeSinceBid: timeSinceBid
        });
      }

      console.log(`✅ No recent bids in last 5 seconds - proceeding with completion`);

      // Get highest bid
      const highestBid = await prisma.bid.findFirst({
        where: { playerId },
        orderBy: { amount: 'desc' },
        include: {
          team: true,
          user: true
        }
      });
      
      console.log(`💰 Highest bid:`, highestBid ? `${highestBid.amount / 10000000} Cr by ${highestBid.user.name}` : 'None');

      if (!highestBid) {
        // No bids - mark as unsold and move on
        console.log(`❌ No bids! Marking ${player.playerName} as unsold`);
        await prisma.auctionPlayer.update({
          where: { id: playerId },
          data: { status: 'unsold' }
        });
        console.log(`✅ Marked as unsold successfully`);
        
        // Check if all players are processed
        await auctionController.checkAndCompleteAuction(tournamentId);
        
        return res.json({
          success: true,
          message: 'No bids placed - player marked as unsold'
        });
      }

      // Use a transaction to ensure atomicity - all or nothing
      const result = await prisma.$transaction(async (tx) => {
        // Check if player already added to team (prevent duplicates from race conditions)
        const existingTeamPlayer = await tx.teamPlayer.findFirst({
          where: {
            teamId: highestBid.teamId,
            playerId: player.playerId
          }
        });

        if (existingTeamPlayer) {
          console.log(`⚠️ Player ${player.playerName} already in team, skipping duplicate`);
          throw new Error('ALREADY_SOLD'); // Will be caught below
        }

        // Mark player as sold FIRST (this prevents other requests from processing)
        await tx.auctionPlayer.update({
          where: { id: playerId },
          data: {
            status: 'sold',
            soldTo: highestBid.teamId,
            currentPrice: highestBid.amount
          }
        });

        console.log(`✅ Marked ${player.playerName} as sold`);

        // Add player to team
        const teamPlayer = await tx.teamPlayer.create({
          data: {
            teamId: highestBid.teamId,
            playerId: player.playerId,
            playerName: player.playerName,
            role: player.role,
            purchasePrice: highestBid.amount
            // Note: tier is stored in AuctionPlayer, not TeamPlayer
          }
        });
        
        console.log(`✅ Added ${player.playerName} to team`);

        // Deduct from team wallet
        await tx.team.update({
          where: { id: highestBid.teamId },
          data: {
            walletBalance: {
              decrement: highestBid.amount
            }
          }
        });

        return teamPlayer;
      });

      // If we got here, transaction succeeded

      console.log(`✅ Player ${player.playerName} sold to ${highestBid.user.name} for Rs ${highestBid.amount / 10000000} Cr`);

      // Check if all players are processed (sold or unsold)
      await auctionController.checkAndCompleteAuction(tournamentId);

      res.json({
        success: true,
        message: `Player sold to ${highestBid.user.name}`,
        data: {
          playerName: player.playerName,
          soldTo: highestBid.user.name,
          price: highestBid.amount
        }
      });
    } catch (error) {
      // Handle duplicate detection within transaction
      if (error.message === 'ALREADY_SOLD') {
        console.log(`⚠️ Duplicate request detected within transaction`);
        
        // Fetch player data to return consistent response format
        const soldPlayer = await prisma.auctionPlayer.findUnique({
          where: { id: playerId }
        });
        
        if (soldPlayer && soldPlayer.status === 'sold') {
          const soldTeam = await prisma.team.findUnique({
            where: { id: soldPlayer.soldTo },
            include: {
              user: { select: { name: true } }
            }
          });
          
          return res.json({
            success: true,
            message: `Player already sold to ${soldTeam?.user?.name || 'Unknown'}`,
            data: {
              playerName: soldPlayer.playerName,
              soldTo: soldTeam?.user?.name || 'Unknown',
              price: soldPlayer.currentPrice
            }
          });
        }
      }
      
      // Handle Prisma transaction conflict (P2034) - means another request is processing
      if (error.code === 'P2034') {
        console.log(`⚠️ Transaction conflict - another request is completing this player`);
        
        // Fetch player data to return consistent response format
        const soldPlayer = await prisma.auctionPlayer.findUnique({
          where: { id: playerId }
        });
        
        if (soldPlayer && soldPlayer.status === 'sold') {
          const soldTeam = await prisma.team.findUnique({
            where: { id: soldPlayer.soldTo },
            include: {
              user: { select: { name: true } }
            }
          });
          
          return res.json({
            success: true,
            message: `Player auction completed by concurrent request`,
            data: {
              playerName: soldPlayer.playerName,
              soldTo: soldTeam?.user?.name || 'Unknown',
              price: soldPlayer.currentPrice
            }
          });
        } else if (soldPlayer && soldPlayer.status === 'unsold') {
          return res.json({
            success: true,
            message: 'Player marked as unsold by concurrent request',
            data: {
              playerName: soldPlayer.playerName
              // No soldTo - will show unsold
            }
          });
        }
      }
      
      console.error('❌❌❌ Error completing player auction:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error stack:', error.stack);
      
      res.status(500).json({ 
        error: 'Failed to complete auction',
        details: error.message 
      });
    }
  },

  async rebidPlayer(req, res) {
    try {
      const { tournamentId, playerId } = req.params;

      console.log(`🔄 Rebid request for player ${playerId} in tournament ${tournamentId}`);

      // Get the player
      const player = await prisma.auctionPlayer.findUnique({
        where: { id: playerId }
      });

      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }

      // Only allow rebid for unsold players
      if (player.status !== 'unsold') {
        return res.status(400).json({ 
          error: 'Only unsold players can be re-bid',
          details: `Player status is ${player.status}` 
        });
      }

      // Reset player to available status
      await prisma.auctionPlayer.update({
        where: { id: playerId },
        data: {
          status: 'available',
          currentPrice: player.basePrice, // Reset to base price
          soldTo: null
        }
      });

      console.log(`✅ Player ${player.playerName} reset for re-bidding`);

      res.json({
        success: true,
        message: `${player.playerName} is now available for bidding again`,
        data: { playerId, playerName: player.playerName }
      });

    } catch (error) {
      console.error('Error re-bidding player:', error);
      res.status(500).json({ error: 'Failed to re-bid player' });
    }
  },

  async setCaptainViceCaptain(req, res) {
    try {
      const { tournamentId } = req.params;
      const { captainId, viceCaptainId } = req.body;
      const userId = req.userId;

      const team = await prisma.team.findFirst({
        where: {
          tournamentId: tournamentId,
          userId: userId
        }
      });

      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Reset all captain/vice-captain flags
      await prisma.teamPlayer.updateMany({
        where: { teamId: team.id },
        data: {
          isCaptain: false,
          isViceCaptain: false
        }
      });

      // Set new captain
      if (captainId) {
        await prisma.teamPlayer.update({
          where: { id: captainId },
          data: { isCaptain: true }
        });
      }

      // Set new vice-captain
      if (viceCaptainId) {
        await prisma.teamPlayer.update({
          where: { id: viceCaptainId },
          data: { isViceCaptain: true }
        });
      }

      res.json({
        success: true,
        message: 'Captain and vice-captain set successfully'
      });
    } catch (error) {
      console.error('Error setting captain:', error);
      res.status(500).json({ error: 'Failed to set captain' });
    }
  },

  async removeDuplicatePlayers(req, res) {
    try {
      const { tournamentId } = req.params;
      const userId = req.userId;

      const team = await prisma.team.findFirst({
        where: {
          tournamentId: tournamentId,
          userId: userId
        },
        include: {
          players: true
        }
      });

      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Find duplicates (same playerId)
      const playerMap = new Map();
      const duplicates = [];

      for (const player of team.players) {
        if (playerMap.has(player.playerId)) {
          duplicates.push(player.id); // Keep track of duplicate IDs
        } else {
          playerMap.set(player.playerId, player);
        }
      }

      // Delete duplicates
      if (duplicates.length > 0) {
        await prisma.teamPlayer.deleteMany({
          where: {
            id: { in: duplicates }
          }
        });

        console.log(`🗑️ Removed ${duplicates.length} duplicate players from team`);
      }

      res.json({
        success: true,
        message: `Removed ${duplicates.length} duplicate players`,
        removed: duplicates.length
      });
    } catch (error) {
      console.error('Error removing duplicates:', error);
      res.status(500).json({ error: 'Failed to remove duplicates' });
    }
  },

  /**
   * Check if all players are processed and mark auction as completed
   */
  async checkAndCompleteAuction(tournamentId) {
    try {
      console.log(`🔍 Checking auction completion for tournament: ${tournamentId}`);
      
      // Get all auction players
      const allPlayers = await prisma.auctionPlayer.findMany({
        where: { tournamentId }
      });

      console.log(`📊 Total players: ${allPlayers.length}`);
      console.log(`📊 Player statuses:`, allPlayers.map(p => `${p.playerName}: ${p.status}`));

      // Check if all are processed (sold or unsold)
      const allProcessed = allPlayers.every(p => p.status === 'sold' || p.status === 'unsold');
      
      console.log(`✅ All processed? ${allProcessed}`);
      
      if (allProcessed && allPlayers.length > 0) {
        // Update tournament status to completed
        const updatedTournament = await prisma.tournament.update({
          where: { id: tournamentId },
          data: { status: 'completed' }
        });
        
        console.log(`🎉 Auction completed for tournament ${tournamentId}! All ${allPlayers.length} players processed.`);
        console.log(`✅ Tournament status updated to: ${updatedTournament.status}`);
      } else {
        console.log(`⏳ Auction not complete yet. ${allPlayers.filter(p => p.status === 'available').length} players still available.`);
      }
    } catch (error) {
      console.error('❌ Error checking auction completion:', error);
      // Don't throw - this is a background check
    }
  },

  /**
   * Get dynamic player stats during auction (on-demand)
   * Fetches stats from CrickkAPI if player has no stats
   * Used to help bidders make informed decisions
   */
  async getDynamicPlayerStats(req, res) {
    try {
      const { tournamentId, playerId } = req.params;
      
      console.log(`🔍 [Dynamic Stats] Request for player ${playerId} in tournament ${tournamentId}`);

      // Step 1: Get player from auction
      const auctionPlayer = await prisma.auctionPlayer.findFirst({
        where: {
          id: playerId,
          tournamentId: tournamentId
        }
      });

      if (!auctionPlayer) {
        return res.status(404).json({
          success: false,
          error: 'Player not found'
        });
      }

      // Step 2: Check if player already has stats
      const existingStats = JSON.parse(auctionPlayer.overallStats || '{}');
      
      if (existingStats && Object.keys(existingStats).length > 0) {
        console.log(`✅ [Dynamic Stats] Player ${auctionPlayer.playerName} already has stats`);
        return res.json({
          success: true,
          data: {
            playerName: auctionPlayer.playerName,
            stats: existingStats,
            source: 'cached'
          }
        });
      }

      // Step 3: Get tournament format
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId }
      });

      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found'
        });
      }

      // Get format from tournament (always use tournament.format as the source of truth)
      const format = tournament.format || 'ODI'; // Default format
      
      console.log(`📊 [Dynamic Stats] Fetching ${format} stats for ${auctionPlayer.playerName}`);

      // Step 4: Fetch stats from CrickkAPI
      const CrickkApiProvider = require('../services/cricket-api/providers/crickkapi-provider');
      const crickkApi = new CrickkApiProvider();

      // Check if CrickkAPI is enabled (has API key)
      if (!crickkApi.isEnabled) {
        console.log(`⚠️  [Dynamic Stats] CrickkAPI not configured (missing RAPIDAPI_KEY)`);
        return res.status(503).json({
          success: false,
          error: 'Player stats API is not configured',
          fallbackStats: {} // Return empty stats so frontend can show zeros
        });
      }

      const stats = await crickkApi.fetchPlayerStatsByName(auctionPlayer.playerName, format);

      if (!stats) {
        console.log(`⚠️  [Dynamic Stats] No stats available for ${auctionPlayer.playerName}`);
        return res.status(404).json({
          success: false,
          error: 'Stats not available for this player',
          fallbackStats: {} // Return empty stats so frontend can show zeros
        });
      }

      console.log(`✅ [Dynamic Stats] Retrieved ${format} stats for ${auctionPlayer.playerName}`);

      // Step 5: Return stats (do NOT update tier or base price)
      res.json({
        success: true,
        data: {
          playerName: auctionPlayer.playerName,
          role: auctionPlayer.role,
          team: auctionPlayer.team,
          format: format,
          stats: stats,
          source: 'dynamic'
        }
      });

    } catch (error) {
      console.error('❌ [Dynamic Stats] Error fetching dynamic stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dynamic stats'
      });
    }
  },

  /**
   * Pause the auction
   * Only a tournament participant can pause
   */
  async pauseAuction(req, res) {
    try {
      const { tournamentId } = req.params;
      const userId = req.userId;

      console.log(`⏸️  [Pause] Request to pause auction ${tournamentId} by user ${userId}`);

      // Check if user is a participant
      const participant = await prisma.tournamentParticipant.findFirst({
        where: {
          tournamentId: tournamentId,
          userId: userId
        }
      });

      if (!participant) {
        return res.status(403).json({
          success: false,
          error: 'Only tournament participants can pause the auction'
        });
      }

      // Check if tournament is in auction status
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId }
      });

      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found'
        });
      }

      if (tournament.status !== 'auction') {
        return res.status(400).json({
          success: false,
          error: 'Can only pause during active auction'
        });
      }

      if (tournament.isPaused) {
        return res.status(400).json({
          success: false,
          error: 'Auction is already paused'
        });
      }

      // Pause the auction
      const updatedTournament = await prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          isPaused: true,
          pausedBy: userId,
          pausedAt: new Date()
        }
      });

      // Get user info for response
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
      });

      console.log(`✅ [Pause] Auction paused by ${user?.name || 'Unknown'}`);

      res.json({
        success: true,
        data: {
          isPaused: true,
          pausedBy: userId,
          pausedByName: user?.name || 'Unknown',
          pausedAt: updatedTournament.pausedAt
        }
      });

    } catch (error) {
      console.error('❌ [Pause] Error pausing auction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to pause auction'
      });
    }
  },

  /**
   * Unpause the auction
   * Only the user who paused can unpause
   */
  async unpauseAuction(req, res) {
    try {
      const { tournamentId } = req.params;
      const userId = req.userId;

      console.log(`▶️  [Unpause] Request to unpause auction ${tournamentId} by user ${userId}`);

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

      if (!tournament.isPaused) {
        return res.status(400).json({
          success: false,
          error: 'Auction is not paused'
        });
      }

      // Check if this user paused the auction
      if (tournament.pausedBy !== userId) {
        // Get pauser info
        const pauser = await prisma.user.findUnique({
          where: { id: tournament.pausedBy || '' },
          select: { name: true }
        });

        return res.status(403).json({
          success: false,
          error: `Only ${pauser?.name || 'the user who paused'} can unpause the auction`
        });
      }

      // Unpause the auction
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          isPaused: false,
          pausedBy: null,
          pausedAt: null
        }
      });

      console.log(`✅ [Unpause] Auction resumed by user ${userId}`);

      res.json({
        success: true,
        data: {
          isPaused: false
        }
      });

    } catch (error) {
      console.error('❌ [Unpause] Error unpausing auction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unpause auction'
      });
    }
  }
};

module.exports = auctionController;

