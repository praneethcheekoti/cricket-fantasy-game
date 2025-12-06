/**
 * Delete Tournament by Name
 * Usage: node backend/scripts/delete-tournament.js "Tournament Name"
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteTournament(tournamentName) {
  console.log(`\n🔍 [DELETE] Searching for tournament: "${tournamentName}"\n`);

  try {
    // Find tournament by exact name (case-insensitive) or by ID
    let tournaments = [];
    
    // Try exact match first
    const exactMatch = await prisma.tournament.findMany({
      where: {
        name: {
          equals: tournamentName,
          mode: 'insensitive'
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (exactMatch.length > 0) {
      tournaments = exactMatch;
    } else {
      // Try by ID if exact name match fails
      try {
        const byId = await prisma.tournament.findUnique({
          where: { id: tournamentName },
          include: {
            participants: {
              include: {
                user: {
                  select: { name: true }
                }
              }
            }
          }
        });
        if (byId) {
          tournaments = [byId];
        }
      } catch (e) {
        // Not a valid ID
      }
    }

    if (tournaments.length === 0) {
      console.log(`❌ No tournament found matching "${tournamentName}"`);
      console.log(`\n💡 Tips:`);
      console.log(`   - Use exact tournament name (case-insensitive)`);
      console.log(`   - Or use the tournament ID from the list`);
      console.log(`\n📋 Run this to see all tournaments:`);
      console.log(`   node backend/scripts/list-tournaments.js\n`);
      await prisma.$disconnect();
      process.exit(0);
    }

    if (tournaments.length > 1) {
      console.log(`⚠️  Found ${tournaments.length} tournaments matching "${tournamentName}":\n`);
      tournaments.forEach((t, index) => {
        console.log(`   ${index + 1}. ${t.name} (ID: ${t.id}, Status: ${t.status})`);
      });
      console.log(`\n❌ Please be more specific with the tournament name.\n`);
      await prisma.$disconnect();
      process.exit(0);
    }

    const tournament = tournaments[0];

    console.log(`✅ Found tournament:\n`);
    console.log(`   Name: ${tournament.name}`);
    console.log(`   ID: ${tournament.id}`);
    console.log(`   Code: ${tournament.code}`);
    console.log(`   Status: ${tournament.status}`);
    console.log(`   Format: ${tournament.format}`);
    console.log(`   Series: ${tournament.seriesName || 'N/A'}`);
    console.log(`   Participants: ${tournament.participants.length}`);
    if (tournament.participants.length > 0) {
      console.log(`   Users: ${tournament.participants.map(p => p.user.name).join(', ')}`);
    }
    console.log(`   Created: ${tournament.createdAt.toLocaleString()}`);
    console.log();

    // Count related data
    const teams = await prisma.team.findMany({ where: { tournamentId: tournament.id } });
    const auctionPlayers = await prisma.auctionPlayer.findMany({ where: { tournamentId: tournament.id } });

    console.log(`📊 Related data to be deleted:\n`);
    console.log(`   - ${tournament.participants.length} Participants`);
    console.log(`   - ${teams.length} Teams`);
    console.log(`   - ${auctionPlayers.length} Auction Players`);
    console.log();

    console.log(`⚠️  WARNING: This action CANNOT be undone!\n`);
    console.log(`🗑️  Proceeding to delete...\n`);

    // Get IDs for deletion
    const teamIds = teams.map(t => t.id);
    const auctionPlayerIds = auctionPlayers.map(ap => ap.id);

    // Delete in correct order to avoid foreign key constraints
    // Using separate transactions for each step to be more robust

    // 1. Delete bids (they reference auction players)
    if (auctionPlayerIds.length > 0) {
      const deletedBids = await prisma.bid.deleteMany({
        where: {
          playerId: { in: auctionPlayerIds }
        }
      });
      if (deletedBids.count > 0) {
        console.log(`   ✅ Deleted ${deletedBids.count} bids`);
      }
    }

    // 2. Delete match player scores (they reference team players)
    if (teamIds.length > 0) {
      const deletedScores = await prisma.matchPlayerScore.deleteMany({
        where: {
          teamPlayerId: {
            in: await prisma.teamPlayer.findMany({
              where: { teamId: { in: teamIds } },
              select: { id: true }
            }).then(tps => tps.map(tp => tp.id))
          }
        }
      });
      if (deletedScores.count > 0) {
        console.log(`   ✅ Deleted ${deletedScores.count} match player scores`);
      }
    }

    // 3. Delete team players (they reference teams) - MUST be before teams
    if (teamIds.length > 0) {
      const deletedTeamPlayers = await prisma.teamPlayer.deleteMany({
        where: {
          teamId: { in: teamIds }
        }
      });
      if (deletedTeamPlayers.count > 0) {
        console.log(`   ✅ Deleted ${deletedTeamPlayers.count} team players`);
      }
    }

    // 4. Delete teams
    if (teamIds.length > 0) {
      const deletedTeams = await prisma.team.deleteMany({
        where: { id: { in: teamIds } }
      });
      if (deletedTeams.count > 0) {
        console.log(`   ✅ Deleted ${deletedTeams.count} teams`);
      }
    }

    // 5. Delete auction players
    if (auctionPlayerIds.length > 0) {
      const deletedAuctionPlayers = await prisma.auctionPlayer.deleteMany({
        where: { id: { in: auctionPlayerIds } }
      });
      if (deletedAuctionPlayers.count > 0) {
        console.log(`   ✅ Deleted ${deletedAuctionPlayers.count} auction players`);
      }
    }

    // 6. Delete participants
    const deletedParticipants = await prisma.tournamentParticipant.deleteMany({
      where: { tournamentId: tournament.id }
    });
    if (deletedParticipants.count > 0) {
      console.log(`   ✅ Deleted ${deletedParticipants.count} participants`);
    }

    // 7. Delete tournament
    await prisma.tournament.delete({
      where: { id: tournament.id }
    });
    console.log(`   ✅ Deleted tournament: ${tournament.name}`);

    console.log(`\n🎉 Tournament "${tournament.name}" successfully deleted!\n`);

  } catch (error) {
    console.error('\n❌ Error deleting tournament:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const tournamentName = process.argv[2];

if (!tournamentName) {
  console.error('\n❌ Error: Tournament name or ID is required!');
  console.log('\n📖 Usage:');
  console.log('   node backend/scripts/delete-tournament.js "Tournament Name"');
  console.log('   OR');
  console.log('   node backend/scripts/delete-tournament.js "TOURNAMENT_ID"');
  console.log('\n📝 Examples:');
  console.log('   node backend/scripts/delete-tournament.js "NSG tournament 1"');
  console.log('   node backend/scripts/delete-tournament.js "692bb63392cf1a66735b9791"');
  console.log('\n💡 To see all tournaments:');
  console.log('   node backend/scripts/list-tournaments.js');
  console.log();
  process.exit(1);
}

deleteTournament(tournamentName);
