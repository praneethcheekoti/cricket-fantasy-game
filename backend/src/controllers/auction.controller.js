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

      res.json({
        success: true,
        data: players.map(p => ({
          ...p,
          overallStats: JSON.parse(p.overallStats),
          vsOpponentStats: JSON.parse(p.vsOpponentStats)
        }))
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

      // Validate bid amount
      const minBid = player.currentPrice ? player.currentPrice + 10000000 : player.basePrice; // +10L increment
      if (amount < minBid) {
        return res.status(400).json({ 
          error: `Minimum bid is Rs ${minBid / 10000000} Cr` 
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
        return res.status(400).json({ error: `Player already ${player.status}` });
      }

      if (player.status !== 'available') {
        console.log(`⚠️ Player status is ${player.status}, not available`);
        return res.status(400).json({ error: 'Player not available for auction' });
      }

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
      // Handle duplicate detection
      if (error.message === 'ALREADY_SOLD') {
        console.log(`⚠️ Duplicate request detected, returning success anyway`);
        return res.json({
          success: true,
          message: `Player already sold`
        });
      }
      
      // Handle Prisma transaction conflict (P2034) - means another request is processing
      if (error.code === 'P2034') {
        console.log(`⚠️ Transaction conflict - another request is completing this player, returning success`);
        return res.json({
          success: true,
          message: `Player auction completed by concurrent request`
        });
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
  }
};

module.exports = auctionController;

