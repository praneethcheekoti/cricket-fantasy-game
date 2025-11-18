const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const scoringService = {
  /**
   * Calculate fantasy points for all players in a match for a tournament
   */
  async calculateMatchPoints(tournamentId, matchId) {
    // Get tournament rules
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    const battingRules = JSON.parse(tournament.battingRules);
    const bowlingRules = JSON.parse(tournament.bowlingRules);
    const fieldingRules = JSON.parse(tournament.fieldingRules);
    const captainRules = JSON.parse(tournament.captainRules);
    const awardRules = JSON.parse(tournament.awardRules);

    // Get all teams in this tournament
    const teams = await prisma.team.findMany({
      where: { tournamentId },
      include: {
        players: true
      }
    });

    // For each team, calculate points for their players
    for (const team of teams) {
      for (const teamPlayer of team.players) {
        // Get player's performance in this match
        const performance = await prisma.matchPlayerScore.findUnique({
          where: {
            matchId_teamPlayerId: {
              matchId,
              teamPlayerId: teamPlayer.id
            }
          }
        });

        if (!performance) {
          continue; // Player didn't play in this match
        }

        // Calculate points
        let points = 0;

        // BATTING POINTS
        points += performance.runs * battingRules.run;
        points += performance.fours * battingRules.four;
        points += performance.sixes * battingRules.six;

        // Milestones
        if (performance.runs >= 100) {
          points += battingRules.century;
        } else if (performance.runs >= 50) {
          points += battingRules.fifty;
        } else if (performance.runs === 0 && performance.ballsFaced > 0) {
          points += battingRules.duck;
        }

        // Strike rate bonus (only if faced significant balls)
        if (performance.ballsFaced >= 10 && battingRules.strikeRateBonus.enabled) {
          const strikeRate = (performance.runs / performance.ballsFaced) * 100;
          for (const range of battingRules.strikeRateBonus.ranges) {
            if (strikeRate >= range.min && strikeRate <= range.max) {
              points += range.points;
              break;
            }
          }
        }

        // BOWLING POINTS
        points += performance.wickets * bowlingRules.wicket;
        points += performance.maidens * bowlingRules.maiden;

        // Wicket hauls
        if (performance.wickets >= 5) {
          points += bowlingRules.fiveWicketHaul;
        } else if (performance.wickets >= 3) {
          points += bowlingRules.threeWicketHaul;
        }

        // Economy rate bonus (only if bowled significant overs)
        if (performance.ballsBowled >= 12 && bowlingRules.economyRateBonus.enabled) {
          const overs = performance.ballsBowled / 6;
          const economy = performance.runsConceded / overs;
          
          for (const range of bowlingRules.economyRateBonus.ranges) {
            if (economy >= range.min && economy <= range.max) {
              points += range.points;
              break;
            }
          }
        }

        // FIELDING POINTS
        points += performance.catches * fieldingRules.catch;
        points += performance.runOuts * fieldingRules.runOut;
        points += performance.stumpings * fieldingRules.stumping;

        // AWARDS
        if (performance.isManOfMatch) {
          points += awardRules.manOfTheMatch;
        }

        // CAPTAIN/VICE-CAPTAIN MULTIPLIER
        let finalPoints = points;
        if (captainRules.enabled) {
          if (teamPlayer.isCaptain) {
            finalPoints = points * captainRules.captainMultiplier;
          } else if (teamPlayer.isViceCaptain) {
            finalPoints = points * captainRules.viceCaptainMultiplier;
          }
        }

        // Update fantasy points
        await prisma.matchPlayerScore.update({
          where: {
            matchId_teamPlayerId: {
              matchId,
              teamPlayerId: teamPlayer.id
            }
          },
          data: {
            fantasyPoints: finalPoints
          }
        });

        console.log(`✅ Calculated ${finalPoints} points for ${teamPlayer.playerName} in team ${team.name}`);
      }
    }
  },

  /**
   * Calculate leaderboard for a tournament
   */
  async calculateLeaderboard(tournamentId, matchId = null) {
    const teams = await prisma.team.findMany({
      where: { tournamentId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        players: {
          include: {
            matchScores: matchId ? {
              where: { matchId }
            } : true
          }
        }
      }
    });

    const leaderboard = teams.map(team => {
      let totalPoints = 0;
      
      team.players.forEach(player => {
        player.matchScores.forEach(score => {
          totalPoints += score.fantasyPoints;
        });
      });

      return {
        teamId: team.id,
        teamName: team.name,
        owner: team.user.name,
        totalPoints: totalPoints,
        playerCount: team.players.length,
        walletBalance: team.walletBalance
      };
    });

    // Sort by points descending
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    // Add ranks
    leaderboard.forEach((team, index) => {
      team.rank = index + 1;
    });

    return {
      matchId: matchId || null,
      leaderboard
    };
  },

  /**
   * Get detailed match scores for a tournament
   */
  async getMatchScoresForTournament(tournamentId, matchId) {
    const teams = await prisma.team.findMany({
      where: { tournamentId },
      include: {
        user: {
          select: { name: true }
        },
        players: {
          include: {
            matchScores: {
              where: { matchId }
            }
          }
        }
      }
    });

    const results = [];

    for (const team of teams) {
      const playerScores = team.players
        .filter(p => p.matchScores.length > 0)
        .map(player => {
          const score = player.matchScores[0];
          return {
            playerName: player.playerName,
            role: player.role,
            isCaptain: player.isCaptain,
            isViceCaptain: player.isViceCaptain,
            runs: score.runs,
            wickets: score.wickets,
            catches: score.catches,
            fantasyPoints: score.fantasyPoints
          };
        });

      const totalPoints = playerScores.reduce((sum, p) => sum + p.fantasyPoints, 0);

      results.push({
        teamName: team.name,
        owner: team.user.name,
        totalPoints,
        players: playerScores.sort((a, b) => b.fantasyPoints - a.fantasyPoints)
      });
    }

    // Sort teams by total points
    results.sort((a, b) => b.totalPoints - a.totalPoints);

    return results;
  }
};

module.exports = scoringService;
module.exports.calculateLeaderboard = scoringService.calculateLeaderboard;

