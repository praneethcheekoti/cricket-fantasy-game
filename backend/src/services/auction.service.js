const { PrismaClient } = require('@prisma/client');
const cricketApiService = require('./cricket-api');

const prisma = new PrismaClient();

const TIER_PRICES = {
  A: 70000000,   // 7 Cr in paise
  B: 50000000,   // 5 Cr
  C: 30000000,   // 3 Cr
  D: 10000000    // 1 Cr
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
   * Calculate player tier from real statistics (RapidAPI data)
   * Uses format-specific thresholds for accurate tier assignment
   */
  calculatePlayerTierFromStats(stats, format = 'ODI') {
    if (!stats || !stats.batting || !stats.bowling) {
      return 'D';
    }

    const batting = stats.batting;
    const bowling = stats.bowling;

    // Determine player type based on stats
    const isBatsman = batting.matches > 0 && (bowling.wickets === 0 || batting.runs > bowling.wickets * 30);
    const isBowler = bowling.wickets > 0 && !isBatsman;
    const isAllRounder = batting.runs > 1000 && bowling.wickets > 50;

    // Format-specific thresholds
    const thresholds = this.getFormatThresholds(format);

    // Tier calculation for batsmen
    if (isBatsman) {
      const avg = batting.average || 0;
      const runs = batting.runs || 0;
      const strikeRate = batting.strikeRate || 0;
      
      // For T20, strike rate is crucial
      if (format === 'T20' || format === 'T20I') {
        if (avg > thresholds.batsman.A.avg && strikeRate > thresholds.batsman.A.sr && runs > thresholds.batsman.A.runs) return 'A';
        if (avg > thresholds.batsman.B.avg && strikeRate > thresholds.batsman.B.sr && runs > thresholds.batsman.B.runs) return 'B';
        if (avg > thresholds.batsman.C.avg && runs > thresholds.batsman.C.runs) return 'C';
      } else {
        // For ODI/Test, average and total runs matter more
        if (avg > thresholds.batsman.A.avg && runs > thresholds.batsman.A.runs) return 'A';
        if (avg > thresholds.batsman.B.avg && runs > thresholds.batsman.B.runs) return 'B';
        if (avg > thresholds.batsman.C.avg && runs > thresholds.batsman.C.runs) return 'C';
      }
      return 'D';
    }

    // Tier calculation for bowlers
    if (isBowler) {
      const avg = bowling.average || 999;
      const wickets = bowling.wickets || 0;
      const economy = bowling.economy || 999;
      
      // For T20, economy is crucial
      if (format === 'T20' || format === 'T20I') {
        if (wickets > thresholds.bowler.A.wickets && economy < thresholds.bowler.A.economy) return 'A';
        if (wickets > thresholds.bowler.B.wickets && economy < thresholds.bowler.B.economy) return 'B';
        if (wickets > thresholds.bowler.C.wickets && economy < thresholds.bowler.C.economy) return 'C';
      } else {
        // For ODI/Test, average and wickets matter more
        if (avg < thresholds.bowler.A.avg && wickets > thresholds.bowler.A.wickets) return 'A';
        if (avg < thresholds.bowler.B.avg && wickets > thresholds.bowler.B.wickets) return 'B';
        if (avg < thresholds.bowler.C.avg && wickets > thresholds.bowler.C.wickets) return 'C';
      }
      return 'D';
    }

    // Tier calculation for all-rounders
    if (isAllRounder) {
      const batAvg = batting.average || 0;
      const wickets = bowling.wickets || 0;
      
      if (batAvg > thresholds.allrounder.A.avg && wickets > thresholds.allrounder.A.wickets) return 'A';
      if (batAvg > thresholds.allrounder.B.avg && wickets > thresholds.allrounder.B.wickets) return 'B';
      if (batAvg > thresholds.allrounder.C.avg && wickets > thresholds.allrounder.C.wickets) return 'C';
      return 'D';
    }

    return 'D';
  },

  /**
   * Get format-specific thresholds for tier calculation
   */
  getFormatThresholds(format) {
    const normalized = (format || 'ODI').toUpperCase();
    
    if (normalized === 'T20' || normalized === 'T20I') {
      return {
        batsman: {
          A: { avg: 30, sr: 140, runs: 2000 },
          B: { avg: 25, sr: 130, runs: 1000 },
          C: { avg: 20, sr: 120, runs: 500 }
        },
        bowler: {
          A: { wickets: 100, economy: 7.5, avg: 25 },
          B: { wickets: 50, economy: 8.0, avg: 28 },
          C: { wickets: 25, economy: 9.0, avg: 32 }
        },
        allrounder: {
          A: { avg: 25, wickets: 80 },
          B: { avg: 22, wickets: 50 },
          C: { avg: 18, wickets: 30 }
        }
      };
    } else if (normalized === 'TEST') {
      return {
        batsman: {
          A: { avg: 50, runs: 5000 },
          B: { avg: 40, runs: 3000 },
          C: { avg: 30, runs: 1500 }
        },
        bowler: {
          A: { wickets: 200, avg: 28 },
          B: { wickets: 100, avg: 32 },
          C: { wickets: 50, avg: 38 }
        },
        allrounder: {
          A: { avg: 35, wickets: 150 },
          B: { avg: 28, wickets: 80 },
          C: { avg: 22, wickets: 40 }
        }
      };
    } else {
      // ODI (default)
      return {
        batsman: {
          A: { avg: 45, runs: 4000 },
          B: { avg: 35, runs: 2500 },
          C: { avg: 28, runs: 1200 }
        },
        bowler: {
          A: { wickets: 150, avg: 28 },
          B: { wickets: 80, avg: 32 },
          C: { wickets: 40, avg: 36 }
        },
        allrounder: {
          A: { avg: 35, wickets: 120 },
          B: { avg: 28, wickets: 60 },
          C: { avg: 22, wickets: 35 }
        }
      };
    }
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

      // Fetch all squads for the selected format
      console.log(`🔍 Fetching ${tournament.format} squads for series ${seriesData.id} (${seriesData.name})...`);
      
      try {
        const squadPlayers = await cricketApiService.getAllSquads(seriesData.id, tournament.format);
        console.log(`✅ Found ${squadPlayers.length} total players across all teams`);
        
        if (squadPlayers.length > 0) {
          console.log('🔍 FIRST PLAYER KEYS:', Object.keys(squadPlayers[0]));
          console.log('🔍 FIRST PLAYER apiPlayerId:', squadPlayers[0].apiPlayerId);
          console.log('🔍 FIRST PLAYER id:', squadPlayers[0].id);
          console.log('🔍 FIRST PLAYER name:', squadPlayers[0].name);
          console.log('🔍 FIRST PLAYER team:', squadPlayers[0].team);
        }
        
        if (squadPlayers.length === 0) {
          console.warn(`⚠️ No squad data available for series ${seriesData.name}`);
          console.warn(`⚠️ This may be because:`);
          console.warn(`   - Series squads haven't been announced yet`);
          console.warn(`   - Series is too far in the future`);
          console.warn(`   - API doesn't have squad data for this series type`);
          throw new Error(`No squad data available for this series. Squads may not be announced yet.`);
        }
        
        for (const player of squadPlayers) {
          try {
            // Fetch real player statistics from RapidAPI (pass role, team, and format for accurate stats)
            console.log(`📊 Fetching ${tournament.format} stats for: ${player.name}`);
            const playerStats = await cricketApiService.getPlayerStats(
              player.name, 
              player.role, 
              player.team,
              tournament.format  // Pass tournament format (T20/ODI/Test)
            );
            
            if (playerStats) {
              console.log(`   ✅ Got ${tournament.format} stats for ${player.name}`);
            } else {
              console.log(`   ⚠️  No stats for ${player.name} - using default tier`);
            }
            
            // Calculate tier based on format-specific stats
            const tier = playerStats ? 
              this.calculatePlayerTierFromStats(playerStats, tournament.format) : 
              this.calculatePlayerTier(player);
            
            allPlayers.push({
              tournamentId: tournament.id,
              playerId: player.apiPlayerId || player.id || `${player.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
              cricketDataPlayerId: playerStats?.cricketDataPlayerId || null, // CricketData player ID (if stats came from CricketData)
              playerName: player.name,
              role: player.role,
              team: player.team,
              tier: tier,
              basePrice: TIER_PRICES[tier],
              overallStats: JSON.stringify(playerStats || player.overallStats || {}),
              vsOpponentStats: JSON.stringify({}), // Will be populated when match data is available
              statsSource: playerStats ? 'cricketdata' : 'none' // Track where stats came from
            });
            
            // Small delay to avoid rate limiting (only if fetching from API, not cache)
            if (playerStats) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (playerError) {
            console.warn(`⚠️  Error processing player ${player.name}:`, playerError.message);
            // Add player with default tier if stats fetching fails
            allPlayers.push({
              tournamentId: tournament.id,
              playerId: player.apiPlayerId || player.id || `${player.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
              playerName: player.name,
              role: player.role,
              team: player.team,
              tier: 'D',
              basePrice: TIER_PRICES['D'],
              overallStats: JSON.stringify({}),
              vsOpponentStats: JSON.stringify({})
            });
          }
        }
      } catch (squadError) {
        console.error(`❌ Error fetching squads:`, squadError.message);
        throw new Error(`Failed to fetch player squads: ${squadError.message}`);
      }

      console.log(`📊 Total players to create: ${allPlayers.length}`);
      
      // Count how many got stats
      const playersWithStats = allPlayers.filter(p => {
        try {
          const stats = JSON.parse(p.overallStats);
          return stats.batting && stats.batting.runs > 0;
        } catch {
          return false;
        }
      });
      
      console.log(`📊 Players with career stats: ${playersWithStats.length}/${allPlayers.length}`);
      if (playersWithStats.length < allPlayers.length) {
        console.log(`⚠️  ${allPlayers.length - playersWithStats.length} players without stats (quota/API limits)`);
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

