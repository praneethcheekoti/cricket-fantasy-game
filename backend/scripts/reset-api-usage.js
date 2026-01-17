/**
 * Reset API Usage Counters
 * Usage: node backend/scripts/reset-api-usage.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetApiUsage() {
  console.log('\n🔄 [RESET] Resetting API usage counters...\n');

  try {
    // Delete all API usage records
    const result = await prisma.aPIUsage.deleteMany({});
    
    console.log(`✅ Deleted ${result.count} API usage records`);
    console.log('\n📊 All API quotas have been reset:');
    console.log('   - unofficial: 0/16 (16 remaining)');
    console.log('   - cricketdata: 0/50 (50 remaining)');
    console.log('   - cricbuzz: 0/100 (100 remaining)');
    console.log();
    console.log('🎉 You can now fetch matches again!');
    console.log();

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetApiUsage();





