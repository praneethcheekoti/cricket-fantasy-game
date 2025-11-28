const BaseCricketProvider = require('./base-provider');
const axios = require('axios');

/**
 * RapidAPI Cricbuzz Provider Implementation
 * Official Cricbuzz data via RapidAPI
 * Free tier: 100 requests/day
 * API Documentation: https://rapidapi.com/cricketapilive/api/cricbuzz-cricket
 */
class RapidAPICricbuzzProvider extends BaseCricketProvider {
  constructor(apiKey, apiHost = 'cricbuzz-cricket.p.rapidapi.com') {
    super('RapidAPI-Cricbuzz', {
      baseUrl: `https://${apiHost}`,
      apiKey: apiKey,
      apiHost: apiHost,
      dailyLimit: 16, // Actual free tier limit (not 100 as advertised)
      isEnabled: !!apiKey
    });
  }

  /**
   * Make authenticated request to RapidAPI
   */
  async makeRequest(endpoint, params = {}) {
    try {
      const url = `${this.config.baseUrl}${endpoint}`;
      
      console.log(`[${this.name}] Request: GET ${endpoint}`);
      
      const response = await axios.get(url, {
        headers: {
          'X-RapidAPI-Key': this.config.apiKey,
          'X-RapidAPI-Host': this.config.apiHost
        },
        params: params,
        timeout: 10000
      });

      console.log(`[${this.name}] ✅ Success`);
      return response.data;

    } catch (error) {
      console.error(`[${this.name}] ❌ Request failed:`, error.message);
      
      if (error.response) {
        console.error(`[${this.name}] Status: ${error.response.status}`);
        console.error(`[${this.name}] Data:`, JSON.stringify(error.response.data).substring(0, 200));
      }
      
      throw error;
    }
  }

  /**
   * Fetch player statistics by player ID
   * This requires Cricbuzz player ID (not our internal UUID)
   * @param {string|number} cricbuzzPlayerId - Cricbuzz player ID
   * @param {string} format - Match format (T20, ODI, Test) for format-specific stats
   */
  async fetchPlayerStats(cricbuzzPlayerId, format = 'ODI') {
    try {
      console.log(`[${this.name}] Fetching ${format} stats for Cricbuzz ID: ${cricbuzzPlayerId}`);
      
      // Fetch batting and bowling stats in parallel
      const [playerInfo, battingData, bowlingData] = await Promise.all([
        this.makeRequest(`/stats/v1/player/${cricbuzzPlayerId}`),
        this.makeRequest(`/stats/v1/player/${cricbuzzPlayerId}/batting`),
        this.makeRequest(`/stats/v1/player/${cricbuzzPlayerId}/bowling`)
      ]);
      
      return this.normalizePlayerStats(playerInfo, battingData, bowlingData, format);

    } catch (error) {
      console.error(`[${this.name}] Failed to fetch player stats:`, error.message);
      return null;
    }
  }

  /**
   * Search for player by name (for ID mapping)
   * Returns: { player: [{ id, name, teamName, faceImageId, dob }] }
   */
  async searchPlayer(playerName) {
    try {
      console.log(`[${this.name}] Searching for player: ${playerName}`);
      
      const data = await this.makeRequest('/stats/v1/player/search', {
        plrN: playerName
      });
      
      if (data && data.player && data.player.length > 0) {
        console.log(`[${this.name}] ✅ Found: ${data.player[0].name} (ID: ${data.player[0].id})`);
        return data.player[0]; // Return first match
      }
      
      console.warn(`[${this.name}] ⚠️  No player found for: ${playerName}`);
      return null;

    } catch (error) {
      console.error(`[${this.name}] Failed to search player:`, error.message);
      return null;
    }
  }

  /**
   * Fetch player stats by name (includes ID mapping)
   * Main entry point for fetching stats - searches by name first, then fetches stats
   * @param {string} playerName - Player's full name
   * @param {string} format - Match format (T20, ODI, Test) for format-specific stats
   */
  async fetchPlayerStatsByName(playerName, format = 'ODI') {
    try {
      console.log(`[${this.name}] 📊 Fetching ${format} stats for: ${playerName}`);
      
      // Step 1: Search for player to get Cricbuzz ID
      const playerInfo = await this.searchPlayer(playerName);
      
      if (!playerInfo || !playerInfo.id) {
        console.warn(`[${this.name}] ⚠️  Could not find Cricbuzz ID for: ${playerName}`);
        return null;
      }
      
      // Step 2: Fetch stats using Cricbuzz ID with format
      const stats = await this.fetchPlayerStats(playerInfo.id, format);
      
      if (stats) {
        console.log(`[${this.name}] ✅ Retrieved ${format} stats for: ${playerName}`);
      }
      
      return stats;

    } catch (error) {
      console.error(`[${this.name}] ❌ Failed to fetch stats for ${playerName}:`, error.message);
      return null;
    }
  }

