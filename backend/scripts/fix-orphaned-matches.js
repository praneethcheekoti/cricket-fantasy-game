/**
 * Fix Orphaned Matches - Create Series Record for Existing Matches
 * Usage: node backend/scripts/fix-orphaned-matches.js "TOURNAMENT_ID"
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOrphanedMatches(tournamentId) {
  console.log(`\n🔧 [FIX] Fixing orphaned matches for tournament: ${tournamentId}\n`);

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

    console.log('📊 Tournament:');
    console.log(`   Name: ${tournament.name}`);
    console.log(`   Series Name: ${tournament.seriesName}`);
    console.log(`   API Series ID: ${tournament.apiSeriesId}`);
    console.log(`   Current Series ID: ${tournament.seriesId}`);
    console.log(`   Format: ${tournament.format}`);
    console.log();

    // 2. Check if Series exists
    const existingSeries = await prisma.series.findUnique({
      where: { id: tournament.seriesId }
    });

    if (existingSeries) {
      console.log('✅ Series record exists - no fix needed');
      console.log(`   Series: ${existingSeries.name}`);
      console.log();
      process.exit(0);
    }

    console.log('⚠️  Series record NOT found (was deleted from cache)');
    console.log('   Creating new Series record...');
    console.log();

    // 3. Find orphaned matches
    const orphanedMatches = await prisma.match.findMany({
      where: {
        seriesId: tournament.seriesId
      }
    });

    console.log(`📋 Found ${orphanedMatches.length} orphaned Match records`);
    if (orphanedMatches.length > 0) {
      orphanedMatches.forEach((m, idx) => {
        console.log(`   ${idx + 1}. ${m.team1} vs ${m.team2} (${m.status})`);
      });
      console.log();
    }

    // 4. Create new Series record with same ID
    console.log('🔨 Creating new Series record...');
    
    // Get date range from matches
    const matchDates = orphanedMatches.map(m => m.matchDate).sort((a, b) => a - b);
    const startDate = matchDates[0] || new Date();
    const endDate = matchDates[matchDates.length - 1] || new Date();

    // Get unique teams from matches
    const teams = [...new Set(orphanedMatches.flatMap(m => [m.team1, m.team2]))];

    const newSeries = await prisma.series.create({
      data: {
        id: tournament.seriesId, // Use same ID so we don't have to update anything
        name: tournament.seriesName || 'Unknown Series',
        format: tournament.format,
        gender: 'Men', // Default, can be updated
        startDate: startDate,
        endDate: endDate,
        teams: JSON.stringify(teams),
        status: tournament.status === 'completed' ? 'completed' : 'ongoing'
      }
    });

    console.log('✅ Series record created:');
    console.log(`   ID: ${newSeries.id}`);
    console.log(`   Name: ${newSeries.name}`);
    console.log(`   Format: ${newSeries.format}`);
    console.log(`   Matches: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
    console.log(`   Teams: ${teams.join(', ')}`);
    console.log();

    // 5. Verify matches are now accessible
    const verifyMatches = await prisma.match.findMany({
      where: {
        seriesId: tournament.seriesId
      },
      include: {
        series: true
      }
    });

    console.log(`✅ Verification: ${verifyMatches.length} matches now have valid Series link`);
    console.log();

    console.log('─'.repeat(80));
    console.log('\n🎉 Fix Complete!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Go to Match Center page');
    console.log('   2. Click "Refresh Matches" (or it will auto-load)');
    console.log('   3. You should now see all 3 matches');
    console.log('   4. Click "Calculate Points" for completed matches');
    console.log();

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
  console.log('   node backend/scripts/fix-orphaned-matches.js "TOURNAMENT_ID"');
  console.log('\n📝 Example:');
  console.log('   node backend/scripts/fix-orphaned-matches.js "692bea01c125e64c1ca42de9"');
  console.log();
  process.exit(1);
}

fixOrphanedMatches(tournamentId);





