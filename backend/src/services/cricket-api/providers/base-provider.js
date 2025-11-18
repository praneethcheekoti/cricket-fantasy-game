const axios = require('axios');

/**
 * Base Cricket API Provider Interface
 * All cricket API providers must extend this class and implement required methods
 */
class BaseCricketProvider {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.dailyLimit = config.dailyLimit || 100;
    this.isEnabled = config.isEnabled !== false;
  }

  /**
   * Make HTTP request with error handling and retry logic
   */
  async makeRequest(endpoint, params = {}, method = 'GET', retries = 3) {
    const url = this.baseUrl + endpoint;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const config = {
          method,
          url,
          params: {
            ...params,
            ...(this.apiKey && { apikey: this.apiKey })
          },
          headers: this.config.headers || {},
          timeout: 10000 // 10 seconds
        };

        console.log(`[${this.name}] Request: ${method} ${url}`);
        
        const response = await axios(config);
        
        console.log(`[${this.name}] ✅ Success (attempt ${attempt})`);
        return response.data;
        
      } catch (error) {
        console.error(`[${this.name}] ❌ Error (attempt ${attempt}/${retries}):`, error.message);
        
        if (attempt === retries) {
          throw this.handleError(error);
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await this.sleep(delay);
      }
    }
  }

  /**
   * Handle API errors
   */
  handleError(error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;
      
      if (status === 429) {
        return new Error(`[${this.name}] Rate limit exceeded`);
      } else if (status === 401 || status === 403) {
        return new Error(`[${this.name}] Authentication failed`);
      } else if (status >= 500) {
        return new Error(`[${this.name}] Server error: ${message}`);
      }
      
      return new Error(`[${this.name}] API error (${status}): ${message}`);
    }
    
    if (error.code === 'ECONNABORTED') {
      return new Error(`[${this.name}] Request timeout`);
    }
    
    return new Error(`[${this.name}] Network error: ${error.message}`);
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========================================
  // METHODS THAT MUST BE IMPLEMENTED
  // ========================================

  /**
   * Fetch all available series
   * @returns {Promise<Array>} Array of series
   */
  async fetchSeries() {
    throw new Error(`${this.name}: fetchSeries() must be implemented`);
  }

  /**
   * Fetch series details by ID
   * @param {string} seriesId - Series ID from API
   * @returns {Promise<Object>} Series details
   */
  async fetchSeriesById(seriesId) {
    throw new Error(`${this.name}: fetchSeriesById() must be implemented`);
  }

  /**
   * Fetch matches for a series
   * @param {string} seriesId - Series ID from API
   * @returns {Promise<Array>} Array of matches
   */
  async fetchMatchesBySeries(seriesId) {
    throw new Error(`${this.name}: fetchMatchesBySeries() must be implemented`);
  }

  /**
   * Fetch match details
   * @param {string} matchId - Match ID from API
   * @returns {Promise<Object>} Match details
   */
  async fetchMatchDetails(matchId) {
    throw new Error(`${this.name}: fetchMatchDetails() must be implemented`);
  }

  /**
   * Fetch live score for a match
   * @param {string} matchId - Match ID from API
   * @returns {Promise<Object>} Live scorecard
   */
  async fetchLiveScore(matchId) {
    throw new Error(`${this.name}: fetchLiveScore() must be implemented`);
  }

  /**
   * Fetch squad for a series/team
   * @param {string} seriesId - Series ID from API
   * @param {string} teamName - Team name
   * @returns {Promise<Array>} Array of players
   */
  async fetchSquad(seriesId, teamName) {
    throw new Error(`${this.name}: fetchSquad() must be implemented`);
  }

  /**
   * Fetch player statistics
   * @param {string} playerId - Player ID from API
   * @returns {Promise<Object>} Player stats
   */
  async fetchPlayerStats(playerId) {
    throw new Error(`${this.name}: fetchPlayerStats() must be implemented`);
  }

  // ========================================
  // NORMALIZATION METHODS (MUST IMPLEMENT)
  // ========================================

  /**
   * Normalize series data to standard format
   * @param {Object} rawData - Raw data from API
   * @returns {Object} Normalized series object
   */
  normalizeSeries(rawData) {
    throw new Error(`${this.name}: normalizeSeries() must be implemented`);
  }

  /**
   * Normalize match data to standard format
   * @param {Object} rawData - Raw data from API
   * @returns {Object} Normalized match object
   */
  normalizeMatch(rawData) {
    throw new Error(`${this.name}: normalizeMatch() must be implemented`);
  }

  /**
   * Normalize player data to standard format
   * @param {Object} rawData - Raw data from API
   * @returns {Object} Normalized player object
   */
  normalizePlayer(rawData) {
    throw new Error(`${this.name}: normalizePlayer() must be implemented`);
  }

  /**
   * Normalize scorecard data to standard format
   * @param {Object} rawData - Raw data from API
   * @returns {Object} Normalized scorecard object
   */
  normalizeScorecard(rawData) {
    throw new Error(`${this.name}: normalizeScorecard() must be implemented`);
  }
}

module.exports = BaseCricketProvider;