  /**
   * Normalize player statistics to our standard format
   * API returns table format: headers: ["ROWHEADER", "Test", "ODI", "T20", "IPL"]
   *                            values: [{ values: ["Matches", "123", "305", "125", "267"] }, ...]
   * @param {Object} playerInfo - Player information
   * @param {Object} battingData - Batting statistics table
   * @param {Object} bowlingData - Bowling statistics table
   * @param {string} format - Match format (T20, ODI, Test) to extract specific stats
   */
  normalizePlayerStats(playerInfo, battingData, bowlingData, format = 'ODI') {
    if (!battingData || !bowlingData) return null;

    try {
      // Parse batting stats (table format) - extract format-specific column
      const batting = this.parseStatsTable(battingData, format);
      
      // Parse bowling stats (table format) - extract format-specific column
      const bowling = this.parseStatsTable(bowlingData, format);
      
      // Return format-specific stats (not combined)
      // If format was extracted, batting/bowling will have single values
      // Otherwise they have arrays, so we sum them
      const isFormatSpecific = typeof batting['Matches'] === 'string';
      
      return {
        batting: isFormatSpecific ? {
          matches: this.parseStat(batting, 'Matches'),
          innings: this.parseStat(batting, 'Innings'),
          notOuts: this.parseStat(batting, 'Not Out'),
          runs: this.parseStat(batting, 'Runs'),
          highestScore: this.parseStat(batting, 'Highest'),
          average: this.parseStat(batting, 'Average'),
          ballsFaced: this.parseStat(batting, 'Balls'),
          strikeRate: this.parseStat(batting, 'SR'),
          centuries: this.parseStat(batting, '100s'),
          halfCenturies: this.parseStat(batting, '50s'),
          ducks: this.parseStat(batting, 'Ducks'),
          fours: this.parseStat(batting, '4s'),
          sixes: this.parseStat(batting, '6s')
        } : {
          matches: this.sumFormats(batting, 'Matches'),
          innings: this.sumFormats(batting, 'Innings'),
          notOuts: this.sumFormats(batting, 'Not Out'),
          runs: this.sumFormats(batting, 'Runs'),
          highestScore: this.getMaxValue(batting, 'Highest'),
          average: this.calculateAverage(batting, 'Average'),
          ballsFaced: this.sumFormats(batting, 'Balls'),
          strikeRate: this.calculateAverage(batting, 'SR'),
          centuries: this.sumFormats(batting, '100s'),
          halfCenturies: this.sumFormats(batting, '50s'),
          ducks: this.sumFormats(batting, 'Ducks'),
          fours: this.sumFormats(batting, '4s'),
          sixes: this.sumFormats(batting, '6s')
        },
        bowling: isFormatSpecific ? {
          matches: this.parseStat(bowling, 'Matches'),
          innings: this.parseStat(bowling, 'Innings'),
          balls: this.parseStat(bowling, 'Balls'),
          runs: this.parseStat(bowling, 'Runs'),
          wickets: this.parseStat(bowling, 'Wickets'),
          average: this.parseStat(bowling, 'Avg'),
          economy: this.parseStat(bowling, 'Eco'),
          strikeRate: this.parseStat(bowling, 'SR'),
          fiveWickets: this.parseStat(bowling, '5W'),
          tenWickets: this.parseStat(bowling, '10W')
        } : {
          matches: this.sumFormats(bowling, 'Matches'),
          innings: this.sumFormats(bowling, 'Innings'),
          balls: this.sumFormats(bowling, 'Balls'),
          runs: this.sumFormats(bowling, 'Runs'),
          wickets: this.sumFormats(bowling, 'Wickets'),
          average: this.calculateAverage(bowling, 'Avg'),
          economy: this.calculateAverage(bowling, 'Eco'),
          strikeRate: this.calculateAverage(bowling, 'SR'),
          fiveWickets: this.sumFormats(bowling, '5W'),
          tenWickets: this.sumFormats(bowling, '10W') || 0
        },
        format: format, // Store which format these stats are for
        fielding: {
          catches: 0, // Not in API response
          stumpings: 0, // Not in API response
          runOuts: 0 // Not in API response
        }
      };

    } catch (error) {
      console.error(`[${this.name}] Error normalizing player stats:`, error.message);
      return null;
    }
  }

