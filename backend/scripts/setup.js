/**
 * Automated setup script for Cricket Fantasy Game Backend
 * Run: node scripts/setup.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n🏏 Cricket Fantasy Game - Setup Script\n');

// Helper function to run commands
function run(command, description) {
  console.log(`\n📌 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} - Done!\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} - Failed!`);
    return false;
  }
}

// Check if .env exists
console.log('🔍 Checking environment configuration...');
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    console.log('📝 Creating .env from .env.example...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created!');
  } else {
    console.log('⚠️  No .env file found. Please create one manually.');
  }
} else {
  console.log('✅ .env file exists');
}

// Install dependencies
if (!run('npm install', 'Installing dependencies')) {
  process.exit(1);
}

// Generate Prisma client
if (!run('npx prisma generate', 'Generating Prisma client')) {
  process.exit(1);
}

// Run migrations
if (!run('npx prisma migrate dev --name init', 'Setting up database')) {
  process.exit(1);
}

// Seed sample data
console.log('\n📌 Seeding sample cricket series...');
try {
  const cricketApi = require('../src/services/cricket-api.service');
  cricketApi.syncSeries().then(() => {
    console.log('✅ Sample data seeded!\n');
    
    console.log('\n🎉 Setup Complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Start the server:');
    console.log('   npm run dev');
    console.log('\n📡 Server will run on:');
    console.log('   http://localhost:5000');
    console.log('\n🔍 View database:');
    console.log('   npx prisma studio');
    console.log('\n📚 API Documentation:');
    console.log('   See README.md for all endpoints');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }).catch(err => {
    console.error('❌ Seeding failed:', err.message);
    console.log('\n⚠️  Setup complete but seeding failed.');
    console.log('You can seed manually later with:');
    console.log('node -e "require(\'./src/services/cricket-api.service\').syncSeries()"\n');
  });
} catch (error) {
  console.error('❌ Seeding failed:', error.message);
  console.log('\n⚠️  Setup complete but seeding failed.');
  console.log('You can seed manually later.\n');
}

