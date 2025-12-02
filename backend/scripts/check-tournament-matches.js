/**
 * Check Tournament Matches and Match Player Scores
 * Usage: node backend/scripts/check-tournament-matches.js "TOURNAMENT_ID"
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTournamentMatches(tournamentId) {
  console.log(`\n🔍 [CHECK] Checking matches for tournament: ${tournamentId}\n`);

  try {
    // 1. Get tournament details
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        seriesName: true,
        apiSeriesId: true,
        seriesId: true,
        format: true,
        status: true
      }
    });

    if (!tournament) {
      console.log('❌ Tournament not found\n');
      process.exit(1);
    }

    console.log('📊 Tournament Details:');
    console.log(`   Name: ${tournament.name}`);
    console.log(`   Series: ${tournament.seriesName || 'N/A'}`);
    console.log(`   API Series ID: ${tournament.apiSeriesId || 'N/A'}`);
    console.log(`   Format: ${tournament.format}`);
    console.log(`   Status: ${tournament.status}`);
    console.log();

    // 2. Get seriesId from tournament
    const seriesId = tournament.seriesId;

    console.log(`🔗 Internal Series ID: ${seriesId}`);

    // Check if Series still exists
    const series = await prisma.series.findUnique({
      where: { id: seriesId }
    });

    if (series) {
      console.log(`   Series found: ${series.name}`);
    } else {
      console.log(`   ⚠️  Series not found in database (may have been deleted)`);
    }
    console.log();

    // 3. Check matches in Match table by seriesId
    const matches = await prisma.match.findMany({
      where: {
        seriesId: seriesId
      },
      orderBy: {
        matchDate: 'asc'
      }
    });

    console.log(`📋 Matches in Match Table (seriesId: ${seriesId}):`);
    console.log(`   Found ${matches.length} matches`);
    
    if (matches.length > 0) {
      console.log();
      matches.forEach((match, index) => {
        console.log(`   ${index + 1}. ${match.team1} vs ${match.team2}`);
        console.log(`      Match ID: ${match.id}`);
        console.log(`      Match Desc: ${match.matchDesc || 'N/A'}`);
        console.log(`      Format: ${match.format}`);
        console.log(`      Status: ${match.status}`);
        console.log(`      External Match ID: ${match.externalMatchId || 'N/A'}`);
        console.log(`      Date: ${match.matchDate.toLocaleDateString()}`);
        console.log();
      });
    }

    // 4. Get teams for this tournament
    const teams = await prisma.team.findMany({
      where: { tournamentId: tournament.id },
      include: {
        user: { select: { name: true } },
        players: true
      }
    });

    console.log(`👥 Teams in Tournament: ${teams.length}`);
    teams.forEach((team, idx) => {
      console.log(`   ${idx + 1}. ${team.user.name} - ${team.players.length} players`);
    });
    console.log();

    // 5. Check if any MatchPlayerScore records exist
    // We need to find them through TeamPlayer -> Team -> Tournament
    const matchPlayerScores = await prisma.matchPlayerScore.findMany({
      where: {
        teamPlayer: {
          team: {
            tournamentId: tournament.id
          }
        }
      },
      include: {
        match: true,
        teamPlayer: {
          include: {
            team: {
              include: {
                user: { select: { name: true } }
              }
            }
          }
        }
      }
    });

    console.log(`🎯 Match Player Scores: ${matchPlayerScores.length} records found`);
    
    if (matchPlayerScores.length > 0) {
      // Group by match
      const scoresByMatch = {};
      matchPlayerScores.forEach(score => {
        const matchKey = score.matchId;
        if (!scoresByMatch[matchKey]) {
          scoresByMatch[matchKey] = {
            match: score.match,
            scores: []
          };
        }
        scoresByMatch[matchKey].scores.push(score);
      });

      console.log(`\n   Matches with scores: ${Object.keys(scoresByMatch).length}`);
      Object.values(scoresByMatch).forEach((matchData, idx) => {
        console.log(`\n   Match ${idx + 1}:`);
        console.log(`      ${matchData.match.team1} vs ${matchData.match.team2}`);
        console.log(`      Status: ${matchData.match.status}`);
        console.log(`      External Match ID: ${matchData.match.externalMatchId || 'N/A'}`);
        console.log(`      Player scores: ${matchData.scores.length}`);
        
        // Show breakdown by team
        const scoresByTeam = {};
        matchData.scores.forEach(score => {
          const teamName = score.teamPlayer.team.user.name;
          if (!scoresByTeam[teamName]) {
            scoresByTeam[teamName] = [];
          }
          scoresByTeam[teamName].push(score);
        });
        
        Object.entries(scoresByTeam).forEach(([teamName, scores]) => {
          const totalPoints = scores.reduce((sum, s) => sum + s.fantasyPoints, 0);
          console.log(`         ${teamName}: ${scores.length} players, ${totalPoints.toFixed(1)} points`);
        });
      });
    } else {
      console.log('   ⚠️  No match player scores found');
      console.log('   This means fantasy points have not been calculated yet');
    }

    console.log('\n' + '─'.repeat(80));
    console.log('\n💡 Summary:');
    console.log(`   - Tournament: ${tournament.name}`);
    console.log(`   - Teams: ${teams.length}`);
    console.log(`   - Matches in series: ${matches.length}`);
    console.log(`   - Match player score records: ${matchPlayerScores.length}`);
    console.log(`   - Unique matches with scores: ${matchPlayerScores.length > 0 ? Object.keys(matchPlayerScores.reduce((acc, s) => ({ ...acc, [s.matchId]: true }), {})).length : 0}`);
    console.log();

    if (matchPlayerScores.length === 0) {
      console.log('⚠️  No fantasy points calculated yet!');
      console.log('   Go to Match Center and click "Calculate Points" for completed matches');
      console.log();
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const tournamentId = process.argv[2];

if (!tournamentId) {
  console.error('\n❌ Error: Tournament ID is required!');
  console.log('\n📖 Usage:');
  console.log('   node backend/scripts/check-tournament-matches.js "TOURNAMENT_ID"');
  console.log('\n📝 Example:');
  console.log('   node backend/scripts/check-tournament-matches.js "692bea01c125e64c1ca42de9"');
  console.log();
  process.exit(1);
}

checkTournamentMatches(tournamentId);

