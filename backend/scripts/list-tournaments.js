/**
 * List All Tournaments
 * Usage: node backend/scripts/list-tournaments.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listTournaments() {
  console.log('\n📋 [LIST] Fetching all tournaments...\n');

  try {
    const tournaments = await prisma.tournament.findMany({
      include: {
        participants: {
          include: {
            user: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (tournaments.length === 0) {
      console.log('❌ No tournaments found in database.\n');
      await prisma.$disconnect();
      process.exit(0);
    }

    console.log(`📊 Found ${tournaments.length} tournament(s):\n`);
    console.log('─────────────────────────────────────────────────────────────────────────────');

    tournaments.forEach((t, index) => {
      console.log(`\n${index + 1}. ${t.name}`);
      console.log(`   ├─ ID: ${t.id}`);
      console.log(`   ├─ Code: ${t.code}`);
      console.log(`   ├─ Status: ${t.status}`);
      console.log(`   ├─ Format: ${t.format}`);
      console.log(`   ├─ Series: ${t.seriesName || 'N/A'}`);
      console.log(`   ├─ API Series ID: ${t.apiSeriesId || 'N/A'}`);
      console.log(`   ├─ Participants: ${t.participants.length}`);
      if (t.participants.length > 0) {
        const participantNames = t.participants.map(p => p.user.name).join(', ');
        console.log(`   │  └─ ${participantNames}`);
      }
      console.log(`   └─ Created: ${t.createdAt.toLocaleString()}`);
    });

    console.log('\n─────────────────────────────────────────────────────────────────────────────');
    console.log(`\n💡 To delete a tournament, use:`);
    console.log(`   node backend/scripts/delete-tournament.js "Tournament Name"`);
    console.log();

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

listTournaments();

