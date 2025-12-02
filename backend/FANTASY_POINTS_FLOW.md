# Fantasy Points Calculation - Complete Data Flow

## 🎯 Overview
This document tracks how data flows from the frontend "Calculate Fantasy Points" button through the backend to the database and back.

---

## 📊 Data Flow Diagram

```
Frontend (matches/page.tsx)
    ↓ Click "Calculate Fantasy Points"
    ↓ POST /api/tournaments/{tournamentId}/matches/{matchId}/calculate
    ↓
Backend (match.controller.js)
    ↓ calculateMatchPoints(tournamentId, matchId)
    ↓ Get Match record → externalMatchId
    ↓
Scorecard Processor (scorecard-processor.service.js)
    ↓ processMatch(tournamentId, matchId, externalMatchId)
    ↓
Cricket API Service (cricket-api/index.js)
    ↓ getLiveScore(externalMatchId)
    ↓
Unofficial Cricbuzz Provider
    ↓ GET https://unofficial-cricbuzz.p.rapidapi.com/matches/get-scorecard?matchId={externalMatchId}
    ↓ Returns: { scorecard: [...], isMatchComplete: true, status: "..." }
    ↓
Back to Scorecard Processor
    ↓ Extract player performances using API player IDs
    ↓ For each TeamPlayer in tournament:
    │   - Find their stats in scorecard by playerId
    │   - Parse batting: runs, balls, fours, sixes
    │   - Parse bowling: overs → balls, wickets, runs, maidens
    │   - Parse fielding from outDec strings:
    │     * "c PlayerName b Bowler" → catch
    │     * "run out (PlayerName)" → runout
    │     * "st PlayerName b Bowler" → stumping
    │   - Calculate fantasy points using tournament rules
    │   - Create MatchPlayerScore record
    ↓
Database (MatchPlayerScore)
    ↓ Save: playerId, teamPlayerId, runs, wickets, catches, fantasyPoints, etc.
    ↓
Response to Frontend
    ↓ { success: true, playerCount: X }
    ↓
Frontend Updates
    ↓ Show "Fantasy Points Successfully Calculated"
    ↓ Enable leaderboard view
```

---

## 🔑 Key Data Points

### 1. **Match Identification**
- **Frontend:** `match.id` (MongoDB ID from Match table)
- **Backend:** `match.externalMatchId` (API match ID, e.g., "117389")
- **API Call:** Uses `externalMatchId` as `matchId` parameter

### 2. **Player Identification**
- **Tournament Squad:** `AuctionPlayer.playerId` (API player ID, e.g., "1114")
- **Team Assignment:** `TeamPlayer` links `playerId` to a team
- **Scorecard Matching:** `scorecard.batsman[].id` or `scorecard.bowler[].id` matches `playerId`

### 3. **Scorecard Structure (Unofficial Cricbuzz)**
```javascript
{
  scorecard: [
    {
      inningsId: 1,
      batsman: [
        {
          id: 1114,              // API player ID ← MATCH THIS
          balls: 5,
          runs: 5,
          fours: 1,
          sixes: 0,
          strkRate: "100",
          name: "Stirling",
          outDec: "c Catch b Bowler"  // Parse fielding from here
        }
      ],
      bowler: [
        {
          id: 15475,            // API player ID ← MATCH THIS
          overs: "4",           // Convert to balls: 4.0 = 24, 4.5 = 29
          wickets: 2,
          runs: 29,
          maidens: 0,
          economy: "7.2",
          name: "Nisarg Patel"
        }
      ]
    }
  ],
  isMatchComplete: true,
  status: "India won by 17 runs"
}
```

### 4. **Parsing Logic**

#### Batting Stats (Direct Extraction)
```javascript
performance.runs = batsman.runs || 0
performance.ballsFaced = batsman.balls || 0
performance.fours = batsman.fours || 0
performance.sixes = batsman.sixes || 0
```

#### Bowling Stats
```javascript
// Overs to balls conversion
overs = parseFloat(bowler.overs)  // e.g., 4.5
completedOvers = Math.floor(overs)  // 4
extraBalls = (overs - completedOvers) * 10  // 0.5 * 10 = 5
ballsBowled = (completedOvers * 6) + extraBalls  // 24 + 5 = 29

performance.wickets = bowler.wickets || 0
performance.runsConceded = bowler.runs || 0
performance.maidens = bowler.maidens || 0
```

#### Fielding Stats (Parse from outDec)
```javascript
// Catches: "c PlayerName b Bowler"
if (outDec.includes(' c ')) {
  match = /c (?:& b )?([^b]+?)(?:\s+b\s+|$)/
  fielderName = match[1].trim()
  → fielderName gets 1 catch
}

// Run outs: "run out (PlayerName)" or "run out (Player1 / Player2)"
if (outDec.includes('run out')) {
  match = /run out \(([^)]+)\)/
  fielders = match[1].split('/')
  → Each fielder gets 1 runout
}

// Stumpings: "st WicketKeeper b Bowler"
if (outDec.includes(' st ')) {
  match = /st ([^b]+?)(?:\s+b\s+|$)/
  fielderName = match[1].trim()
  → fielderName gets 1 stumping
}

// Match fielder name to player by fuzzy name matching
```

