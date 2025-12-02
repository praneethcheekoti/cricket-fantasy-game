/**
 * Backfill Matches from MatchCache to Match Table
 * Usage: node backend/scripts/backfill-matches-from-cache.js "TOURNAMENT_ID"
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfillMatches(tournamentId) {
  console.log(`\n🔄 [BACKFILL] Backfilling matches for tournament: ${tournamentId}\n`);

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
        format: true
      }
    });

    if (!tournament) {
      console.log('❌ Tournament not found\n');
      process.exit(1);
    }

    console.log('📊 Tournament:');
    console.log(`   Name: ${tournament.name}`);
    console.log(`   Series: ${tournament.seriesName}`);
    console.log(`   API Series ID: ${tournament.apiSeriesId}`);
    console.log(`   Internal Series ID: ${tournament.seriesId}`);
    console.log(`   Format: ${tournament.format}`);
    console.log();

    // 2. Check existing matches in Match table
    const existingMatches = await prisma.match.findMany({
      where: {
        seriesId: tournament.seriesId
      }
    });

    console.log(`📋 Existing Matches in Match Table: ${existingMatches.length}`);
    if (existingMatches.length > 0) {
      existingMatches.forEach((m, idx) => {
        console.log(`   ${idx + 1}. ${m.team1} vs ${m.team2} (${m.status}) - External ID: ${m.externalMatchId}`);
      });
    }
    console.log();

    // 3. Find matches in MatchCache
    const cachedMatches = await prisma.matchCache.findMany({
      where: {
        apiSeriesId: tournament.apiSeriesId
      },
      orderBy: {
        matchDate: 'asc'
      }
    });

    console.log(`💾 Matches in MatchCache: ${cachedMatches.length}`);
    if (cachedMatches.length === 0) {
      console.log('   ⚠️  No cached matches found for this series');
      console.log('   This is normal if cache expired or matches were never fetched');
      console.log();
      
      if (existingMatches.length > 0) {
        console.log('✅ But Match table already has data, so we\'re good!');
        console.log();
      } else {
        console.log('⚠️  No data in cache or Match table.');
        console.log('   You\'ll need to fetch fresh data from API or create new tournament.');
        console.log();
      }
      
      process.exit(0);
    }

    // 4. Filter cached matches by tournament format
    const filteredCachedMatches = cachedMatches.filter(m => 
      m.format.toLowerCase() === tournament.format.toLowerCase()
    );

    console.log(`   🔍 Filtered to ${filteredCachedMatches.length} ${tournament.format} matches`);
    filteredCachedMatches.forEach((m, idx) => {
      const metadata = m.metadata ? JSON.parse(m.metadata) : {};
      console.log(`   ${idx + 1}. ${m.team1} vs ${m.team2} (${m.status})`);
      console.log(`      Match Desc: ${metadata.matchDesc || 'N/A'}`);
      console.log(`      API Match ID: ${m.apiMatchId}`);
      console.log(`      Date: ${m.matchDate.toLocaleDateString()}`);
    });
    console.log();

    // 5. Backfill matches
    let created = 0;
    let skipped = 0;

    console.log('🔨 Backfilling matches...');
    console.log();

    for (const cachedMatch of filteredCachedMatches) {
      // Check if match already exists
      const exists = existingMatches.find(m => m.externalMatchId === cachedMatch.apiMatchId);

      if (exists) {
        console.log(`   ⏭️  Skipped: ${cachedMatch.team1} vs ${cachedMatch.team2} (already exists)`);
        skipped++;
        continue;
      }

      // Extract matchDesc from metadata
      let matchDesc = null;
      if (cachedMatch.metadata) {
        try {
          const metadata = typeof cachedMatch.metadata === 'string' 
            ? JSON.parse(cachedMatch.metadata) 
            : cachedMatch.metadata;
          matchDesc = metadata.matchDesc || null;
        } catch (e) {
          console.warn(`   ⚠️  Could not parse metadata for ${cachedMatch.apiMatchId}`);
        }
      }

      // Create Match record
      await prisma.match.create({
        data: {
          seriesId: tournament.seriesId,
          matchNumber: created + 1,
          matchDesc: matchDesc,
          team1: cachedMatch.team1,
          team2: cachedMatch.team2,
          venue: cachedMatch.venue,
          matchDate: cachedMatch.matchDate,
          format: cachedMatch.format,
          status: cachedMatch.status,
          externalMatchId: cachedMatch.apiMatchId
        }
      });

      console.log(`   ✅ Created: ${cachedMatch.team1} vs ${cachedMatch.team2}`);
      console.log(`      Match Desc: ${matchDesc || 'N/A'}`);
      console.log(`      Status: ${cachedMatch.status}`);
      created++;
    }

    console.log();
    console.log('─'.repeat(80));
    console.log('\n📊 Backfill Summary:');
    console.log(`   ✅ Created: ${created} matches`);
    console.log(`   ⏭️  Skipped: ${skipped} matches (already existed)`);
    console.log(`   📋 Total in Match table: ${existingMatches.length + created} matches`);
    console.log();

    if (created > 0) {
      console.log('🎉 Backfill Complete!');
      console.log('\n📋 Next Steps:');
      console.log('   1. Go to Match Center page');
      console.log('   2. Click "Refresh Matches" (should show without API call)');
      console.log('   3. Click "Calculate Points" for completed matches');
      console.log();
    } else {
      console.log('✅ No changes needed - all matches already in database');
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
  console.log('   node backend/scripts/backfill-matches-from-cache.js "TOURNAMENT_ID"');
  console.log('\n📝 Example:');
  console.log('   node backend/scripts/backfill-matches-from-cache.js "692bea01c125e64c1ca42de9"');
  console.log();
  process.exit(1);
}

backfillMatches(tournamentId);

