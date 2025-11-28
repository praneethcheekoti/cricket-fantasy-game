const BaseCricketProvider = require('./base-provider');

/**
 * Unofficial Cricbuzz Provider (via RapidAPI)
 * 
 * Used for: Series, Squads, Players
 * NOT used for: Player stats (RapidAPI Cricbuzz handles that)
 * 
 * Free tier: 500 requests/month via RapidAPI
 * API Documentation: https://rapidapi.com/cricketapilive/api/unofficial-cricbuzz
 */
class UnofficialCricbuzzProvider extends BaseCricketProvider {
  constructor(apiKey) {
    super('UnofficialCricbuzz', {
      baseUrl: 'https://unofficial-cricbuzz.p.rapidapi.com',
      apiKey: apiKey,
      dailyLimit: 500, // Monthly, but treating as generous daily
      isEnabled: !!apiKey
    });
    
    this.headers = {
      'x-rapidapi-host': 'unofficial-cricbuzz.p.rapidapi.com',
      'x-rapidapi-key': apiKey
    };
  }

  /**
   * Make HTTP request to Unofficial Cricbuzz API
   */
  async makeRequest(endpoint, params = {}) {
    const url = new URL(endpoint, this.config.baseUrl);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    console.log(`[${this.name}] 📡 ${url.pathname}${url.search}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Fetch all international series
   * Returns raw series list (will be split by format later)
   */
  async fetchSeries() {
    try {
      const data = await this.makeRequest('/series/list', {
        matchType: 'international'
      });

      if (!data || !data.seriesMap) {
        return [];
      }

      // Flatten series from monthly groups
      const allSeries = [];
      data.seriesMap.forEach(monthGroup => {
        if (monthGroup.series && Array.isArray(monthGroup.series)) {
          monthGroup.series.forEach(series => {
            allSeries.push(series);
          });
        }
      });

      console.log(`[${this.name}] ✅ Fetched ${allSeries.length} raw series`);
      
      // Return raw series (will be split later based on squads)
      return allSeries.map(series => this.normalizeSeries(series));
    } catch (error) {
      console.error(`[${this.name}] ❌ Failed to fetch series:`, error.message);
      return [];
    }
  }

  /**
   * Fetch series by ID
   * Note: Returns raw series, not split by format
   */
  async fetchSeriesById(seriesId) {
    try {
      // Unofficial Cricbuzz doesn't have a direct series detail endpoint
      // We'll fetch the full list and filter
      const allSeries = await this.fetchSeries();
      const series = allSeries.find(s => s.apiSeriesId === seriesId.toString());
      
      if (!series) {
        throw new Error('Series not found');
      }
      
      return series;
    } catch (error) {
      console.error(`[${this.name}] ❌ Failed to fetch series ${seriesId}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch squads for a series
   * Returns squads grouped by format (Test/ODI/T20)
   */
  async fetchSquadsBySeries(seriesId) {
    try {
      console.log(`[${this.name}] 📋 Fetching squads for series ${seriesId}...`);
      
      const data = await this.makeRequest('/series/get-squads', {
        seriesId: seriesId
      });

      if (!data || !data.squadAnnouncedList) {
        console.log(`[${this.name}] ⚠️  No squads found for series ${seriesId}`);
        return {
          Test: [],
          ODI: [],
          T20: []
        };
      }

      // Parse squad structure
      const squadsByFormat = {
        Test: [],
        ODI: [],
        T20: []
      };

      let currentFormat = null;

      data.squadAnnouncedList.forEach(item => {
        if (item.isHeader) {
          // This is a format header
          currentFormat = item.squadType; // "Test", "ODI", "T20"
        } else if (item.squadId && currentFormat) {
          // This is a team squad
          squadsByFormat[currentFormat].push({
            squadId: item.squadId,
            teamName: item.squadType, // "India Test Squad", "South Africa ODI squad", etc.
            format: currentFormat
          });
        }
      });

      console.log(`[${this.name}] ✅ Squads: Test=${squadsByFormat.Test.length}, ODI=${squadsByFormat.ODI.length}, T20=${squadsByFormat.T20.length}`);
      
      return squadsByFormat;
    } catch (error) {
      console.error(`[${this.name}] ❌ Failed to fetch squads for series ${seriesId}:`, error.message);
      return {
        Test: [],
        ODI: [],
        T20: []
      };
    }
  }

  /**
   * Fetch players for a specific squad
   */
  async fetchPlayersBySquad(seriesId, squadId) {
    try {
      console.log(`[${this.name}] 👥 Fetching players for squad ${squadId} in series ${seriesId}...`);
      
      const data = await this.makeRequest('/series/get-players', {
        seriesId: seriesId,
        squadId: squadId
      });

      if (!data || !data.player) {
        console.log(`[${this.name}] ⚠️  No players found for squad ${squadId}`);
        return [];
      }

      // Filter out header rows and normalize players
      const players = data.player
        .filter(p => !p.isHeader && p.id) // Skip headers like "BATTERS", "BOWLERS"
        .map(p => this.normalizePlayer(p));

      console.log(`[${this.name}] ✅ Fetched ${players.length} players`);
      
      return players;
    } catch (error) {
      console.error(`[${this.name}] ❌ Failed to fetch players for squad ${squadId}:`, error.message);
      return [];
    }
  }

  /**
   * Fetch squad by series and team (compatibility method)
   * This is called by the main service - we need to handle the format parameter
   */
  async fetchSquadBySeriesAndTeam(seriesId, teamName, format = 'ODI') {
    try {
      console.log(`[${this.name}] 🔍 Fetching squad for ${teamName} in series ${seriesId} (${format})...`);
      
      // Get all squads for this series
      const squadsByFormat = await this.fetchSquadsBySeries(seriesId);
      
      // Get squads for the requested format
      const formatSquads = squadsByFormat[format] || [];
      
      // Find the squad for this team
      // Team name might be "India Test Squad" but we're searching for "India"
      const squad = formatSquads.find(s => 
        s.teamName.toLowerCase().includes(teamName.toLowerCase()) ||
        teamName.toLowerCase().includes(s.teamName.toLowerCase())
      );

      if (!squad) {
        console.log(`[${this.name}] ⚠️  No ${format} squad found for ${teamName}`);
        return [];
      }

      // Fetch players for this squad
      const players = await this.fetchPlayersBySquad(seriesId, squad.squadId);
      
      return players;
    } catch (error) {
      console.error(`[${this.name}] ❌ Failed to fetch squad:`, error.message);
      return [];
    }
  }

  /**
   * Normalize series data to standard format
   */
  normalizeSeries(rawData) {
    // Extract basic info
    const name = rawData.name || 'Unknown Series';
    const startDate = rawData.startDt ? new Date(parseInt(rawData.startDt)) : new Date();
    const endDate = rawData.endDt ? new Date(parseInt(rawData.endDt)) : new Date();
    
    // Extract teams from name (e.g., "India tour of England")
    const teams = this.extractTeamsFromName(name);
    
    return {
      apiSeriesId: rawData.id?.toString() || rawData.seriesId?.toString(),
      name: name,
      shortName: this.createShortName(name),
      format: 'Unknown', // Will be determined when squads are fetched
      gender: this.extractGender(name),
      teams: teams,
      startDate: startDate,
      endDate: endDate,
      status: 'upcoming',
      metadata: {
        // Cricbuzz doesn't provide match counts upfront
        // We'll populate these when squads are fetched
        odi: 0,
        t20: 0,
        test: 0,
        squads: 0,
        matches: 0,
        teamCount: teams.length,
        rawSeriesId: rawData.id?.toString() // Store original ID for squad fetching
      }
    };
  }

  /**
   * Normalize player data to standard format
   */
  normalizePlayer(rawData) {
    return {
      apiPlayerId: rawData.id?.toString(),
      name: rawData.name,
      role: this.normalizeRole(rawData.role),
      team: this.extractTeamFromSquadName(rawData.teamName || ''), // Will be set by caller
      battingStyle: rawData.battingStyle || 'Unknown',
      bowlingStyle: rawData.bowlingStyle || 'Unknown',
      country: this.extractTeamFromSquadName(rawData.teamName || ''), // Will be set by caller
      imageUrl: rawData.imageId ? `https://cricbuzz-cricket.p.rapidapi.com/img/v1/i1/c${rawData.imageId}/i.jpg` : null,
      isCaptain: rawData.captain || false
    };
  }

  /**
   * Normalize role names to match our standard
   */
  normalizeRole(role) {
    if (!role) return 'Batsman';
    
    const lower = role.toLowerCase();
    
    if (lower.includes('wk') || lower.includes('wicket')) {
      return 'Wicket-Keeper';
    }
    if (lower.includes('allrounder') || lower.includes('all-rounder') || lower.includes('all rounder')) {
      return 'All-Rounder';
    }
    if (lower.includes('bowl')) {
      return 'Bowler';
    }
    if (lower.includes('bat')) {
      return 'Batsman';
    }
    
    return 'Batsman'; // Default
  }

  /**
   * Extract team name from squad name
   * "India Test Squad" → "India"
   * "South Africa ODI squad" → "South Africa"
   */
  extractTeamFromSquadName(squadName) {
    if (!squadName) return 'Unknown';
    
    // Remove format suffixes
    return squadName
      .replace(/\s*(Test|ODI|T20I?)\s*squad/gi, '')
      .replace(/\s*squad/gi, '')
      .trim();
  }

  /**
   * Extract teams from series name
   * "India tour of England, 2025" → ["India", "England"]
   */
  extractTeamsFromName(name) {
    if (!name) return [];
    
    const teams = [];
    
    // Pattern: "TeamA tour of TeamB" or "TeamA vs TeamB"
    const tourMatch = name.match(/^([^,]+?)\s+tour\s+of\s+([^,]+)/i);
    if (tourMatch) {
      teams.push(tourMatch[1].trim(), tourMatch[2].trim());
      return teams;
    }
    
    const vsMatch = name.match(/^([^,]+?)\s+vs?\s+([^,]+)/i);
    if (vsMatch) {
      teams.push(vsMatch[1].trim(), vsMatch[2].trim());
      return teams;
    }
    
    // Fallback: try to extract country names
    const countries = ['India', 'England', 'Australia', 'Pakistan', 'South Africa', 'New Zealand', 
                      'West Indies', 'Sri Lanka', 'Bangladesh', 'Afghanistan', 'Zimbabwe', 'Ireland'];
    
    countries.forEach(country => {
      if (name.includes(country)) {
        if (!teams.includes(country)) {
          teams.push(country);
        }
      }
    });
    
    return teams.slice(0, 2); // Max 2 teams
  }

  extractGender(name) {
    if (!name) return 'Men';
    const lower = name.toLowerCase();
    if (lower.includes('women') || lower.includes('womens') || lower.includes("women's")) {
      return 'Women';
    }
    return 'Men';
  }

  createShortName(name) {
    if (!name) return '';
    
    // Remove year
    let short = name.replace(/,?\s*\d{4}(-\d{2,4})?/g, '');
    
    // Shorten team names
    short = short.replace(/\btour of\b/gi, 'vs');
    
    // Limit length
    if (short.length > 50) {
      short = short.substring(0, 47) + '...';
    }
    
    return short;
  }

  // Placeholder methods (not used for this provider)
  async fetchMatches() { return []; }
  async fetchMatchesBySeries() { return []; }
  async fetchMatchDetails() { throw new Error('Not implemented'); }
  async fetchLiveScore() { throw new Error('Not implemented'); }
  async getPlayerStats() { throw new Error('Use RapidAPI Cricbuzz for stats'); }
}

module.exports = UnofficialCricbuzzProvider;

