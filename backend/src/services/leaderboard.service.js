const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const leaderboardService = {
  /**
   * Generate mock leaderboard data with detailed player breakdowns
   * This is Phase 1 - will be replaced with real scoring in Phase 2
   */
  async generateMockLeaderboard(tournamentId, matchId = null) {
    // Get tournament with participants
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Get series from SeriesCache
    const series = await prisma.seriesCache.findUnique({
      where: { id: tournament.seriesId }
    });

    // Get matches for this series from MatchCache
    const matches = await prisma.matchCache.findMany({
      where: { apiSeriesId: series?.apiSeriesId || 'none' },
      orderBy: { matchDate: 'asc' }
    });

    // Get all teams in tournament
    const teams = await prisma.team.findMany({
      where: { tournamentId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        players: true
      }
    });

    // Parse scoring rules
    const battingRules = typeof tournament.battingRules === 'string' 
      ? JSON.parse(tournament.battingRules) 
      : tournament.battingRules;
    const bowlingRules = typeof tournament.bowlingRules === 'string'
      ? JSON.parse(tournament.bowlingRules)
      : tournament.bowlingRules;
    const fieldingRules = typeof tournament.fieldingRules === 'string'
      ? JSON.parse(tournament.fieldingRules)
      : tournament.fieldingRules;
    const captainRules = typeof tournament.captainRules === 'string'
      ? JSON.parse(tournament.captainRules)
      : tournament.captainRules;
    const awardRules = typeof tournament.awardRules === 'string'
      ? JSON.parse(tournament.awardRules)
      : tournament.awardRules;

    // Determine which matches to consider
    const matchesToConsider = matchId 
      ? matches.filter(m => m.id === matchId || m.apiMatchId === matchId)
      : matches.slice(0, 2); // First 2 matches for "completed" simulation

    console.log(`[Leaderboard] Filtering for matchId: ${matchId}`);
    console.log(`[Leaderboard] Total matches available: ${matches.length}`);
    console.log(`[Leaderboard] Matches to consider: ${matchesToConsider.length}`);

    // Generate mock leaderboard
    const leaderboard = teams.map((team, teamIndex) => {
      const playerBreakdowns = [];
      let teamTotalPoints = 0;

      // Generate mock data for each player in the team
      team.players.forEach((player, playerIndex) => {
        const matchScores = matchesToConsider.map((match, matchIndex) => {
          const mockStats = this.generateMockPlayerStats(player.role, playerIndex, matchIndex);
          const points = this.calculatePoints(
            mockStats, 
            battingRules, 
            bowlingRules, 
            fieldingRules, 
            awardRules,
            captainRules,
            player.isCaptain,
            player.isViceCaptain
          );

          return {
            matchId: match.id || match.apiMatchId,
            matchNumber: matchIndex + 1,
            stats: mockStats,
            points: points
          };
        });

        const totalPlayerPoints = matchScores.reduce((sum, ms) => sum + ms.points.finalPoints, 0);
        teamTotalPoints += totalPlayerPoints;

        playerBreakdowns.push({
          playerId: player.id,
          playerName: player.playerName,
          role: player.role,
          isCaptain: player.isCaptain || false,
          isViceCaptain: player.isViceCaptain || false,
          purchasePrice: player.purchasePrice,
          matchScores: matchScores
        });
      });

      return {
        teamId: team.id,
        teamName: team.name || `Team ${team.user.name}`,
        ownerId: team.user.id,
        ownerName: team.user.name,
        ownerEmail: team.user.email,
        totalPoints: teamTotalPoints,
        playerCount: team.players.length,
        walletBalance: team.walletBalance,
        players: playerBreakdowns
      };
    });

    // Sort by total points descending
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    // Add ranks
    leaderboard.forEach((team, index) => {
      team.rank = index + 1;
    });

    return {
      tournamentId,
      tournamentName: tournament.name,
      seriesName: series?.name || 'Unknown Series',
      matchId: matchId || null,
      totalMatches: matches.length,
      completedMatches: matchesToConsider.length,
      leaderboard
    };
  },

  /**
   * Generate realistic mock stats for a player based on role
   */
  generateMockPlayerStats(role, playerIndex, matchIndex) {
    // Add randomness but keep it realistic
    const randomFactor = Math.random() * 0.5 + 0.75; // 0.75 to 1.25

    const stats = {
      runs: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
      wickets: 0,
      ballsBowled: 0,
      runsConceded: 0,
      maidens: 0,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
      isManOfMatch: false
    };

    // Batsman
    if (role === 'Batsman') {
      stats.runs = Math.floor((40 + playerIndex * 15 + matchIndex * 10) * randomFactor);
      stats.ballsFaced = Math.floor(stats.runs * 0.8);
      stats.fours = Math.floor(stats.runs / 10);
      stats.sixes = Math.floor(stats.runs / 20);
      stats.wickets = 0;
      stats.ballsBowled = 0;
      stats.catches = Math.floor(Math.random() * 2);
    }
    
    // Bowler
    else if (role === 'Bowler') {
      stats.runs = Math.floor((10 + playerIndex * 5) * randomFactor);
      stats.ballsFaced = Math.floor(stats.runs * 1.2);
      stats.fours = Math.floor(stats.runs / 15);
      stats.sixes = 0;
      stats.wickets = Math.floor((2 + matchIndex) * randomFactor);
      stats.ballsBowled = 36 + playerIndex * 6; // 6+ overs
      stats.runsConceded = Math.floor((30 + playerIndex * 10) * randomFactor);
      stats.maidens = Math.floor(Math.random() * 2);
      stats.catches = Math.floor(Math.random() * 2);
    }
    
    // All-Rounder
    else if (role === 'All-Rounder') {
      stats.runs = Math.floor((35 + playerIndex * 10 + matchIndex * 8) * randomFactor);
      stats.ballsFaced = Math.floor(stats.runs * 0.9);
      stats.fours = Math.floor(stats.runs / 12);
      stats.sixes = Math.floor(stats.runs / 25);
      stats.wickets = Math.floor((1 + matchIndex * 0.5) * randomFactor);
      stats.ballsBowled = 24 + playerIndex * 6; // 4+ overs
      stats.runsConceded = Math.floor((25 + playerIndex * 8) * randomFactor);
      stats.maidens = Math.floor(Math.random() * 1);
      stats.catches = Math.floor(Math.random() * 2);
    }
    
    // Wicket-Keeper
    else if (role === 'Wicket-Keeper') {
      stats.runs = Math.floor((30 + playerIndex * 12) * randomFactor);
      stats.ballsFaced = Math.floor(stats.runs * 0.85);
      stats.fours = Math.floor(stats.runs / 11);
      stats.sixes = Math.floor(stats.runs / 22);
      stats.catches = Math.floor((2 + matchIndex) * randomFactor);
      stats.stumpings = Math.floor(Math.random() * 2);
    }

    // Randomly assign Man of the Match to top performer
    if (playerIndex === 0 && matchIndex === 0) {
      stats.isManOfMatch = Math.random() > 0.7;
    }

    return stats;
  },

  /**
   * Calculate fantasy points from stats
   */
  calculatePoints(stats, battingRules, bowlingRules, fieldingRules, awardRules, captainRules, isCaptain, isViceCaptain) {
    const breakdown = {
      batting: {},
      bowling: {},
      fielding: {},
      awards: {},
      basePoints: 0,
      multiplier: 1,
      finalPoints: 0
    };

    // BATTING POINTS
    breakdown.batting.runs = stats.runs * (battingRules.run || 1);
    breakdown.batting.fours = stats.fours * (battingRules.four || 2);
    breakdown.batting.sixes = stats.sixes * (battingRules.six || 6);
    
    // Milestones
    breakdown.batting.milestone = 0;
    if (stats.runs >= 100) {
      breakdown.batting.milestone = battingRules.century || 16;
    } else if (stats.runs >= 50) {
      breakdown.batting.milestone = battingRules.fifty || 8;
    } else if (stats.runs === 0 && stats.ballsFaced > 0) {
      breakdown.batting.milestone = battingRules.duck || -2;
    }

    // Strike rate bonus
    breakdown.batting.strikeRateBonus = 0;
    if (stats.ballsFaced >= 10 && battingRules.strikeRateBonus?.enabled) {
      const strikeRate = (stats.runs / stats.ballsFaced) * 100;
      for (const range of battingRules.strikeRateBonus.ranges || []) {
        if (strikeRate >= range.min && (!range.max || strikeRate <= range.max)) {
          breakdown.batting.strikeRateBonus = range.points;
          break;
        }
      }
    }

    // BOWLING POINTS
    breakdown.bowling.wickets = stats.wickets * (bowlingRules.wicket || 25);
    breakdown.bowling.maidens = stats.maidens * (bowlingRules.maiden || 10);
    
    // Wicket hauls
    breakdown.bowling.wicketHaul = 0;
    if (stats.wickets >= 5) {
      breakdown.bowling.wicketHaul = bowlingRules.fiveWicketHaul || 16;
    } else if (stats.wickets >= 3) {
      breakdown.bowling.wicketHaul = bowlingRules.threeWicketHaul || 8;
    }

    // Economy rate bonus
    breakdown.bowling.economyBonus = 0;
    if (stats.ballsBowled >= 12 && bowlingRules.economyRateBonus?.enabled) {
      const overs = stats.ballsBowled / 6;
      const economy = stats.runsConceded / overs;
      for (const range of bowlingRules.economyRateBonus.ranges || []) {
        if (economy >= range.min && economy <= range.max) {
          breakdown.bowling.economyBonus = range.points;
          break;
        }
      }
    }

    // FIELDING POINTS
    breakdown.fielding.catches = stats.catches * (fieldingRules.catch || 8);
    breakdown.fielding.runOuts = stats.runOuts * (fieldingRules.runOut || 12);
    breakdown.fielding.stumpings = stats.stumpings * (fieldingRules.stumping || 12);

    // AWARDS
    breakdown.awards.manOfMatch = stats.isManOfMatch ? (awardRules.manOfTheMatch || 25) : 0;

    // Calculate base points
    breakdown.basePoints = 
      Object.values(breakdown.batting).reduce((sum, val) => sum + val, 0) +
      Object.values(breakdown.bowling).reduce((sum, val) => sum + val, 0) +
      Object.values(breakdown.fielding).reduce((sum, val) => sum + val, 0) +
      breakdown.awards.manOfMatch;

    // Apply captain/vice-captain multiplier
    if (captainRules?.enabled && isCaptain) {
      breakdown.multiplier = captainRules.captainMultiplier || 2;
    } else if (captainRules?.enabled && isViceCaptain) {
      breakdown.multiplier = captainRules.viceCaptainMultiplier || 1.5;
    }

    breakdown.finalPoints = Math.round(breakdown.basePoints * breakdown.multiplier);

    return breakdown;
  }
};

module.exports = leaderboardService;

