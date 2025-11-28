const axios = require('axios');

/**
 * CrickkAPI Provider
 * Used for dynamic stats fetching during auction (on-demand)
 * Free tier: Check RapidAPI dashboard for limits
 */
class CrickkApiProvider {
  constructor() {
    this.name = 'CrickkAPI';
    this.baseURL = 'https://crickkapi.p.rapidapi.com';
    this.host = 'crickkapi.p.rapidapi.com';
    this.apiKey = process.env.RAPIDAPI_KEY;
    this.isEnabled = !!this.apiKey;
  }

  /**
   * Search for a player by name
   * @param {string} playerName - Player's full name
   * @returns {Object|null} Player info with ID
   */
  async searchPlayer(playerName) {
    if (!this.isEnabled) {
      console.warn(`[${this.name}] API key not configured`);
      return null;
    }

    try {
      console.log(`[${this.name}] 🔍 Searching for: ${playerName}`);

      const response = await axios.get(`${this.baseURL}/playerSearch`, {
        headers: {
          'x-rapidapi-host': this.host,
          'x-rapidapi-key': this.apiKey
        },
        params: {
          name: playerName
        },
        timeout: 15000
      });

      // Extract Players array from response
      const players = response.data.Players || response.data;

      if (!Array.isArray(players) || players.length === 0) {
        console.log(`[${this.name}] ❌ No results found for: ${playerName}`);
        return null;
      }

      console.log(`[${this.name}] ✅ Found ${players.length} result(s)`);

      // Find EXACT match (case-insensitive)
      const exactMatch = players.find(p => 
        p.name?.toLowerCase().trim() === playerName.toLowerCase().trim()
      );

      if (exactMatch) {
        console.log(`[${this.name}] ✅ Exact match: ${exactMatch.name} (ID: ${exactMatch.id})`);
        return exactMatch;
      }

      // If no exact match, return first result as fallback
      console.log(`[${this.name}] ⚠️  No exact match, using first result: ${players[0].name}`);
      return players[0];

    } catch (error) {
      console.error(`[${this.name}] ❌ Search failed for ${playerName}:`, error.message);
      if (error.response?.status === 429) {
        console.error(`[${this.name}] Rate limit exceeded`);
      }
      return null;
    }
  }

  /**
   * Fetch player stats by ID
   * @param {string|number} playerId - Player's ID from search
   * @param {string} format - Match format (T20, ODI, Test) - optional for now
   * @returns {Object|null} Player statistics
   */
  async fetchPlayerStats(playerId, format = null) {
    if (!this.isEnabled) {
      console.warn(`[${this.name}] API key not configured`);
      return null;
    }

    try {
      console.log(`[${this.name}] 📊 Fetching stats for player ID: ${playerId}`);

      // Try different parameter names
      const paramNames = ['id', 'playerId', 'player_id'];
      
      for (const paramName of paramNames) {
        try {
          const response = await axios.get(`${this.baseURL}/playerStats`, {
            headers: {
              'x-rapidapi-host': this.host,
              'x-rapidapi-key': this.apiKey
            },
            params: {
              [paramName]: playerId
            },
            timeout: 15000
          });

          // Check if we got valid data
          if (response.data && response.data.message && response.data.message.includes('provide player id')) {
            continue; // Try next parameter name
          }

          console.log(`[${this.name}] ✅ Stats received (using parameter: "${paramName}")`);
          return response.data;

        } catch (error) {
          if (paramName === paramNames[paramNames.length - 1]) {
            throw error; // Last attempt failed
          }
        }
      }

      console.log(`[${this.name}] ❌ All parameter attempts failed`);
      return null;

    } catch (error) {
      console.error(`[${this.name}] ❌ Stats fetch failed for player ${playerId}:`, error.message);
      if (error.response?.status === 429) {
        console.error(`[${this.name}] Rate limit exceeded`);
      }
      return null;
    }
  }

  /**
   * Fetch player stats by name (search + stats in one call)
   * @param {string} playerName - Player's full name
   * @param {string} format - Match format (T20, ODI, Test)
   * @returns {Object|null} Format-specific player statistics
   */
  async fetchPlayerStatsByName(playerName, format = 'ODI') {
    try {
      console.log(`[${this.name}] 📊 Fetching ${format} stats for: ${playerName}`);

      // Step 1: Search for player to get ID
      const playerInfo = await this.searchPlayer(playerName);
      
      if (!playerInfo || !playerInfo.id) {
        console.warn(`[${this.name}] ⚠️  Could not find player: ${playerName}`);
        return null;
      }

      // Step 2: Fetch stats using player ID
      const stats = await this.fetchPlayerStats(playerInfo.id, format);
      
      if (!stats) {
        console.warn(`[${this.name}] ⚠️  No stats available for: ${playerName}`);
        return null;
      }

      // Step 3: Extract format-specific stats
      const formatSpecificStats = this.extractFormatStats(stats, format);

      console.log(`[${this.name}] ✅ Retrieved ${format} stats for: ${playerName}`);
      return formatSpecificStats;

    } catch (error) {
      console.error(`[${this.name}] ❌ Failed to fetch stats for ${playerName}:`, error.message);
      return null;
    }
  }

