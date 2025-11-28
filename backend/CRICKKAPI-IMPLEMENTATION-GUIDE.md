# CrickkAPI Implementation Guide

## 🎯 Overview

This guide shows how to properly implement CrickkAPI with **exact name matching** to ensure correct player stats are fetched.

---

## 🔑 API Endpoints

### 1. Player Search
```
GET https://crickkapi.p.rapidapi.com/playerSearch
Headers:
  x-rapidapi-host: crickkapi.p.rapidapi.com
  x-rapidapi-key: YOUR_API_KEY
Params:
  name: "Virat Kohli"
```

**Response Example:**
```json
{
  "Players": [
    {
      "id": 253802,
      "name": "Virat Kohli",
      "team": "India",
      "battingStyles": ["right-hand bat"],
      "bowlingStyles": ["right-arm medium"],
      "dateOfBirth": {
        "date": 5,
        "month": 11,
        "year": 1988
      },
      "gender": "M"
    },
    {
      "id": 999999,
      "name": "Virat Kohli Jr",
      "team": "India U19",
      ...
    }
  ]
}
```

**⚠️ Important:** Response is an OBJECT with `Players` array, not a direct array!

### 2. Player Stats
```
GET https://crickkapi.p.rapidapi.com/playerStats
Headers:
  x-rapidapi-host: crickkapi.p.rapidapi.com
  x-rapidapi-key: YOUR_API_KEY
Params:
  playerId: 253802
```

---

## ⚠️ CRITICAL: Exact Name Matching

### The Problem
When searching for "Virat Kohli", you might get:
- ✅ Virat Kohli (India) - ID: 253802
- ❌ Virat Kohli Jr (India U19) - ID: 999999
- ❌ Virat Kohli (Domestic) - ID: 888888

**You MUST match the exact name to get the correct player!**

### The Solution

```javascript
async function getPlayerStats(playerName) {
  // Step 1: Search for player
  const searchResponse = await searchPlayer(playerName);
  
  // Step 1.5: Extract Players array from response
  const searchResults = searchResponse.Players || searchResponse;
  
  if (!Array.isArray(searchResults) || searchResults.length === 0) {
    throw new Error(`No results found for "${playerName}"`);
  }
  
  // Step 2: Find EXACT match
  const exactMatch = searchResults.find(player => 
    player.name.toLowerCase().trim() === playerName.toLowerCase().trim()
  );
  
  if (!exactMatch) {
    throw new Error(`No exact match found for "${playerName}"`);
  }
  
  // Step 3: Fetch stats using exact match ID
  const stats = await fetchPlayerStats(exactMatch.id);
  
  return stats;
}
```

---

## 📝 Implementation Steps

### Step 1: Create CrickkAPI Provider

Create `backend/src/services/cricket-api/providers/crickkapi-provider.js`:

