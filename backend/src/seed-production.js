require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// This will use DATABASE_URL from .env
const prisma = new PrismaClient();

/**
 * Seed Production Database
 * Run this ONCE after deploying to populate series data
 */
async function seedProduction() {
  console.log('\n🌱 [SEED PRODUCTION] Starting...');
  console.log('📍 Database:', process.env.DATABASE_URL?.substring(0, 30) + '...\n');

  try {
    // Mock Series Data (same as test data)
    const mockSeries = [
      {
        apiSeriesId: 'test_series_001',
        apiSource: 'cricbuzz',
        name: 'India vs Australia Test Series 2024',
        shortName: 'IND vs AUS',
        format: 'Test',
        gender: 'Men',
        teams: JSON.stringify(['India', 'Australia']),
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-26'),
        status: 'upcoming',
        metadata: JSON.stringify({
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
        teams: JSON.stringify(['England', 'Pakistan']),
        startDate: new Date('2024-12-10'),
        endDate: new Date('2024-12-20'),
        status: 'upcoming',
        metadata: JSON.stringify({
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
        teams: JSON.stringify(['India', 'South Africa', 'Australia', 'England']),
        startDate: new Date('2024-12-15'),
        endDate: new Date('2025-01-15'),
        status: 'upcoming',
        metadata: JSON.stringify({
          source: 'test',
          venue: 'Multiple'
        }),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    ];

    // Check if data already exists
    const existingCount = await prisma.seriesCache.count({
      where: {
        apiSeriesId: {
          in: mockSeries.map(s => s.apiSeriesId)
        }
      }
    });

    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing series.`);
      console.log('❓ Do you want to delete and re-seed? (Ctrl+C to cancel)\n');
      
      // Delete existing
      await prisma.seriesCache.deleteMany({
        where: {
          apiSeriesId: {
            in: mockSeries.map(s => s.apiSeriesId)
          }
        }
      });
      console.log('✅ Deleted existing test series\n');
    }

    // Insert mock series
    let insertedCount = 0;
    for (const series of mockSeries) {
      await prisma.seriesCache.create({
        data: series
      });
      console.log(`   ✅ Added: ${series.name} (${series.format})`);
      insertedCount++;
    }

    console.log(`\n✅ [SEED PRODUCTION] Successfully added ${insertedCount} series!`);
    console.log('🎯 Users can now create tournaments!\n');

    // Summary
    console.log('📋 Available Series:');
    mockSeries.forEach((series, index) => {
      const teams = JSON.parse(series.teams);
      console.log(`   ${index + 1}. ${series.name}`);
      console.log(`      Format: ${series.format} | Teams: ${teams.join(' vs ')}`);
    });
    console.log('\n🎉 Production database ready!\n');

  } catch (error) {
    console.error('❌ [SEED PRODUCTION] Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding
seedProduction();

