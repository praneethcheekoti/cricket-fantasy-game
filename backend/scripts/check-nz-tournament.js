/**
 * Check NZ ODI series tournament status
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTournament() {
  console.log('🔍 Looking for NZ ODI series tournament...\n');

  const tournaments = await prisma.tournament.findMany({
    where: {
      name: {
        contains: 'NZ',
        mode: 'insensitive'
      }
    },
    include: {
      auctionPlayers: {
        select: {
          id: true,
          playerName: true,
          status: true,
          soldTo: true
        }
      },
      teams: {
        select: {
          id: true,
          name: true
        }
      },
      participants: true
    }
  });

  if (tournaments.length === 0) {
    // Try broader search
    const allTournaments = await prisma.tournament.findMany({
      select: {
        id: true,
        name: true,
        status: true
      }
    });
    console.log('No NZ tournament found. Here are all tournaments:');
    allTournaments.forEach(t => console.log(`  - "${t.name}" (status: ${t.status})`));
    return;
  }

  for (const t of tournaments) {
    console.log(`📋 Tournament: "${t.name}"`);
    console.log(`   ID: ${t.id}`);
    console.log(`   Status: ${t.status}`);
    console.log(`   Participants: ${t.participants.length}`);
    console.log(`   Teams: ${t.teams.length}`);
    console.log(`   Auction Players: ${t.auctionPlayers.length}`);
    
    // Count player statuses
    const sold = t.auctionPlayers.filter(p => p.status === 'sold').length;
    const available = t.auctionPlayers.filter(p => p.status === 'available').length;
    const unsold = t.auctionPlayers.filter(p => p.status === 'unsold').length;
    
    console.log(`\n   Player Status Breakdown:`);
    console.log(`     - Sold: ${sold}`);
    console.log(`     - Available: ${available}`);
    console.log(`     - Unsold: ${unsold}`);
    
    // Check matches
    const matches = await prisma.match.findMany({
      where: {
        series: {
          tournaments: {
            some: { id: t.id }
          }
        }
      },
      select: {
        id: true,
        team1: true,
        team2: true,
        status: true,
        manOfMatchName: true
      }
    });
    
    console.log(`\n   Matches: ${matches.length}`);
    matches.forEach((m, i) => {
      console.log(`     ${i+1}. ${m.team1} vs ${m.team2} - ${m.status} (MoM: ${m.manOfMatchName || 'Not set'})`);
    });

    console.log('\n   ---');
    console.log(`   ⚠️  Current status is: "${t.status}"`);
    
    if (t.status !== 'auction_complete' && sold > 0 && available === 0) {
      console.log(`   💡 Recommendation: Status should probably be "auction_complete"`);
    }
  }
}

checkTournament()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