```javascript
const axios = require('axios');

class CrickkApiProvider {
  constructor() {
    this.name = 'CrickkAPI';
    this.baseURL = 'https://crickkapi.p.rapidapi.com';
    this.host = 'crickkapi.p.rapidapi.com';
    this.apiKey = process.env.RAPIDAPI_KEY;
  }

  /**
   * Search for a player by name
   */
  async searchPlayer(playerName) {
    try {
      const response = await axios.get(`${this.baseURL}/playerSearch`, {
        headers: {
          'x-rapidapi-host': this.host,
          'x-rapidapi-key': this.apiKey
        },
        params: {
          name: playerName
        },
        timeout: 10000
      });

      // Extract Players array from response (API returns { Players: [...] })
      return response.data.Players || response.data;
    } catch (error) {
      console.error(`[CrickkAPI] Search failed for ${playerName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get player stats by ID
   */
  async getPlayerStats(playerId) {
    try {
      const response = await axios.get(`${this.baseURL}/playerStats`, {
        headers: {
          'x-rapidapi-host': this.host,
          'x-rapidapi-key': this.apiKey
        },
        params: {
          playerId: playerId
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error(`[CrickkAPI] Stats failed for player ${playerId}:`, error.message);
      throw error;
    }
  }

  /**
   * IMPORTANT: Find exact player match
   */
  findExactMatch(searchResults, targetName) {
    if (!Array.isArray(searchResults)) {
      return null;
    }

    return searchResults.find(player => 
      player.name?.toLowerCase().trim() === targetName.toLowerCase().trim()
    );
  }

  /**
   * Main method: Get stats by player name with exact matching
   */
  async fetchPlayerStatsByName(playerName) {
    console.log(`[CrickkAPI] Fetching stats for: ${playerName}`);

    // Step 1: Search
    const searchResults = await this.searchPlayer(playerName);
    console.log(`[CrickkAPI] Found ${searchResults?.length || 0} results`);

    if (!searchResults || searchResults.length === 0) {
      throw new Error(`No results found for ${playerName}`);
    }

    // Step 2: Find exact match
    const exactMatch = this.findExactMatch(searchResults, playerName);

    if (!exactMatch) {
      console.warn(`[CrickkAPI] No exact match for "${playerName}". Available:`);
      searchResults.forEach(p => console.warn(`  - ${p.name} (${p.team})`));
      throw new Error(`No exact match found for ${playerName}`);
    }

    console.log(`[CrickkAPI] Exact match: ${exactMatch.name} (ID: ${exactMatch.id})`);

    // Step 3: Fetch stats
    const stats = await this.getPlayerStats(exactMatch.id);

    // Step 4: Normalize data
    return this.normalizePlayerStats(stats, exactMatch);
  }

  /**
   * Normalize stats to match our internal format
   */
  normalizePlayerStats(stats, playerInfo) {
    // TODO: Parse CrickkAPI stats format and convert to our format
    // This will depend on the actual stats structure from the API
    
    return {
      id: playerInfo.id,
      name: playerInfo.name,
      team: playerInfo.team,
      role: this.determineRole(playerInfo),
      batting: stats.batting || {},
      bowling: stats.bowling || {},
      // ... map other fields
    };
  }

  determineRole(playerInfo) {
    const batting = playerInfo.battingStyles?.[0] || '';
    const bowling = playerInfo.bowlingStyles?.[0] || '';

    if (bowling && bowling !== 'NA') {
      return 'All-Rounder';
    }
    return 'Batsman';
  }
}

module.exports = CrickkApiProvider;
```

### Step 2: Update Cricket API Service

Update `backend/src/services/cricket-api/index.js`:

```javascript
const CrickkApiProvider = require('./providers/crickkapi-provider');

// In your class constructor:
this.crickkApiProvider = new CrickkApiProvider();

// Add method to try CrickkAPI:
async getPlayerStats(playerName, playerRole, playerTeam) {
  try {
    // Try CrickkAPI first (simpler, faster)
    console.log(`[CricketAPI] Trying CrickkAPI for ${playerName}`);
    const stats = await this.crickkApiProvider.fetchPlayerStatsByName(playerName);
    
    if (stats) {
      // Save to cache
      await this.saveToCache(stats);
      return stats;
    }
  } catch (error) {
    console.warn(`[CricketAPI] CrickkAPI failed, falling back to Cricbuzz`);
  }

  // Fallback to Cricbuzz
  return this.rapidApiCricbuzzProvider.fetchPlayerStatsByName(playerName);
}
```

---

## ✅ Testing Checklist

Before switching to CrickkAPI, verify:

- [ ] Search returns results for common players
- [ ] Exact matching works correctly
- [ ] Stats are complete (batting, bowling, formats)
- [ ] Stats format matches what we need
- [ ] Tier calculation still works
- [ ] Rate limits are acceptable
- [ ] Error handling works properly
- [ ] Cache integration works

---

## 🎯 Comparison: CrickkAPI vs Cricbuzz

| Feature | CrickkAPI | Cricbuzz (Current) |
|---------|-----------|-------------------|
| Search | Simple `/playerSearch` | `/stats/v1/player/search` |
| Stats | Single endpoint | Multiple (batting/bowling) |
| Format | Direct JSON | Table format (needs parsing) |
| Matching | **Must implement exact match** | Has exact match logic |
| Data | Unknown completeness | Proven comprehensive |
| Integration | 2-3 hours | Already done ✅ |

---

## 💡 Recommendation

**Option 1: Hybrid Approach (Best)**
- Try CrickkAPI first (simpler)
- Fall back to Cricbuzz if fails
- Best of both worlds

**Option 2: Switch to CrickkAPI**
- Only if data is complete
- Only if format is easier
- Test thoroughly first!

**Option 3: Keep Cricbuzz**
- Safest option
- Already working
- Proven data quality

---

## 🔍 Next Steps

1. **Run test script:** `node test-crickkapi.js`
2. **Review data structure:** Check if stats are complete
3. **Compare with Cricbuzz:** Which has better data?
4. **Make decision:** Switch, keep, or hybrid?
5. **Implement:** Follow steps above if switching

---

## 📞 Support

If you encounter issues:
1. Check API key is valid
2. Check rate limits (RapidAPI dashboard)
3. Review error messages
4. Test with different player names

---

**Remember:** Always implement exact name matching to avoid getting stats for the wrong player!

