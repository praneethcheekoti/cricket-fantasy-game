/**
 * One-time script to fix tournament statuses
 * Updates tournaments that have 'completed' status but haven't applied PoTS bonus yet
 * These should be 'auction_complete' instead
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTournamentStatus() {
  console.log('🔧 Fixing tournament statuses...\n');

  // Find tournaments that need fixing
  const tournamentsToFix = await prisma.tournament.findMany({
    where: {
      status: 'completed',
      playerOfSeriesApplied: false
    },
    select: {
      id: true,
      name: true,
      status: true,
      playerOfSeriesApplied: true
    }
  });

  console.log(`Found ${tournamentsToFix.length} tournament(s) to update:\n`);

  if (tournamentsToFix.length === 0) {
    console.log('✅ No tournaments need fixing. All good!');
    return;
  }

  // Show what will be updated
  tournamentsToFix.forEach((t, i) => {
    console.log(`  ${i + 1}. "${t.name}" (ID: ${t.id})`);
    console.log(`     Current: status='completed', potsApplied=${t.playerOfSeriesApplied}`);
    console.log(`     Will change to: status='auction_complete'\n`);
  });

  // Perform the update
  const result = await prisma.tournament.updateMany({
    where: {
      status: 'completed',
      playerOfSeriesApplied: false
    },
    data: {
      status: 'auction_complete'
    }
  });

  console.log(`✅ Updated ${result.count} tournament(s) to 'auction_complete' status.`);
}

fixTournamentStatus()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

