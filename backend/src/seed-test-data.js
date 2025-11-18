const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Seed Test Data for Development/Testing
 * Adds mock cricket series to SeriesCache
 */
async function seedTestData() {
  console.log('\n🌱 [SEED] Starting test data seeding...\n');

  try {
    // Mock Series Data
    const mockSeries = [
      {
        apiSeriesId: 'test_series_001',
        apiSource: 'cricbuzz',
        name: 'India vs Australia Test Series 2024',
        shortName: 'IND vs AUS',
        format: 'Test',
        gender: 'Men',
        teams: JSON.stringify(['India', 'Australia']), // JSON string for MongoDB
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-26'),
        status: 'upcoming',
        metadata: JSON.stringify({ // JSON string for MongoDB
          source: 'test',
          venue: 'India'
        }),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      },
      {
        apiSeriesId: 'test_series_002',
        apiSource: 'cricbuzz',
        name: 'England vs Pakistan T20I Series 2024',
        shortName: 'ENG vs PAK',
        format: 'T20',
        gender: 'Men',
        teams: JSON.stringify(['England', 'Pakistan']), // JSON string for MongoDB
        startDate: new Date('2024-12-10'),
        endDate: new Date('2024-12-20'),
        status: 'upcoming',
        metadata: JSON.stringify({ // JSON string for MongoDB
          source: 'test',
          venue: 'England'
        }),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        apiSeriesId: 'test_series_003',
        apiSource: 'cricbuzz',
        name: 'ICC Women\'s Championship 2024',
        shortName: 'ICC WC',
        format: 'ODI',
        gender: 'Women',
        teams: JSON.stringify(['India', 'South Africa', 'Australia', 'England']), // JSON string for MongoDB
        startDate: new Date('2024-12-15'),
        endDate: new Date('2025-01-15'),
        status: 'upcoming',
        metadata: JSON.stringify({ // JSON string for MongoDB
          source: 'test',
          venue: 'Multiple'
        }),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    ];

    // Delete existing test series (to avoid duplicates)
    await prisma.seriesCache.deleteMany({
      where: {
        apiSeriesId: {
          in: mockSeries.map(s => s.apiSeriesId)
        }
      }
    });

    console.log('✅ [SEED] Cleaned up existing test series\n');

    // Insert mock series
    let insertedCount = 0;
    for (const series of mockSeries) {
      await prisma.seriesCache.create({
        data: series
      });
      console.log(`   ✅ Added: ${series.name} (${series.format})`);
      insertedCount++;
    }

    console.log(`\n✅ [SEED] Successfully added ${insertedCount} mock series!`);
    console.log('🎯 [SEED] You can now create tournaments with these series.\n');

    // Summary
    console.log('📋 [SEED] Available Series:');
    mockSeries.forEach((series, index) => {
      const teams = JSON.parse(series.teams);
      console.log(`   ${index + 1}. ${series.name}`);
      console.log(`      Format: ${series.format} | Teams: ${teams.join(' vs ')}`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ [SEED] Error seeding data:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding
seedTestData();

