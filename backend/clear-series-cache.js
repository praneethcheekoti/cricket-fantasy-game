const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearCache() {
  console.log('\n🗑️  Clearing series cache...\n');
  
  try {
    const result = await prisma.seriesCache.deleteMany({});
    console.log(`✅ Deleted ${result.count} cached series\n`);
    console.log('💡 Next: The series will be re-fetched from Unofficial Cricbuzz API\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

clearCache();