  /**
   * Parse stats table format into object
   * Returns: { "Matches": ["123", "305", "125", "267"], "Runs": [...], ... } or single value if format specified
   * @param {Object} data - Stats table with headers and values
   * @param {string} format - Match format to extract (T20, ODI, Test)
   */
  parseStatsTable(data, format = null) {
    if (!data || !data.headers || !data.values) return {};
    
    const result = {};
    
    // If format specified, find the column index for that format
    let formatIndex = -1;
    if (format) {
      const normalizedFormat = format.toUpperCase();
      // Headers: ["ROWHEADER", "Test", "ODI", "T20", "IPL"]
      formatIndex = data.headers.findIndex(h => 
        h && h.toUpperCase() === normalizedFormat || 
        (normalizedFormat === 'T20' && (h === 'T20' || h === 'T20I'))
      );
      
      if (formatIndex > 0) {
        console.log(`[${this.name}] 📊 Extracting ${format} stats from column ${formatIndex}`);
      }
    }
    
    data.values.forEach(row => {
      if (row.values && row.values.length > 0) {
        const statName = row.values[0]; // First column is the row header
        
        if (formatIndex > 0) {
          // Extract only the specific format column
          result[statName] = row.values[formatIndex] || '0';
        } else {
          // No format specified or not found - return all formats
          const statValues = row.values.slice(1); // Rest are format-wise values
          result[statName] = statValues;
        }
      }
    });
    
    return result;
  }

  /**
   * Parse single stat value (for format-specific stats)
   */
  parseStat(stats, statName) {
    if (!stats[statName]) return 0;
    
    // Handle string value (format-specific)
    if (typeof stats[statName] === 'string') {
      return parseFloat(stats[statName]) || 0;
    }
    
    // Handle array (shouldn't happen with format-specific, but fallback)
    if (Array.isArray(stats[statName])) {
      return parseFloat(stats[statName][0]) || 0;
    }
    
    return 0;
  }

  /**
   * Sum values across all formats
   */
  sumFormats(stats, statName) {
    if (!stats[statName]) return 0;
    
    return stats[statName].reduce((sum, val) => {
      const num = parseFloat(val) || 0;
      return sum + num;
    }, 0);
  }

  /**
   * Get maximum value across all formats
   */
  getMaxValue(stats, statName) {
    if (!stats[statName]) return '0';
    
    const values = stats[statName].map(v => parseFloat(v.replace('*', '')) || 0);
    return Math.max(...values).toString();
  }

  /**
   * Calculate weighted average across all formats
   */
  calculateAverage(stats, statName) {
    if (!stats[statName]) return 0;
    
    const values = stats[statName].filter(v => v && v !== '-').map(v => parseFloat(v) || 0);
    if (values.length === 0) return 0;
    
    const sum = values.reduce((a, b) => a + b, 0);
    return parseFloat((sum / values.length).toFixed(2));
  }

  /**
   * Series endpoints (backup for CricketData.org)
   */
  async fetchSeries() {
    console.log(`[${this.name}] fetchSeries not implemented (use CricketData.org)`);
    return [];
  }

  async fetchSeriesById(seriesId) {
    console.log(`[${this.name}] fetchSeriesById not implemented`);
    throw new Error('Not implemented');
  }

  async fetchMatchesBySeries(seriesId) {
    console.log(`[${this.name}] fetchMatchesBySeries not implemented`);
    return [];
  }

  async fetchMatchDetails(matchId) {
    console.log(`[${this.name}] fetchMatchDetails not implemented`);
    throw new Error('Not implemented');
  }

  async fetchLiveScore(matchId) {
    console.log(`[${this.name}] fetchLiveScore not implemented`);
    throw new Error('Not implemented');
  }

  async fetchSquad(seriesId, teamName) {
    console.log(`[${this.name}] fetchSquad not implemented`);
    return [];
  }

  async fetchAllSquads(seriesId) {
    console.log(`[${this.name}] fetchAllSquads not implemented`);
    return [];
  }
}

module.exports = RapidAPICricbuzzProvider;