### 5. **Fantasy Points Calculation**

#### Base Points
```javascript
points = 0
points += runs * battingRules.run
points += fours * battingRules.four
points += sixes * battingRules.six
points += wickets * bowlingRules.wicket
points += maidens * bowlingRules.maiden
points += catches * fieldingRules.catch
points += runOuts * fieldingRules.runOut
points += stumpings * fieldingRules.stumping
```

#### Bonuses
- **Batting Milestones:** 50, 100, Duck
- **Bowling Milestones:** 3-wicket, 5-wicket haul
- **Strike Rate Bonus:** (runs / ballsFaced) * 100 (min 10 balls)
- **Economy Rate Bonus:** runsConceded / (ballsBowled / 6) (min 2 overs)
- **Bowling Strike Rate:** ballsBowled / wickets (if wickets = 0, use 999)

#### Captain Multiplier
```javascript
if (isCaptain) {
  finalPoints = points * captainRules.captainMultiplier  // Usually 2x
} else if (isViceCaptain) {
  finalPoints = points * captainRules.viceCaptainMultiplier  // Usually 1.5x
}
```

### 6. **Non-Playing Players**
- If `playerId` not found in scorecard → create MatchPlayerScore with all stats = 0
- `fantasyPoints = 0` for non-playing players
- Still create the record to track that they didn't play

---

## 🗄️ Database Records Created

### MatchPlayerScore
```javascript
{
  id: ObjectId,
  matchId: "Match MongoDB ID",
  teamPlayerId: "TeamPlayer MongoDB ID",
  playerId: "API Player ID (e.g., 1114)",
  
  // Raw stats
  runs: 5,
  ballsFaced: 5,
  fours: 1,
  sixes: 0,
  wickets: 0,
  ballsBowled: 0,
  runsConceded: 0,
  maidens: 0,
  catches: 1,
  runOuts: 0,
  stumpings: 0,
  isManOfMatch: false,
  
  // Calculated
  fantasyPoints: 17.5  // Including captain/VC multiplier
}
```

---

## ✅ Data Integrity Checks

### Before Implementation
- [x] Match.externalMatchId exists in database
- [x] AuctionPlayer.playerId matches API player IDs from squad
- [x] TeamPlayer links playerId to teams
- [x] Tournament scoring rules are JSON-parseable

### After Calculate Points
- [ ] All TeamPlayers have MatchPlayerScore records (even non-players)
- [ ] fantasyPoints calculated correctly with multipliers
- [ ] Leaderboard updates with new scores
- [ ] Frontend shows "Fantasy Points Successfully Calculated"

---

## 🚨 Error Scenarios

| Error | Cause | Handling |
|-------|-------|----------|
| "Failed to fetch scorecard" | API down or matchId invalid | Show error toast, allow retry |
| "Tournament not found" | Invalid tournamentId | 404 response |
| "Match not found" | Invalid matchId | 404 response |
| "Match not completed" | status !== 'completed' | 400 response with message |
| "Match already processed" | MatchPlayerScore records exist | Return success with alreadyProcessed flag |
| Player ID mismatch | Squad playerId ≠ Scorecard player.id | Player marked as did not play (0 points) |

---

## 🔄 Testing Checklist

1. **Setup**
   - [ ] Create tournament with custom scoring rules
   - [ ] Complete auction with multiple teams
   - [ ] Identify a completed match from series

2. **Calculate Points**
   - [ ] Click "Calculate Fantasy Points"
   - [ ] Verify API call: GET /matches/get-scorecard
   - [ ] Check console logs for player processing
   - [ ] Verify MatchPlayerScore records created

3. **Verify Data**
   - [ ] Check runs, wickets match scorecard
   - [ ] Verify catches parsed from outDec
   - [ ] Check non-playing players have 0 points
   - [ ] Verify captain/VC multipliers applied

4. **Frontend Display**
   - [ ] "Fantasy Points Successfully Calculated" shown
   - [ ] Leaderboard updates with scores
   - [ ] Match-wise breakdown shows player stats

---

## 📝 Notes

- Raw scorecards are **NOT cached** to save database space
- Fielding stats require **fuzzy name matching** (API uses short names)
- Overs conversion: `4.5` means 4 overs + 5 balls = 29 balls total
- Bowling strike rate: If wickets = 0, use 999 (per user requirement)
- Non-playing players still get records created for completeness

---

**Last Updated:** 2025-12-01
**Status:** ✅ Implemented, Ready for Testing

