# Player Statistics API Flow

## 🎯 Complete Map of Player Stats API Calls

---

## 🔴 **BEFORE AUCTION (Lock Tournament → Start Auction)**

### **Trigger:** User clicks "Lock & Start Auction" button in Lobby

### **Backend Flow:**
```
1. GET /api/tournaments/{id}/lock → Lock tournament
2. GET /api/auction/{id}/start → Start auction
```

### **API Call #1: Fetch Squad**
**Location:** `backend/src/services/auction.service.js` → `prepareAuctionPlayers()`  
**Line:** 225  
**Method:** `cricketApiService.getAllSquads(seriesId, format)`

**What It Does:**
- Fetches list of ALL players in the series for the selected format
- Returns: Player name, role, team

**API Used:**
- ✅ **Unofficial Cricbuzz** (primary, ONLY option now)
- ❌ CricketData (removed in Phase 2)
- ❌ CricAPI (removed in Phase 2)

**API Calls:** `1 call` (fetches all squads at once)

**Data Format:**
```json
[
  {
    "apiPlayerId": "123",
    "name": "Virat Kohli",
    "role": "Batsman",
    "team": "India"
  }
]
```

---

### **API Call #2: Fetch Player Career Stats (FOR EACH PLAYER)**
**Location:** `backend/src/services/auction.service.js` → `prepareAuctionPlayers()`  
**Lines:** 248-254  
**Method:** `cricketApiService.getPlayerStats(name, role, team, format)`

**What It Does:**
- Fetches career statistics for EACH player
- Used for tier calculation (A/B/C/D)
- Called **30+ times** (once per player in squad)

**API Used:**
- ✅ **RapidAPI Cricbuzz** (primary)
- ⚠️ CricketData (fallback) ← **CURRENT**
- ⚠️ CricAPI (fallback) ← **CURRENT**

**Current Priority (Line 171 in api-selector.js):**
```javascript
case 'playerStats':
  return ['rapidapi', 'cricketdata', 'cricapi']; // ⚠️ 3 providers
```

**API Calls:** `30-40 calls` (1 per player)

**Data Format (RapidAPI):**
```json
{
  "batting": {
    "matches": 100,
    "runs": 5000,
    "average": 50.5,
    "strikeRate": 135.2,
    "centuries": 15,
    "fifties": 25
  },
  "bowling": {
    "matches": 80,
    "wickets": 120,
    "average": 28.5,
    "economy": 5.2,
    "strikeRate": 32.5
  }
}
```

**Data Format (CricketData - INCOMPATIBLE!):**
```json
{
  "stats": [
    { "type": "matches", "value": "100" },
    { "type": "runs", "value": "5000" }
  ]
}
// ❌ Different structure! Tier calculation BREAKS!
```

**Rate Limiting:** 100ms delay between calls

---

## 🟢 **DURING AUCTION (When Player Card Displayed)**

### **Trigger:** New player appears in auction (auto or after previous player sold)

### **Backend Flow:**
```
Frontend polls every 1 second:
GET /api/auction/{id}/players → Get current player + bids
```

### **API Call #3: Fetch Dynamic Stats (OPTIONAL)**
**Location:** `backend/src/controllers/auction.controller.js` → `getDynamicPlayerStats()`  
**Lines:** 693-792  
**Triggered:** Frontend calls when player has NO stats (line 172 in auction/page.tsx)

**What It Does:**
- Fetches format-specific stats for player who has no career stats
- ONLY called if player.overallStats is empty
- Shows "Live ODI Stats Loaded" banner

**API Used:**
- ✅ **CrickkAPI** (RapidAPI) - Direct call, NO api-selector
- ❌ NO FALLBACKS

**Backend Code:**
```javascript
// Line 747-748
const CrickkApiProvider = require('../services/cricket-api/providers/crickkapi-provider');
const crickkApi = new CrickkApiProvider();

// Line 760
const stats = await crickkApi.fetchPlayerStatsByName(playerName, format);
```

**API Calls:** `0-30 calls` (only for players without pre-loaded stats)

**Data Format:**
```json
{
  "batting": {
    "runs": 1200,
    "average": 45.5,
    "strikeRate": 135.5
  },
  "bowling": {
    "wickets": 20,
    "economy": 5.8
  }
}
```

**Note:** This is OPTIONAL - if API key not configured, shows zeros (graceful degradation)

---

## 📊 **Summary Table**

| Stage | API Call | Provider | Fallback | Calls | Critical? |
|-------|----------|----------|----------|-------|-----------|
| **Before Auction** | | | | | |
| Fetch Squad | `getAllSquads()` | Unofficial | ❌ None | 1 | ✅ YES |
| Player Career Stats | `getPlayerStats()` | RapidAPI | ⚠️ CricketData, CricAPI | 30+ | ✅ YES |
| **During Auction** | | | | | |
| Dynamic Stats | `fetchPlayerStatsByName()` | CrickkAPI | ❌ None | 0-30 | ❌ NO (optional) |

---

## 🚨 **PROBLEM: Player Career Stats Fallback**

### **Current Behavior:**
```
For each player:
1. Try RapidAPI → Get stats → ✅ Works
2. RapidAPI fails → Try CricketData → Different format → ❌ Tier breaks
3. CricketData fails → Try CricAPI → Different format → ❌ Tier breaks
```

### **What Happens When Fallback Used:**
- ❌ Data structure mismatch
- ❌ `stats.batting.runs` becomes `undefined`
- ❌ Tier calculation fails → Everyone gets Tier D
- ❌ Base prices all become 1 Cr
- ❌ Auction ruined

---

## ✅ **RECOMMENDATION**

### **Remove Player Stats Fallback:**

**Change in:** `backend/src/services/cricket-api/api-selector.js` (Line 169-171)

```javascript
// BEFORE:
case 'playerStats':
  return ['rapidapi', 'cricketdata', 'cricapi']; // ❌ Breaks on fallback

// AFTER:
case 'playerStats':
  return ['rapidapi']; // ✅ Consistent data or graceful failure
```

**Also update:** `backend/src/services/cricket-api/index.js` (Line 502-551)

Remove the `executeWithFallback` call, use direct RapidAPI:
- If RapidAPI works → Get stats, calculate tier
- If RapidAPI fails → Skip stats, assign Tier D, log warning

---

## 💡 **Key Insights:**

1. **Squad fetch (1 call):** ✅ Works perfectly with Unofficial only
2. **Player stats (30+ calls):** ⚠️ **BROKEN FALLBACK** - needs fixing
3. **Dynamic stats (0-30 calls):** ✅ Already has no fallback, graceful

---

## 🎯 **Next Step:**

Should we fix the Player Stats fallback (remove CricketData & CricAPI)?

This is **Phase 1 from earlier** - fixing the BROKEN fallback that causes tier calculation to fail.



