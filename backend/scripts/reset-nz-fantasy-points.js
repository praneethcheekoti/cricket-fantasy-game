/**
 * ONE-TIME SCRIPT: Reset fantasy points for "NZ ODI series" tournament
 * This will:
 * 1. Delete all MatchPlayerScore records for this tournament
 * 2. Reset Man of Match selections on matches
 * 
 * After running this, you can:
 * - Select Man of the Match for each match
 * - Recalculate fantasy points
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TOURNAMENT_ID = '695e7e4667b7ba1edfe832a6'; // NZ ODI series

async function resetFantasyPoints() {
  console.log('🔧 Resetting fantasy points for NZ ODI series...\n');

  // Verify tournament exists
  const tournament = await prisma.tournament.findUnique({
    where: { id: TOURNAMENT_ID },
    select: { id: true, name: true }
  });

  if (!tournament) {
    console.log('❌ Tournament not found!');
    return;
  }

  console.log(`📋 Tournament: "${tournament.name}" (ID: ${tournament.id})\n`);

  // Get all teams for this tournament
  const teams = await prisma.team.findMany({
    where: { tournamentId: TOURNAMENT_ID },
    include: {
      players: {
        select: { id: true }
      }
    }
  });

  console.log(`   Found ${teams.length} teams`);

  // Get all TeamPlayer IDs
  const teamPlayerIds = teams.flatMap(team => team.players.map(p => p.id));
  console.log(`   Found ${teamPlayerIds.length} team players total\n`);

  // Find all MatchPlayerScore records for these team players
  const existingScores = await prisma.matchPlayerScore.findMany({
    where: {
      teamPlayerId: { in: teamPlayerIds }
    },
    select: {
      id: true,
      matchId: true
    }
  });

  console.log(`   Found ${existingScores.length} MatchPlayerScore records to delete\n`);

  if (existingScores.length === 0) {
    console.log('✅ No fantasy points to reset. Already clean!');
    return;
  }

  // Get unique match IDs
  const matchIds = [...new Set(existingScores.map(s => s.matchId))];
  console.log(`   Affected matches: ${matchIds.length}\n`);

  // Confirm before proceeding
  console.log('⚠️  This will DELETE all calculated fantasy points and reset Man of Match selections!');
  console.log('   Proceeding in 3 seconds...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Delete all MatchPlayerScore records
  const deleteResult = await prisma.matchPlayerScore.deleteMany({
    where: {
      teamPlayerId: { in: teamPlayerIds }
    }
  });

  console.log(`✅ Deleted ${deleteResult.count} MatchPlayerScore records`);

  // Reset Man of Match on affected matches
  const updateResult = await prisma.match.updateMany({
    where: {
      id: { in: matchIds }
    },
    data: {
      manOfMatchPlayerId: null,
      manOfMatchName: null
    }
  });

  console.log(`✅ Reset Man of Match for ${updateResult.count} matches`);

  console.log('\n🎉 Done! You can now:');
  console.log('   1. Go to Match Center');
  console.log('   2. Select Man of the Match for each completed match');
  console.log('   3. Click "Calculate Fantasy Points" for each match');
}

resetFantasyPoints()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

