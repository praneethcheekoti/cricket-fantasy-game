# Debugging Guide: Fantasy Points Calculation

## 🎯 Overview
This document explains the extensive logging added at each step of fantasy points calculation to help debug issues **without wasting API calls**.

---

## 📊 Complete Log Flow

When you click "Calculate Fantasy Points", you'll see detailed logs at each step:

### **Step 1: Initial Processing**
```
🏏 [Scorecard Processor] Processing match: {matchId}
   Tournament: {tournamentId}
   API Match ID: {apiMatchId}
```

### **Step 2: Scorecard Fetch**
```
   📡 Fetching scorecard from API...
   🔍 API Match ID: 117389
   ✅ Scorecard fetched successfully
   📊 Innings count: 2
   🏏 Match complete: true
   📝 Status: India won by 17 runs
```
**What to check:**
- If fetch fails → API key issue or invalid matchId
- If innings count = 0 → Invalid scorecard structure
- If match not complete → Can't calculate points yet

### **Step 3: Player Extraction (For Each Player)**
```
      🔍 [EXTRACT] Processing: Virat Kohli (ID: 1234)
      📊 [EXTRACT] Innings to process: 2
      📋 [EXTRACT] Innings 1: India batting
```

#### **3a. Batting Search**
```
         🏏 [BATTING] Checking 11 batsmen for ID: 1234
         ✅ [BATTING] FOUND: Virat Kohli
            Runs: 75, Balls: 50, 4s: 8, 6s: 2
```
OR
```
         ⚪ [BATTING] Not found in this innings
```
**What to check:**
- If player not found but should have played → **ID mismatch** between squad and scorecard
- Player ID from squad: Check `AuctionPlayer.playerId`
- Player ID from scorecard: Check `scorecard.batsman[].id`

#### **3b. Bowling Search**
```
         🎳 [BOWLING] Checking 8 bowlers for ID: 1234
         ✅ [BOWLING] FOUND: Jasprit Bumrah
            Overs: 4 → 24 balls, Wickets: 3, Runs: 25, Maidens: 1
```
OR
```
         ⚪ [BOWLING] Not found in this innings
```
**What to check:**
- Overs conversion: `4.5` → `29 balls` (4×6 + 5)
- If overs look wrong → Check calculation logic

#### **3c. Fielding Parsing**
```
         🧤 [FIELDING] Parsing dismissals from 10 batsmen
            📝 Rohit Sharma: "c Kohli b Bumrah"
               ✋ CATCH by: "Kohli"
            📝 Dhawan: "run out (Jadeja / Kohli)"
               🏃 RUN OUT by: Jadeja, Kohli
            📝 Pant: "st Dhoni b Ashwin"
               🧤 STUMPING by: "Dhoni"
      🧤 [FIELDING MAP] Total fielders tracked: 5
```
**What to check:**
- Each dismissal is parsed with the fielder's name
- Fielding map shows all unique fielders

#### **3d. Name Matching (CRITICAL!)**
```
      🔍 [NAME MATCH] Matching "Virat Kohli" against 5 fielders
         🔄 Comparing: "Virat Kohli" (viratkohli) vs "Kohli" (kohli)
         ✅ [NAME MATCH] MATCHED! Assigning fielding stats:
            Catches: 2, Run Outs: 1, Stumpings: 0
```
OR
```
         🔄 Comparing: "Virat Kohli" (viratkohli) vs "Rohit" (rohit)
         ⚪ [NAME MATCH] No match found for "Virat Kohli"
```
**What to check:**
- **This is where fielding is assigned!**
- Normalized names remove spaces and non-alphabetic characters
- Matching is fuzzy: "Virat Kohli" matches "Kohli" or "V Kohli"
- If no match → Fielder name in outDec doesn't match squad player name

**Common Issues:**
- Scorecard uses short names: "Kohli" instead of "Virat Kohli"
- Squad uses full names: "Virat Kohli" instead of "V Kohli"
- **Solution:** Matching is substring-based, so both should work

