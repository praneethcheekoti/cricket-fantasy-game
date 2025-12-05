/**
 * Test CricketData API parsing logic
 * Verifies that we correctly parse the flat array format with spaces
 */

// Sample response from CricketData API (exactly as provided by user)
const sampleResponse = {
  "apikey": "8183adc1-5572-4964-bd8e-e1638eb68f8b",
  "data": {
    "id": "c61d247d-7f77-452c-b495-2813a9cd0ac4",
    "name": "Virat Kohli",
    "role": "Batsman",
    "battingStyle": "Right Handed Bat",
    "placeOfBirth": "Delhi",
    "country": "India",
    "playerImg": "https://h.cricapi.com/img/icon512.png",
    "stats": [
      { "fn": "batting", "matchtype": "odi", "stat": " m ", "value": " 292 " },
      { "fn": "batting", "matchtype": "odi", "stat": " inn ", "value": " 281 " },
      { "fn": "batting", "matchtype": "odi", "stat": " runs ", "value": " 13906 " },
      { "fn": "batting", "matchtype": "odi", "stat": " bf ", "value": " 14868 " },
      { "fn": "batting", "matchtype": "odi", "stat": " hs ", "value": " 183 " },
      { "fn": "batting", "matchtype": "odi", "stat": " avg ", "value": " 57.9 " },
      { "fn": "batting", "matchtype": "odi", "stat": " sr ", "value": " 93.5 " },
      { "fn": "batting", "matchtype": "odi", "stat": " no ", "value": " 41 " },
      { "fn": "batting", "matchtype": "odi", "stat": " 4s ", "value": " 1230 " },
      { "fn": "batting", "matchtype": "odi", "stat": " 6s ", "value": " 144 " },
      { "fn": "batting", "matchtype": "odi", "stat": " 50 ", "value": " 72 " },
      { "fn": "batting", "matchtype": "odi", "stat": " 100 ", "value": " 50 " },
      { "fn": "batting", "matchtype": "odi", "stat": " 200 ", "value": " 0 " },
      { "fn": "bowling", "matchtype": "odi", "stat": " m ", "value": " 292 " },
      { "fn": "bowling", "matchtype": "odi", "stat": " inn ", "value": " 4 " },
      { "fn": "bowling", "matchtype": "odi", "stat": " b ", "value": " 186 " },
      { "fn": "bowling", "matchtype": "odi", "stat": " runs ", "value": " 210 " },
      { "fn": "bowling", "matchtype": "odi", "stat": " wkts ", "value": " 4 " },
      { "fn": "bowling", "matchtype": "odi", "stat": " avg ", "value": " 52.5 " },
      { "fn": "bowling", "matchtype": "odi", "stat": " econ ", "value": " 6.77 " },
      { "fn": "bowling", "matchtype": "odi", "stat": " sr ", "value": " 46.5 " },
      { "fn": "bowling", "matchtype": "odi", "stat": " bbi ", "value": " 1/27 " },
      { "fn": "bowling", "matchtype": "odi", "stat": " bbm ", "value": " 1/27 " },
      { "fn": "bowling", "matchtype": "odi", "stat": " 5w ", "value": " 0 " },
      { "fn": "bowling", "matchtype": "odi", "stat": " 10w ", "value": " 0 " }
    ]
  },
  "status": "success"
};

