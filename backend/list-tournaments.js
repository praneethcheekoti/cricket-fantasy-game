const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listTournaments() {
  try {
    console.log('📋 Fetching all tournaments...\n');
    
    const tournaments = await prisma.tournament.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            participants: true,
            teams: true,
            auctionPlayers: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (tournaments.length === 0) {
      console.log('❌ No tournaments found');
      process.exit(0);
    }

    console.log(`✅ Found ${tournaments.length} tournament(s):\n`);
    
    tournaments.forEach((tournament, index) => {
      console.log(`${index + 1}. Tournament: "${tournament.name}"`);
      console.log(`   ID: ${tournament.id}`);
      console.log(`   Code: ${tournament.code}`);
      console.log(`   Status: ${tournament.status}`);
      console.log(`   Participants: ${tournament._count.participants}`);
      console.log(`   Teams: ${tournament._count.teams}`);
      console.log(`   Players: ${tournament._count.auctionPlayers}`);
      console.log(`   Created: ${tournament.createdAt.toLocaleString()}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error listing tournaments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listTournaments();


