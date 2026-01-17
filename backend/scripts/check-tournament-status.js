/**
 * Quick script to check all tournament statuses
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTournaments() {
  console.log('📋 Current Tournament Statuses:\n');

  const tournaments = await prisma.tournament.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      playerOfSeriesApplied: true,
      playerOfSeriesName: true
    }
  });

  if (tournaments.length === 0) {
    console.log('No tournaments found.');
    return;
  }

  tournaments.forEach((t, i) => {
    console.log(`${i + 1}. "${t.name}"`);
    console.log(`   ID: ${t.id}`);
    console.log(`   Status: ${t.status}`);
    console.log(`   PoTS Applied: ${t.playerOfSeriesApplied}`);
    console.log(`   PoTS Player: ${t.playerOfSeriesName || 'Not selected'}`);
    console.log('');
  });

  // Summary
  const statusCounts = {};
  tournaments.forEach(t => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  });
  
  console.log('📊 Summary:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });
}

checkTournaments()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