#### **3e. Performance Summary**
```
      📊 [SUMMARY] Virat Kohli:
         Batting: 75 runs (50 balls), 8 4s, 2 6s
         Bowling: 0 wickets (0 balls), 0 runs, 0 maidens
         Fielding: 2 catches, 1 runouts, 0 stumpings
         ✅ PLAYED
```
OR
```
      📊 [SUMMARY] Player Name:
         Batting: 0 runs (0 balls), 0 4s, 0 6s
         Bowling: 0 wickets (0 balls), 0 runs, 0 maidens
         Fielding: 0 catches, 0 runouts, 0 stumpings
         ⚪ DID NOT PLAY
```

### **Step 4: Fantasy Points Calculation**
```
         💰 [POINTS] Calculating fantasy points...
            🏏 Batting: Runs(75 × 1) = 75
                       4s(8 × 4) = 32
                       6s(2 × 6) = 12
            🎳 Bowling: Wickets(0 × 25) = 0
            🧤 Fielding: Catches(2 × 10) = 20
                         Run Outs(1 × 15) = 15
                         Stumpings(0 × 15) = 0
            💯 Base Points = 154
            👑 Captain Multiplier: 154 × 2 = 308
            ✅ FINAL POINTS = 308
```

**What to check:**
- Each rule is applied step-by-step
- Milestones (50, 100, 3W, 5W) logged if applicable
- Bonuses (SR, Economy) logged if qualified
- Captain/VC multiplier shown separately

### **Step 5: Final Summary**
```
      ✅ Virat Kohli: 308 points
      ⚪ Player2: 0 points (did not play)
   
   ✅ Match processing complete!
   📊 Total players processed: 22
```

---

## 🔍 Debugging Common Issues

### **Issue 1: Player Not Found (ID Mismatch)**
**Symptoms:**
```
🏏 [BATTING] Checking 11 batsmen for ID: 1234
⚪ [BATTING] Not found in this innings
```

**Debug Steps:**
1. Check what IDs are in the scorecard:
   ```javascript
   console.log(scorecard.scorecard[0].batsman.map(b => ({ id: b.id, name: b.name })))
   ```

2. Check what IDs are in your squad:
   ```sql
   SELECT playerId, playerName FROM AuctionPlayer WHERE tournamentId = '{id}'
   ```

3. **Fix:** Update `AuctionPlayer.playerId` to match the API player IDs

---

### **Issue 2: Fielding Not Assigned**
**Symptoms:**
```
🔍 [NAME MATCH] Matching "Virat Kohli" against 5 fielders
   🔄 Comparing: "Virat Kohli" (viratkohli) vs "V Kohli" (vkohli)
   ⚪ [NAME MATCH] No match found for "Virat Kohli"
```

**Debug Steps:**
1. Look at the fielding map:
   ```
   🧤 [FIELDING MAP] Total fielders tracked: 5
   ```

2. Check what names are in the map:
   - These come from `outDec` strings in the scorecard
   - Often shortened: "Kohli" instead of "Virat Kohli"

3. Check your squad player names:
   ```sql
   SELECT playerName FROM AuctionPlayer WHERE tournamentId = '{id}'
   ```

4. **Current Matching Logic:**
   ```javascript
   normalizedPlayerName.includes(normalizedFielderName) ||
   normalizedFielderName.includes(normalizedPlayerName)
   ```
   - "viratkohli" includes "kohli" ✅
   - "vkohli" includes "kohli" ✅
   - "kohli" includes "viratkohli" ❌ (but first condition passes)

5. **If still not matching:**
   - Add more flexible matching (e.g., split by spaces, match surnames)
   - Use Levenshtein distance for fuzzy matching

---

### **Issue 3: Wrong Points Calculation**
**Symptoms:**
```
💯 Base Points = 154
👑 Captain Multiplier: 154 × 2 = 308
✅ FINAL POINTS = 308
```
But expected different value.

**Debug Steps:**
1. Check each component in the logs:
   - Runs points
   - Boundary points
   - Wicket points
   - Fielding points
   - Milestones
   - Bonuses

