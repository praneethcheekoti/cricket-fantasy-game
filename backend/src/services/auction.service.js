const { PrismaClient } = require('@prisma/client');
const cricketApiService = require('./cricket-api');

const prisma = new PrismaClient();

const TIER_PRICES = {
  A: 500000000,  // 5 Cr in paise
  B: 300000000,  // 3 Cr
  C: 100000000,  // 1 Cr
  D: 50000000    // 50 L
};

const auctionService = {
  /**
   * Calculate player tier based on stats
   */
  calculatePlayerTier(player) {
    // Extract stats from overallStats
    const stats = player.overallStats || {};
    const batting = stats.batting || {};
    const bowling = stats.bowling || {};
    
    // For batsmen: Use batting average and matches
    if (player.role === 'Batsman') {
      const avg = batting.average || 0;
      const matches = batting.matches || 0;
      
      if (avg > 45 && matches > 50) return 'A';
      if (avg > 35 && matches > 30) return 'B';
      if (avg > 25 && matches > 10) return 'C';
      return 'D';
    }
    
    // For bowlers: Use bowling average and wickets
    if (player.role === 'Bowler') {
      const avg = bowling.average || 999;
      const wickets = bowling.wickets || 0;
      
      if (avg < 25 && wickets > 150) return 'A';
      if (avg < 30 && wickets > 100) return 'B';
      if (avg < 35 && wickets > 50) return 'C';
      return 'D';
    }
    
    // For all-rounders and wicket-keepers: Combined performance
    if (player.role === 'All-Rounder' || player.role === 'Wicket-Keeper') {
      const batAvg = batting.average || 0;
      const bowlWickets = bowling.wickets || 0;
      
      if (batAvg > 35 || bowlWickets > 100) return 'A';
      if (batAvg > 25 || bowlWickets > 50) return 'B';
      if (batAvg > 20 || bowlWickets > 20) return 'C';
      return 'D';
    }
    
    return 'C'; // Default tier
  },

  /**
   * Generate auction players for a tournament
   */
  async generateAuctionPlayers(tournament) {
    try {
      console.log(`🔄 Generating auction players for tournament ${tournament.id}...`);
      
      // Get series from SeriesCache using MongoDB ID
      const seriesData = await prisma.seriesCache.findUnique({
        where: { id: tournament.seriesId }
      });
      
      if (!seriesData) {
        throw new Error(`Series ${tournament.seriesId} not found`);
      }

      // Parse teams from JSON string
      const teams = typeof seriesData.teams === 'string' 
        ? JSON.parse(seriesData.teams) 
        : seriesData.teams || [];
      console.log(`📋 Series teams:`, teams);
      
      const allPlayers = [];

      // Get players from both teams using cricket API
      for (const team of teams) {
        console.log(`🔍 Fetching squad for team: ${team}`);
        
        try {
          // Fetch squad from cricket API
          const squadPlayers = await cricketApiService.getSquad(seriesData.apiSeriesId, team);
          console.log(`✅ Found ${squadPlayers.length} players for ${team}`);
          
          for (const player of squadPlayers) {
            // Calculate tier based on stats
            const tier = this.calculatePlayerTier(player);
            
            allPlayers.push({
              tournamentId: tournament.id,
              playerId: player.apiPlayerId || player.id,
              playerName: player.name,
              role: player.role,
              tier: tier,
              basePrice: TIER_PRICES[tier],
              overallStats: JSON.stringify(player.overallStats || {}),
              vsOpponentStats: JSON.stringify({}) // Will be populated when match data is available
            });
          }
        } catch (error) {
          console.error(`❌ Error fetching squad for ${team}:`, error.message);
          // Continue with next team instead of failing
        }
      }

      console.log(`📊 Total players to create: ${allPlayers.length}`);

      if (allPlayers.length === 0) {
        throw new Error('No players found for this series. Check if squads are available.');
      }

      // Create auction players
      await prisma.auctionPlayer.createMany({
        data: allPlayers
      });

      console.log(`✅ Generated ${allPlayers.length} auction players for tournament ${tournament.id}`);
      return allPlayers.length;
    } catch (error) {
      console.error('❌ Error in generateAuctionPlayers:', error);
      throw error;
    }
  },

  /**
   * Complete auction for a player (highest bidder wins)
   */
  async completePlayerAuction(playerId) {
    // Get highest bid
    const highestBid = await prisma.bid.findFirst({
      where: { playerId },
      orderBy: { amount: 'desc' },
      include: {
        team: true,
        user: true
      }
    });

    if (!highestBid) {
      console.log('No bids for player', playerId);
      return;
    }

    const player = await prisma.auctionPlayer.findUnique({
      where: { id: playerId }
    });

    // Mark player as sold
    await prisma.auctionPlayer.update({
      where: { id: playerId },
      data: {
        status: 'sold',
        soldTo: highestBid.teamId,
        currentPrice: highestBid.amount
      }
    });

    // Add player to team
    await prisma.teamPlayer.create({
      data: {
        teamId: highestBid.teamId,
        playerId: player.playerId,
        playerName: player.playerName,
        role: player.role,
        purchasePrice: highestBid.amount
      }
    });

    // Deduct from team wallet
    await prisma.team.update({
      where: { id: highestBid.teamId },
      data: {
        walletBalance: {
          decrement: highestBid.amount
        }
      }
    });

    console.log(`✅ Player ${player.playerName} sold to team ${highestBid.team.name} for Rs ${highestBid.amount / 10000000} Cr`);
  },

  /**
   * Handle player replacement (injury/dropped)
   */
  async handlePlayerReplacement(tournamentId, oldPlayerId, newPlayerData) {
    // Get all teams that have this player
    const teamsWithPlayer = await prisma.teamPlayer.findMany({
      where: {
        playerId: oldPlayerId,
        team: {
          tournamentId
        }
      },
      include: {
        team: true
      }
    });

    if (teamsWithPlayer.length === 1) {
      // Only 1 team has this player - automatic replacement
      const teamPlayer = teamsWithPlayer[0];
      
      // Get new player data (if needed for stats, fetch from API)
      // For now, use provided data directly
      
      // Replace player
      await prisma.teamPlayer.update({
        where: { id: teamPlayer.id },
        data: {
          playerId: newPlayerData.id || newPlayerData.name.toLowerCase().replace(/\s+/g, '-'),
          playerName: newPlayerData.name,
          role: newPlayerData.role
        }
      });

      console.log(`✅ Player replaced automatically for ${teamPlayer.team.name}`);
    } else if (teamsWithPlayer.length > 1) {
      // Multiple teams have this player - open bidding
      console.log(`🔄 Opening re-auction for ${teamsWithPlayer.length} teams`);
      
      // Refund money to all teams
      for (const teamPlayer of teamsWithPlayer) {
        await prisma.team.update({
          where: { id: teamPlayer.teamId },
          data: {
            walletBalance: {
              increment: teamPlayer.purchasePrice
            }
          }
        });

        // Remove player from team
        await prisma.teamPlayer.delete({
          where: { id: teamPlayer.id }
        });
      }

      // Create new auction player
      // Calculate tier for new player
      const tier = newPlayerData.tier || this.calculatePlayerTier(newPlayerData);

      await prisma.auctionPlayer.create({
        data: {
          tournamentId,
          playerId: newPlayerData.id || newPlayerData.name.toLowerCase().replace(/\s+/g, '-'),
          playerName: newPlayerData.name,
          role: newPlayerData.role,
          tier: tier,
          basePrice: TIER_PRICES[tier],
          overallStats: JSON.stringify(newPlayerData.overallStats || {}),
          vsOpponentStats: JSON.stringify({})
        }
      });

      console.log('✅ New player added to auction pool');
    }
  }
};

module.exports = auctionService;

