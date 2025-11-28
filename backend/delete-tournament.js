const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteTournament() {
  try {
    const tournamentName = 'Test touna 3';
    
    console.log(`🔍 Looking for tournament: "${tournamentName}"`);
    
    // Find the tournament
    const tournament = await prisma.tournament.findFirst({
      where: {
        name: tournamentName
      }
    });

    if (!tournament) {
      console.log(`❌ Tournament "${tournamentName}" not found`);
      process.exit(1);
    }

    console.log(`✅ Found tournament:`, tournament);
    console.log(`🗑️  Deleting tournament ID: ${tournament.id}`);

    // Delete in order (respecting foreign key constraints)
    
    // First, get all teams for this tournament
    const teamsInTournament = await prisma.team.findMany({
      where: {
        tournamentId: tournament.id
      },
      select: {
        id: true
      }
    });
    const teamIds = teamsInTournament.map(t => t.id);
    console.log(`📊 Found ${teamIds.length} teams in tournament`);

    // Get all auction players for this tournament
    const auctionPlayersInTournament = await prisma.auctionPlayer.findMany({
      where: {
        tournamentId: tournament.id
      },
      select: {
        id: true
      }
    });
    const playerIds = auctionPlayersInTournament.map(p => p.id);
    console.log(`📊 Found ${playerIds.length} auction players in tournament`);
    
    // 1. Delete bids (using player IDs)
    const bids = await prisma.bid.deleteMany({
      where: {
        playerId: {
          in: playerIds
        }
      }
    });
    console.log(`✅ Deleted ${bids.count} bids`);

    // 2. Delete team players (using team IDs)
    const teamPlayers = await prisma.teamPlayer.deleteMany({
      where: {
        teamId: {
          in: teamIds
        }
      }
    });
    console.log(`✅ Deleted ${teamPlayers.count} team players`);

    // 3. Delete teams
    const teams = await prisma.team.deleteMany({
      where: {
        tournamentId: tournament.id
      }
    });
    console.log(`✅ Deleted ${teams.count} teams`);

    // 4. Delete auction players
    const auctionPlayers = await prisma.auctionPlayer.deleteMany({
      where: {
        tournamentId: tournament.id
      }
    });
    console.log(`✅ Deleted ${auctionPlayers.count} auction players`);

    // 5. Delete participants
    const participants = await prisma.tournamentParticipant.deleteMany({
      where: {
        tournamentId: tournament.id
      }
    });
    console.log(`✅ Deleted ${participants.count} participants`);

    // 6. Finally, delete the tournament
    await prisma.tournament.delete({
      where: {
        id: tournament.id
      }
    });
    console.log(`✅ Deleted tournament: "${tournamentName}"`);

    console.log(`🎉 Tournament and all related data deleted successfully!`);

  } catch (error) {
    console.error('❌ Error deleting tournament:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTournament();