// Simulate the parsing logic from cricketdata-provider.js
function normalizePlayerStats(playerData, format = 'ODI') {
  try {
    const stats = playerData.stats || [];
    const matchtype = format.toLowerCase(); // 'odi', 'test', 't20'
    
    console.log(`\n🔍 Parsing ${format} stats for: ${playerData.name}`);
    console.log(`📊 Total stats in response: ${stats.length}`);
    
    // Filter stats for the specific format and function (batting/bowling)
    const battingStats = stats.filter(s => 
      s.fn === 'batting' && s.matchtype === matchtype
    );
    const bowlingStats = stats.filter(s => 
      s.fn === 'bowling' && s.matchtype === matchtype
    );
    
    console.log(`✅ Filtered batting stats: ${battingStats.length}`);
    console.log(`✅ Filtered bowling stats: ${bowlingStats.length}`);
    
    // Helper to parse stat value (trim spaces, convert to number if possible)
    const parseStat = (statArray, statName) => {
      const statObj = statArray.find(s => s.stat.trim() === statName);
      if (!statObj) {
        console.log(`   ⚠️  Stat "${statName}" not found`);
        return 0;
      }
      const value = statObj.value.trim();
      const num = parseFloat(value);
      console.log(`   ✅ ${statName}: "${statObj.value}" → trim → "${value}" → parse → ${num}`);
      return isNaN(num) ? 0 : num;
    };
    
    console.log(`\n📊 Parsing BATTING stats:`);
    const batting = {
      matches: parseStat(battingStats, 'm'),
      innings: parseStat(battingStats, 'inn'),
      notOuts: parseStat(battingStats, 'no'),
      runs: parseStat(battingStats, 'runs'),
      highestScore: parseStat(battingStats, 'hs'),
      average: parseStat(battingStats, 'avg'),
      ballsFaced: parseStat(battingStats, 'bf'),
      strikeRate: parseStat(battingStats, 'sr'),
      centuries: parseStat(battingStats, '100'),
      halfCenturies: parseStat(battingStats, '50'),
      ducks: 0,  // Not available in CricketData API
      fours: parseStat(battingStats, '4s'),
      sixes: parseStat(battingStats, '6s')
    };
    
    console.log(`\n📊 Parsing BOWLING stats:`);
    const bowling = {
      matches: parseStat(bowlingStats, 'm'),
      innings: parseStat(bowlingStats, 'inn'),
      balls: parseStat(bowlingStats, 'b'),
      runs: parseStat(bowlingStats, 'runs'),
      wickets: parseStat(bowlingStats, 'wkts'),
      average: parseStat(bowlingStats, 'avg'),
      economy: parseStat(bowlingStats, 'econ'),
      strikeRate: parseStat(bowlingStats, 'sr'),
      fiveWickets: parseStat(bowlingStats, '5w'),
      tenWickets: parseStat(bowlingStats, '10w')
    };
    
    // Build normalized structure
    return {
      batting,
      bowling,
      format: format,
      fielding: {
        catches: 0,
        stumpings: 0,
        runOuts: 0
      }
    };

  } catch (error) {
    console.error(`❌ Error normalizing player stats:`, error.message);
    return null;
  }
}

// Run the test
console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 Testing CricketData API Parsing Logic');
console.log('═══════════════════════════════════════════════════════════');

const result = normalizePlayerStats(sampleResponse.data, 'ODI');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('📋 FINAL RESULT:');
console.log('═══════════════════════════════════════════════════════════');
console.log(JSON.stringify(result, null, 2));

console.log('\n═══════════════════════════════════════════════════════════');
console.log('✅ VERIFICATION:');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Player: ${sampleResponse.data.name}`);
console.log(`Runs: ${result.batting.runs} (Expected: 13906) ${result.batting.runs === 13906 ? '✅' : '❌'}`);
console.log(`Average: ${result.batting.average} (Expected: 57.9) ${result.batting.average === 57.9 ? '✅' : '❌'}`);
console.log(`Strike Rate: ${result.batting.strikeRate} (Expected: 93.5) ${result.batting.strikeRate === 93.5 ? '✅' : '❌'}`);
console.log(`Centuries: ${result.batting.centuries} (Expected: 50) ${result.batting.centuries === 50 ? '✅' : '❌'}`);
console.log(`Half-Centuries: ${result.batting.halfCenturies} (Expected: 72) ${result.batting.halfCenturies === 72 ? '✅' : '❌'}`);
console.log(`Wickets: ${result.bowling.wickets} (Expected: 4) ${result.bowling.wickets === 4 ? '✅' : '❌'}`);
console.log(`Economy: ${result.bowling.economy} (Expected: 6.77) ${result.bowling.economy === 6.77 ? '✅' : '❌'}`);

const allPass = 
  result.batting.runs === 13906 &&
  result.batting.average === 57.9 &&
  result.batting.strikeRate === 93.5 &&
  result.batting.centuries === 50 &&
  result.batting.halfCenturies === 72 &&
  result.bowling.wickets === 4 &&
  result.bowling.economy === 6.77;

console.log('\n═══════════════════════════════════════════════════════════');
if (allPass) {
  console.log('🎉 ALL TESTS PASSED! Parsing logic works correctly.');
} else {
  console.log('❌ TESTS FAILED! Parsing logic needs fixing.');
}
console.log('═══════════════════════════════════════════════════════════');



