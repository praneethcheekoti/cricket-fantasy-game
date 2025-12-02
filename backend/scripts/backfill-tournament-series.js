/**
 * Backfill Script: Update existing tournaments with apiSeriesId and seriesName
 * Usage: node backend/scripts/backfill-tournament-series.js "Series Name"
 */

const { PrismaClient } = require('@prisma/client');
const cricketApiService = require('../src/services/cricket-api');

const prisma = new PrismaClient();

async function backfillTournamentSeries(seriesName) {
  console.log('\n🔧 [BACKFILL] Starting tournament series backfill...');
  console.log(`🔍 [BACKFILL] Looking for series: "${seriesName}"\n`);

  try {
    // Step 1: Find the series in SeriesCache (Prisma)
    const cachedSeries = await prisma.seriesCache.findMany({
      where: {
        name: {
          contains: seriesName,
          mode: 'insensitive'
        }
      }
    });
    
    let series = cachedSeries.length > 0 ? cachedSeries[0] : null;
    
    if (!series) {
      console.log('❌ [BACKFILL] Series not found in SeriesCache.');
      console.log('🌐 [BACKFILL] Attempting to fetch from API...\n');
      
      // Try to fetch from API
      const allSeries = await cricketApiService.getSeries();
      series = allSeries.find(s => 
        s.name.toLowerCase().includes(seriesName.toLowerCase())
      );
      
      if (!series) {
        console.error(`❌ [BACKFILL] Series "${seriesName}" not found in API either.`);
        console.log('\n💡 [BACKFILL] Available series:');
        allSeries.slice(0, 10).forEach(s => console.log(`   - ${s.name} (API ID: ${s.apiSeriesId})`));
        process.exit(1);
      }
    }

    console.log('✅ [BACKFILL] Series found:');
    console.log(`   📋 Name: ${series.name}`);
    console.log(`   🆔 API Series ID: ${series.apiSeriesId}`);
    console.log();

    // Step 2: Find tournaments with NULL or missing apiSeriesId
    const allTournaments = await prisma.tournament.findMany();
    const tournamentsToUpdate = allTournaments.filter(t => !t.apiSeriesId);

    if (tournamentsToUpdate.length === 0) {
      console.log('✅ [BACKFILL] No tournaments need updating. All good!');
      await prisma.$disconnect();
      process.exit(0);
    }

    console.log(`🎯 [BACKFILL] Found ${tournamentsToUpdate.length} tournament(s) to update:\n`);
    
    tournamentsToUpdate.forEach((t, index) => {
      console.log(`   ${index + 1}. ${t.name} (ID: ${t.id})`);
    });
    console.log();

    // Step 3: Update all tournaments individually
    const updatePromises = tournamentsToUpdate.map(t =>
      prisma.tournament.update({
        where: { id: t.id },
        data: {
          apiSeriesId: series.apiSeriesId,
          seriesName: series.name
        }
      })
    );
    
    await Promise.all(updatePromises);
    const updateResult = { count: tournamentsToUpdate.length };

    console.log(`✅ [BACKFILL] Successfully updated ${updateResult.count} tournament(s)!`);
    console.log();
    console.log('📊 [BACKFILL] Updated fields:');
    console.log(`   - apiSeriesId: ${series.apiSeriesId}`);
    console.log(`   - seriesName: ${series.name}`);
    console.log();
    console.log('🎉 [BACKFILL] Backfill complete! Match Center should now work for these tournaments.');

  } catch (error) {
    console.error('\n❌ [BACKFILL] Error during backfill:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const seriesName = process.argv[2];

if (!seriesName) {
  console.error('\n❌ [BACKFILL] Error: Series name is required!');
  console.log('\n📖 Usage:');
  console.log('   node backend/scripts/backfill-tournament-series.js "Series Name"');
  console.log('\n📝 Example:');
  console.log('   node backend/scripts/backfill-tournament-series.js "India vs Australia 2024"');
  console.log();
  process.exit(1);
}

backfillTournamentSeries(seriesName);

