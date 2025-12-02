const { PrismaClient } = require('@prisma/client');
const cricketApiService = require('./cricket-api');

const prisma = new PrismaClient();

/**
 * Scorecard Processor Service
 * Fetches match scorecards and calculates fantasy points
 * NOTE: Does NOT cache raw scorecards to save database space
 */
const scorecardProcessorService = {
  /**
   * Process a match: Fetch scorecard, calculate fantasy points
   * @param {string} tournamentId - Tournament ID
   * @param {string} matchId - Match ID (our internal MongoDB ID)
   * @param {string} apiMatchId - API Match ID for fetching scorecard
   */
  async processMatch(tournamentId, matchId, apiMatchId) {
    try {
      console.log(`\n🏏 [Scorecard Processor] Processing match: ${matchId}`);
      console.log(`   Tournament: ${tournamentId}`);
      console.log(`   API Match ID: ${apiMatchId}`);

      // Step 1: Check if already processed
      const existingScores = await prisma.matchPlayerScore.findMany({
        where: { matchId }
      });

      if (existingScores.length > 0) {
        console.log(`   ⚠️  Match already processed (${existingScores.length} player scores exist)`);
        return {
          success: true,
          message: 'Match already processed',
          alreadyProcessed: true,
          playerCount: existingScores.length
        };
      }

      // Step 2: Get tournament and scoring rules
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId }
      });

      if (!tournament) {
        throw new Error('Tournament not found');
      }

      const battingRules = JSON.parse(tournament.battingRules);
      const bowlingRules = JSON.parse(tournament.bowlingRules);
      const fieldingRules = JSON.parse(tournament.fieldingRules);
      const captainRules = JSON.parse(tournament.captainRules);
      const awardRules = JSON.parse(tournament.awardRules);

      console.log(`   ✅ Tournament rules loaded`);

      // Step 3: Fetch scorecard from API (NO CACHING!)
      console.log(`   📡 Fetching scorecard from API...`);
      console.log(`   🔍 API Match ID: ${apiMatchId}`);
      const scorecard = await this.fetchScorecardDirect(apiMatchId);

      if (!scorecard) {
        console.log(`   ❌ ERROR: Scorecard fetch returned null/undefined`);
        throw new Error('Failed to fetch scorecard from API');
      }

      console.log(`   ✅ Scorecard fetched successfully`);
      console.log(`   📊 Innings count: ${scorecard.scorecard?.length || 0}`);
      console.log(`   🏏 Match complete: ${scorecard.isMatchComplete}`);
      console.log(`   📝 Status: ${scorecard.status}`);

      // Step 4: Get all teams in tournament with their players
      const teams = await prisma.team.findMany({
        where: { tournamentId },
        include: {
          players: true,
          user: {
            select: { name: true }
          }
        }
      });

      console.log(`   📊 Found ${teams.length} teams in tournament`);

      // Step 5: Extract player performances and calculate points
      let totalPlayersProcessed = 0;

      for (const team of teams) {
        console.log(`\n   👥 Processing team: ${team.name} (${team.user.name})`);

        for (const teamPlayer of team.players) {
          // Find player's performance in scorecard using API player ID
          const performance = this.extractPlayerPerformance(scorecard, teamPlayer.playerId, teamPlayer.playerName);

          const didNotPlay = !performance;
          
          if (didNotPlay) {
            console.log(`      ⚠️  ${teamPlayer.playerName}: Did not play in this match`);
          } else {
            console.log(`      🏏 ${teamPlayer.playerName}: Processing performance...`);
          }

          // Calculate fantasy points (will be 0 for non-playing players)
          const fantasyPoints = this.calculateFantasyPoints(
            performance || { runs: 0, ballsFaced: 0, fours: 0, sixes: 0, wickets: 0, ballsBowled: 0, runsConceded: 0, maidens: 0, catches: 0, runOuts: 0, stumpings: 0, isManOfMatch: false },
            battingRules,
            bowlingRules,
            fieldingRules,
            awardRules,
            captainRules,
            teamPlayer.isCaptain,
            teamPlayer.isViceCaptain
          );

          // Create MatchPlayerScore record (even for non-playing players with 0 points)
          await prisma.matchPlayerScore.create({
            data: {
              matchId,
              teamPlayerId: teamPlayer.id,
              playerId: teamPlayer.playerId,
              
              // Batting stats
              runs: performance?.runs || 0,
              ballsFaced: performance?.ballsFaced || 0,
              fours: performance?.fours || 0,
              sixes: performance?.sixes || 0,
              
              // Bowling stats
              wickets: performance?.wickets || 0,
              ballsBowled: performance?.ballsBowled || 0,
              runsConceded: performance?.runsConceded || 0,
              maidens: performance?.maidens || 0,
              
              // Fielding stats
              catches: performance?.catches || 0,
              runOuts: performance?.runOuts || 0,
              stumpings: performance?.stumpings || 0,
              
              // Awards
              isManOfMatch: performance?.isManOfMatch || false,
              
              // Calculated fantasy points
              fantasyPoints: fantasyPoints
            }
          });

          console.log(`      ✅ ${teamPlayer.playerName}: ${fantasyPoints} points${didNotPlay ? ' (did not play)' : ''}`);
          totalPlayersProcessed++;
        }
      }

      console.log(`\n   ✅ Match processing complete!`);
      console.log(`   📊 Total players processed: ${totalPlayersProcessed}\n`);

      return {
        success: true,
        message: `Fantasy points calculated for ${totalPlayersProcessed} players`,
        playerCount: totalPlayersProcessed,
        alreadyProcessed: false
      };

    } catch (error) {
      console.error(`\n   ❌ [Scorecard Processor] Error:`, error.message);
      throw error;
    }
  },

  /**
   * Fetch scorecard directly from API without caching
   * This saves database space by not storing raw scorecards
   */
  async fetchScorecardDirect(apiMatchId) {
    try {
      console.log(`   📡 Fetching scorecard WITHOUT caching (to save DB space)`);
      
      // Fetch scorecard from API (it will be cached by cricketApiService.getLiveScore)
      const scorecard = await cricketApiService.getLiveScore(apiMatchId);
      
      // Delete the cached scorecard immediately to save space
      // We only needed it temporarily for processing
      try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        await prisma.liveScoreCache.deleteMany({
          where: { apiMatchId }
        });
        
        console.log(`   🗑️  Raw scorecard deleted from cache (saved DB space)`);
      } catch (deleteError) {
        console.warn(`   ⚠️  Could not delete scorecard cache:`, deleteError.message);
      }
      
      return scorecard;
    } catch (error) {
      console.error(`Failed to fetch scorecard for match ${apiMatchId}:`, error.message);
      return null;
    }
  },

  /**
   * Extract a specific player's performance from Unofficial Cricbuzz scorecard
   * @param {Object} scorecard - Full match scorecard
   * @param {string} playerId - Player API ID
   * @param {string} playerName - Player name (for logging)
   * @returns {Object|null} Player performance data
   */
  extractPlayerPerformance(scorecard, playerId, playerName) {
    console.log(`\n      🔍 [EXTRACT] Processing: ${playerName} (ID: ${playerId})`);
    
    if (!scorecard || !scorecard.scorecard) {
      console.warn(`      ❌ [EXTRACT] No scorecard data`);
      return null;
    }

    console.log(`      📊 [EXTRACT] Innings to process: ${scorecard.scorecard.length}`);

    const performance = {
      runs: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
      wickets: 0,
      ballsBowled: 0,
      runsConceded: 0,
      maidens: 0,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
      isManOfMatch: false
    };

    // Create a map to track fielding contributions
    const fieldingMap = new Map(); // playerName → { catches: 0, runOuts: 0, stumpings: 0 }

    // Iterate through all innings in the scorecard
    let inningsNum = 0;
    for (const innings of scorecard.scorecard) {
      inningsNum++;
      if (!innings) {
        console.log(`      ⚠️  [EXTRACT] Innings ${inningsNum}: No data`);
        continue;
      }
      
      console.log(`      📋 [EXTRACT] Innings ${inningsNum}: ${innings.batTeamName} batting`);

      // === BATTING PERFORMANCE ===
      const batsmen = innings.batsman || [];
      console.log(`         🏏 [BATTING] Checking ${batsmen.length} batsmen for ID: ${playerId}`);
      
      const battingPerf = batsmen.find(b => b && b.id && b.id.toString() === playerId.toString());
      
      if (battingPerf) {
        console.log(`         ✅ [BATTING] FOUND: ${battingPerf.name}`);
        console.log(`            Runs: ${battingPerf.runs || 0}, Balls: ${battingPerf.balls || 0}, 4s: ${battingPerf.fours || 0}, 6s: ${battingPerf.sixes || 0}`);
        performance.runs += parseInt(battingPerf.runs || 0);
        performance.ballsFaced += parseInt(battingPerf.balls || 0);
        performance.fours += parseInt(battingPerf.fours || 0);
        performance.sixes += parseInt(battingPerf.sixes || 0);
      } else {
        console.log(`         ⚪ [BATTING] Not found in this innings`);
      }

      // === BOWLING PERFORMANCE ===
      const bowlers = innings.bowler || [];
      console.log(`         🎳 [BOWLING] Checking ${bowlers.length} bowlers for ID: ${playerId}`);
      
      const bowlingPerf = bowlers.find(b => b && b.id && b.id.toString() === playerId.toString());
      
      if (bowlingPerf) {
        console.log(`         ✅ [BOWLING] FOUND: ${bowlingPerf.name}`);
        
        // Convert overs to balls (e.g., "4" = 24 balls, "4.5" = 29 balls)
        const overs = parseFloat(bowlingPerf.overs || 0);
        const completedOvers = Math.floor(overs);
        const extraBalls = Math.round((overs - completedOvers) * 10); // 0.5 → 5 balls
        const ballsBowled = (completedOvers * 6) + extraBalls;
        
        console.log(`            Overs: ${overs} → ${ballsBowled} balls, Wickets: ${bowlingPerf.wickets || 0}, Runs: ${bowlingPerf.runs || 0}, Maidens: ${bowlingPerf.maidens || 0}`);
        
        performance.wickets += parseInt(bowlingPerf.wickets || 0);
        performance.maidens += parseInt(bowlingPerf.maidens || 0);
        performance.runsConceded += parseInt(bowlingPerf.runs || 0);
        performance.ballsBowled += ballsBowled;
      } else {
        console.log(`         ⚪ [BOWLING] Not found in this innings`);
      }

      // === FIELDING PERFORMANCE (parse from outDec strings) ===
      console.log(`         🧤 [FIELDING] Parsing dismissals from ${batsmen.length} batsmen`);
      
      for (const batsman of batsmen) {
        if (!batsman || !batsman.outDec) continue;

        const outDec = batsman.outDec.toLowerCase();
        console.log(`            📝 ${batsman.name}: "${batsman.outDec}"`);

        // Parse catches: "c PlayerName b BowlerName" or "c & b BowlerName"
        if (outDec.includes(' c ') || outDec.startsWith('c ')) {
          const catchMatch = outDec.match(/c (?:& b )?([^b]+?)(?:\s+b\s+|$)/);
          if (catchMatch) {
            const fielderName = catchMatch[1].trim();
            console.log(`               ✋ CATCH by: "${fielderName}"`);
            if (!fieldingMap.has(fielderName)) {
              fieldingMap.set(fielderName, { catches: 0, runOuts: 0, stumpings: 0 });
            }
            fieldingMap.get(fielderName).catches++;
          }
        }

        // Parse run outs: "run out (PlayerName)" or "run out (PlayerName / PlayerName2)"
        if (outDec.includes('run out')) {
          const runOutMatch = outDec.match(/run out \(([^)]+)\)/);
          if (runOutMatch) {
            const fielders = runOutMatch[1].split('/').map(f => f.trim());
            console.log(`               🏃 RUN OUT by: ${fielders.join(', ')}`);
            for (const fielderName of fielders) {
              if (!fieldingMap.has(fielderName)) {
                fieldingMap.set(fielderName, { catches: 0, runOuts: 0, stumpings: 0 });
              }
              // Award 1 runout to each participating fielder
              fieldingMap.get(fielderName).runOuts++;
            }
          }
        }

        // Parse stumpings: "st WicketKeeperName b BowlerName"
        if (outDec.includes(' st ')) {
          const stumpingMatch = outDec.match(/st ([^b]+?)(?:\s+b\s+|$)/);
          if (stumpingMatch) {
            const fielderName = stumpingMatch[1].trim();
            console.log(`               🧤 STUMPING by: "${fielderName}"`);
            if (!fieldingMap.has(fielderName)) {
              fieldingMap.set(fielderName, { catches: 0, runOuts: 0, stumpings: 0 });
            }
            fieldingMap.get(fielderName).stumpings++;
          }
        }
      }
    }
    
    console.log(`      🧤 [FIELDING MAP] Total fielders tracked: ${fieldingMap.size}`);

    // === MATCH FIELDING TO PLAYER (by name matching) ===
    // Since fielding is tracked by name in outDec, we need to match against player name
    console.log(`      🔍 [NAME MATCH] Matching "${playerName}" against ${fieldingMap.size} fielders`);
    
    let matchFound = false;
    for (const [fielderName, fieldingStats] of fieldingMap.entries()) {
      // Flexible matching: check if player name contains fielder name or vice versa
      const normalizedPlayerName = playerName.toLowerCase().replace(/[^a-z]/g, '');
      const normalizedFielderName = fielderName.toLowerCase().replace(/[^a-z]/g, '');
      
      console.log(`         🔄 Comparing: "${playerName}" (${normalizedPlayerName}) vs "${fielderName}" (${normalizedFielderName})`);
      
      if (normalizedPlayerName.includes(normalizedFielderName) || 
          normalizedFielderName.includes(normalizedPlayerName)) {
        console.log(`         ✅ [NAME MATCH] MATCHED! Assigning fielding stats:`);
        console.log(`            Catches: ${fieldingStats.catches}, Run Outs: ${fieldingStats.runOuts}, Stumpings: ${fieldingStats.stumpings}`);
        performance.catches += fieldingStats.catches;
        performance.runOuts += fieldingStats.runOuts;
        performance.stumpings += fieldingStats.stumpings;
        matchFound = true;
        break; // Found match, stop searching
      }
    }
    
    if (!matchFound && fieldingMap.size > 0) {
      console.log(`         ⚪ [NAME MATCH] No match found for "${playerName}"`);
    }

    // === MAN OF THE MATCH ===
    // Check if player was Man of the Match (scorecard.status might contain player name)
    // This is not always available, so we'll skip for now
    // TODO: Implement if API provides MotM data

    // Return null if player didn't participate at all
    const hasAnyPerformance = 
      performance.runs > 0 || 
      performance.ballsFaced > 0 || 
      performance.wickets > 0 || 
      performance.ballsBowled > 0 ||
      performance.catches > 0 ||
      performance.runOuts > 0 ||
      performance.stumpings > 0;

    // Summary
    console.log(`      📊 [SUMMARY] ${playerName}:`);
    console.log(`         Batting: ${performance.runs} runs (${performance.ballsFaced} balls), ${performance.fours} 4s, ${performance.sixes} 6s`);
    console.log(`         Bowling: ${performance.wickets} wickets (${performance.ballsBowled} balls), ${performance.runsConceded} runs, ${performance.maidens} maidens`);
    console.log(`         Fielding: ${performance.catches} catches, ${performance.runOuts} runouts, ${performance.stumpings} stumpings`);
    console.log(`         ${hasAnyPerformance ? '✅ PLAYED' : '⚪ DID NOT PLAY'}`);

    return hasAnyPerformance ? performance : null;
  },

  /**
   * Calculate fantasy points from performance
   */
  calculateFantasyPoints(
    performance,
    battingRules,
    bowlingRules,
    fieldingRules,
    awardRules,
    captainRules,
    isCaptain,
    isViceCaptain
  ) {
    console.log(`\n         💰 [POINTS] Calculating fantasy points...`);
    let points = 0;

    // BATTING POINTS
    const runPoints = performance.runs * battingRules.run;
    const fourPoints = performance.fours * battingRules.four;
    const sixPoints = performance.sixes * battingRules.six;
    
    console.log(`            🏏 Batting: Runs(${performance.runs} × ${battingRules.run}) = ${runPoints}`);
    console.log(`                       4s(${performance.fours} × ${battingRules.four}) = ${fourPoints}`);
    console.log(`                       6s(${performance.sixes} × ${battingRules.six}) = ${sixPoints}`);
    
    points += runPoints + fourPoints + sixPoints;

    // Batting milestones
    if (performance.runs >= 100) {
      points += battingRules.century;
    } else if (performance.runs >= 50) {
      points += battingRules.fifty;
    } else if (performance.runs === 0 && performance.ballsFaced > 0) {
      points += battingRules.duck; // Usually negative
    }

    // Strike rate bonus (if enabled and qualified)
    if (performance.ballsFaced >= 10 && battingRules.strikeRateBonus?.enabled) {
      const strikeRate = (performance.runs / performance.ballsFaced) * 100;
      for (const range of battingRules.strikeRateBonus.ranges) {
        if (strikeRate >= range.min && strikeRate <= range.max) {
          points += range.points;
          break;
        }
      }
    }

    // BOWLING POINTS
    const wicketPoints = performance.wickets * bowlingRules.wicket;
    const maidenPoints = performance.maidens * (bowlingRules.maiden || 0);
    
    console.log(`            🎳 Bowling: Wickets(${performance.wickets} × ${bowlingRules.wicket}) = ${wicketPoints}`);
    if (bowlingRules.maiden) {
      console.log(`                        Maidens(${performance.maidens} × ${bowlingRules.maiden}) = ${maidenPoints}`);
    }
    
    points += wicketPoints + maidenPoints;

    // Bowling milestones
    if (performance.wickets >= 5) {
      console.log(`                        5-Wicket Haul = ${bowlingRules.fiveWicketHaul}`);
      points += bowlingRules.fiveWicketHaul;
    } else if (performance.wickets >= 3) {
      console.log(`                        3-Wicket Haul = ${bowlingRules.threeWicketHaul}`);
      points += bowlingRules.threeWicketHaul;
    }

    // Economy rate bonus (if enabled and qualified)
    if (performance.ballsBowled >= 12 && bowlingRules.economyRateBonus?.enabled) {
      const overs = performance.ballsBowled / 6;
      const economy = performance.runsConceded / overs;
      
      for (const range of bowlingRules.economyRateBonus.ranges) {
        if (economy >= range.min && economy <= range.max) {
          points += range.points;
          break;
        }
      }
    }

    // FIELDING POINTS
    const catchPoints = performance.catches * fieldingRules.catch;
    const runOutPoints = performance.runOuts * fieldingRules.runOut;
    const stumpingPoints = performance.stumpings * fieldingRules.stumping;
    
    console.log(`            🧤 Fielding: Catches(${performance.catches} × ${fieldingRules.catch}) = ${catchPoints}`);
    console.log(`                         Run Outs(${performance.runOuts} × ${fieldingRules.runOut}) = ${runOutPoints}`);
    console.log(`                         Stumpings(${performance.stumpings} × ${fieldingRules.stumping}) = ${stumpingPoints}`);
    
    points += catchPoints + runOutPoints + stumpingPoints;

    // AWARDS
    if (performance.isManOfMatch) {
      console.log(`            🏆 Man of Match = ${awardRules.manOfTheMatch}`);
      points += awardRules.manOfTheMatch;
    }

    console.log(`            💯 Base Points = ${points}`);

    // CAPTAIN/VICE-CAPTAIN MULTIPLIER
    let finalPoints = points;
    if (captainRules.enabled) {
      if (isCaptain) {
        console.log(`            👑 Captain Multiplier: ${points} × ${captainRules.captainMultiplier} = ${points * captainRules.captainMultiplier}`);
        finalPoints = points * captainRules.captainMultiplier;
      } else if (isViceCaptain) {
        console.log(`            👔 Vice-Captain Multiplier: ${points} × ${captainRules.viceCaptainMultiplier} = ${points * captainRules.viceCaptainMultiplier}`);
        finalPoints = points * captainRules.viceCaptainMultiplier;
      }
    }

    console.log(`            ✅ FINAL POINTS = ${finalPoints}\n`);

    return finalPoints;
  }
};

module.exports = scorecardProcessorService;