  /**
   * Extract format-specific stats from full stats response
   * @param {Object} stats - Complete stats from API
   * @param {string} format - Format to extract (T20, ODI, Test)
   * @returns {Object} Format-specific stats
   */
  /**
   * Map our format names to CrickkAPI format names
   */
  mapFormatName(format) {
    const formatMap = {
      'ODI': 'One-Day Internationals',
      'TEST': 'Tests',
      'T20': 'Twenty20 Internationals',
      'T20I': 'Twenty20 Internationals'
    };
    
    const normalized = (format || 'ODI').toUpperCase();
    return formatMap[normalized] || format;
  }

  extractFormatStats(stats, format) {
    if (!stats) return null;

    const normalizedFormat = (format || 'ODI').toUpperCase();
    const crickkApiFormat = this.mapFormatName(format);
    
    console.log(`[${this.name}] 🔍 Looking for format: ${normalizedFormat} -> ${crickkApiFormat}`);
    
    const result = {
      format: normalizedFormat,
      batting: {},
      bowling: {},
      fielding: {}
    };

    // CrickkAPI structure: stats.BATTING["One-Day Internationals"]
    if (stats.stats) {
      // Extract batting stats from stats.BATTING
      if (stats.stats.BATTING) {
        const battingData = stats.stats.BATTING;
        console.log(`[${this.name}] 🔍 BATTING formats available:`, Object.keys(battingData));
        
        if (battingData[crickkApiFormat]) {
          result.batting = battingData[crickkApiFormat];
          console.log(`[${this.name}] ✅ Found BATTING["${crickkApiFormat}"]:`, JSON.stringify(result.batting).substring(0, 200));
        }
      }

      // Extract bowling stats from stats.BOWLING
      if (stats.stats.BOWLING) {
        const bowlingData = stats.stats.BOWLING;
        console.log(`[${this.name}] 🔍 BOWLING formats available:`, Object.keys(bowlingData));
        
        if (bowlingData[crickkApiFormat]) {
          result.bowling = bowlingData[crickkApiFormat];
          console.log(`[${this.name}] ✅ Found BOWLING["${crickkApiFormat}"]:`, JSON.stringify(result.bowling).substring(0, 200));
        }
      }

      // Extract fielding stats if available
      if (stats.stats.FIELDING) {
        const fieldingData = stats.stats.FIELDING;
        if (fieldingData[crickkApiFormat]) {
          result.fielding = fieldingData[crickkApiFormat];
        }
      }
    }

    // Normalize field names to match our internal format
    result.batting = this.normalizeBattingStats(result.batting);
    result.bowling = this.normalizeBowlingStats(result.bowling);

    console.log(`[${this.name}] 📊 Extracted ${normalizedFormat} stats`);
    console.log(`[${this.name}] 📊 Final batting:`, JSON.stringify(result.batting));
    console.log(`[${this.name}] 📊 Final bowling:`, JSON.stringify(result.bowling));
    
    return result;
  }

  /**
   * Normalize CrickkAPI batting field names to our internal format
   */
  normalizeBattingStats(battingData) {
    if (!battingData || Object.keys(battingData).length === 0) return {};

    return {
      matches: parseInt(battingData.Mat || battingData.Matches || 0),
      innings: parseInt(battingData.Inns || battingData.Innings || 0),
      notOuts: parseInt(battingData.NO || battingData['Not Out'] || 0),
      runs: parseInt(battingData.Runs || 0),
      highestScore: battingData.HS || battingData.Highest || '0',
      average: parseFloat(battingData.Avg || battingData.Average || 0),
      ballsFaced: parseInt(battingData.Balls || battingData.BF || 0),
      strikeRate: parseFloat(battingData.SR || battingData['Strike Rate'] || 0),
      centuries: parseInt(battingData['100s'] || battingData['100'] || battingData.hundreds || 0),
      halfCenturies: parseInt(battingData['50s'] || battingData['50'] || battingData.fifties || 0),
      ducks: parseInt(battingData.Ducks || 0),
      fours: parseInt(battingData['4s'] || battingData.fours || 0),
      sixes: parseInt(battingData['6s'] || battingData.sixes || 0)
    };
  }

  /**
   * Normalize CrickkAPI bowling field names to our internal format
   */
  normalizeBowlingStats(bowlingData) {
    if (!bowlingData || Object.keys(bowlingData).length === 0) return {};

    return {
      matches: parseInt(bowlingData.Mat || bowlingData.Matches || 0),
      innings: parseInt(bowlingData.Inns || bowlingData.Innings || 0),
      balls: parseInt(bowlingData.Balls || 0),
      runs: parseInt(bowlingData.Runs || 0),
      wickets: parseInt(bowlingData.Wkts || bowlingData.Wickets || 0),
      average: parseFloat(bowlingData.Avg || bowlingData.Average || 0),
      economy: parseFloat(bowlingData.Econ || bowlingData.Economy || 0),
      strikeRate: parseFloat(bowlingData.SR || bowlingData['Strike Rate'] || 0),
      fiveWickets: parseInt(bowlingData['5W'] || bowlingData['5w'] || 0),
      tenWickets: parseInt(bowlingData['10W'] || bowlingData['10w'] || 0)
    };
  }
}

module.exports = CrickkApiProvider;