2. Verify tournament rules:
   ```sql
   SELECT battingRules, bowlingRules, fieldingRules FROM Tournament WHERE id = '{id}'
   ```

3. Check for missing stats:
   - Did we miss any dismissals?
   - Are maiden overs being counted?

---

### **Issue 4: Overs Not Converting Correctly**
**Symptoms:**
```
Overs: 4.5 → 24 balls
```
Should be 29 balls (4 complete overs + 5 balls)

**Debug Steps:**
1. Check the conversion logic:
   ```javascript
   completedOvers = Math.floor(4.5) // 4
   extraBalls = Math.round((4.5 - 4) * 10) // 5
   ballsBowled = (4 * 6) + 5 // 29
   ```

2. Edge cases:
   - `4.0` → `24` balls ✅
   - `4.3` → `27` balls ✅
   - `4.5` → `29` balls ✅
   - `4.10` → Error (should be `5.0`)

---

## 🚀 How to Use This for Debugging

### **Before Running:**
1. Have a completed match ready
2. Know which players should have played
3. Have expected points calculated manually

### **During Run:**
1. Watch terminal logs in real-time
2. Look for ❌ or ⚠️  symbols (errors/warnings)
3. Check each player's extraction logs

### **After Run:**
1. Copy all logs to a file
2. Search for specific player names
3. Trace their journey:
   - Batting found? → Check ID
   - Bowling found? → Check ID
   - Fielding assigned? → Check name matching
   - Points calculated? → Check each component

### **If Something Breaks:**
The logs will tell you **exactly which step** failed:
- ❌ Scorecard fetch → API issue
- ⚪ Player not found → ID mismatch
- ⚪ Name match failed → Name mismatch
- ❌ Points calculation → Logic error

**You can debug without re-running the API call!** Just analyze the logs.

---

## 📝 Example Full Log Trace

```
🏏 [Scorecard Processor] Processing match: 12345...
   📡 Fetching scorecard from API...
   ✅ Scorecard fetched successfully
   📊 Innings count: 2

   👥 Processing team: Team India (User1)

      🔍 [EXTRACT] Processing: Virat Kohli (ID: 1234)
      📊 [EXTRACT] Innings to process: 2
      📋 [EXTRACT] Innings 1: India batting
         🏏 [BATTING] Checking 11 batsmen for ID: 1234
         ✅ [BATTING] FOUND: Virat Kohli
            Runs: 75, Balls: 50, 4s: 8, 6s: 2
         🎳 [BOWLING] Checking 8 bowlers for ID: 1234
         ⚪ [BOWLING] Not found in this innings
         🧤 [FIELDING] Parsing dismissals from 10 batsmen
            📝 Rohit: "c Kohli b Bumrah"
               ✋ CATCH by: "Kohli"
      🧤 [FIELDING MAP] Total fielders tracked: 3
      🔍 [NAME MATCH] Matching "Virat Kohli" against 3 fielders
         🔄 Comparing: "Virat Kohli" vs "Kohli"
         ✅ [NAME MATCH] MATCHED! Assigning:
            Catches: 1, Run Outs: 0, Stumpings: 0
      📊 [SUMMARY] Virat Kohli:
         Batting: 75 runs (50 balls), 8 4s, 2 6s
         Bowling: 0 wickets (0 balls)
         Fielding: 1 catches, 0 runouts, 0 stumpings
         ✅ PLAYED

         💰 [POINTS] Calculating...
            🏏 Batting: Runs(75 × 1) = 75
                       4s(8 × 4) = 32
                       6s(2 × 6) = 12
            🧤 Fielding: Catches(1 × 10) = 10
            💯 Base Points = 129
            👑 Captain: 129 × 2 = 258
            ✅ FINAL POINTS = 258

      ✅ Virat Kohli: 258 points

   ✅ Match processing complete!
   📊 Total players: 22
```

---

**Last Updated:** 2025-12-01  
**Status:** ✅ Complete Logging Implemented

