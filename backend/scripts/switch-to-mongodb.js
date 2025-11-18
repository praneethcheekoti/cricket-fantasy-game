/**
 * Script to switch from SQLite to MongoDB
 * Run: npm run switch:mongodb
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Switching database to MongoDB...\n');

// Update prisma schema
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Replace provider
schema = schema.replace(
  /provider = "sqlite"/,
  'provider = "mongodb"'
);

// MongoDB requires @db.ObjectId for IDs
schema = schema.replace(
  /@id @default\(uuid\(\)\)/g,
  '@id @default(auto()) @map("_id") @db.ObjectId'
);

// Remove @@unique constraints for MongoDB (handle in application logic)
schema = schema.replace(
  /@@unique\(\[tournamentId, userId\]\)/g,
  '// @@unique([tournamentId, userId]) // Handle uniqueness in application'
);

schema = schema.replace(
  /@@unique\(\[tournamentId, userId\]\)/g,
  '// @@unique([tournamentId, userId]) // Handle uniqueness in application'
);

schema = schema.replace(
  /@@unique\(\[matchId, teamPlayerId\]\)/g,
  '// @@unique([matchId, teamPlayerId]) // Handle uniqueness in application'
);

fs.writeFileSync(schemaPath, schema);

console.log('✅ Prisma schema updated for MongoDB');
console.log('\n📝 Next steps:');
console.log('1. Update DATABASE_URL in .env to your MongoDB connection string');
console.log('2. Run: npx prisma generate');
console.log('3. Run: npx prisma db push (for MongoDB, not migrate)');
console.log('\n🎉 Done!\n');

