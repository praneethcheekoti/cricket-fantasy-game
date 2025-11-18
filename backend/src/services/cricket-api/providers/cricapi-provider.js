const BaseCricketProvider = require('./base-provider');

/**
 * CricAPI Provider Implementation
 * Primary API source with 100 requests/day free tier
 * API Documentation: https://cricapi.com/
 */
class CricAPIProvider extends BaseCricketProvider {
  constructor(apiKey) {
    super('CricAPI', {
      baseUrl: 'https://api.cricapi.com/v1',
      apiKey: apiKey,
      dailyLimit: 100,
      isEnabled: !!apiKey
    });
  }

  /**
   * Fetch all series
   */
  async fetchSeries() {
    try {
      const data = await this.makeRequest('/series', {
        offset: 0
      });
      
      if (!data || !data.data) {
        return [];
      }
      
      return data.data.map(series => this.normalizeSeries(series));
    } catch (error) {
      console.error(`[${this.name}] Failed to fetch series:`, error.message);
      return [];
    }
  }

  /**
   * Fetch series by ID
   */
  async fetchSeriesById(seriesId) {
    try {
      const data = await this.makeRequest('/series_info', {
        id: seriesId
      });
      
      if (!data || !data.data) {
        throw new Error('Series not found');
      }
      
      return this.normalizeSeries(data.data);
    } catch (error) {
      console.error(`[${this.name}] Failed to fetch series ${seriesId}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch matches by series
   */
  async fetchMatchesBySeries(seriesId) {
    try {
      const data = await this.makeRequest('/series_info', {
        id: seriesId
      });
      
      if (!data || !data.data || !data.data.matchList) {
        return [];
      }
      
      return data.data.matchList.map(match => this.normalizeMatch(match));
    } catch (error) {
      console.error(`[${this.name}] Failed to fetch matches for series ${seriesId}:`, error.message);
      return [];
    }
  }

  /**
   * Fetch match details
   */
  async fetchMatchDetails(matchId) {
    try {
      const data = await this.makeRequest('/match_info', {
        id: matchId
      });
      
      if (!data || !data.data) {
        throw new Error('Match not found');
      }
      
      return this.normalizeMatch(data.data);
    } catch (error) {
      console.error(`[${this.name}] Failed to fetch match ${matchId}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch live score
   */
  async fetchLiveScore(matchId) {
    try {
      const data = await this.makeRequest('/match_scorecard', {
        id: matchId
      });
      
      if (!data || !data.data) {
        throw new Error('Scorecard not found');
      }
      
      return this.normalizeScorecard(data.data);
    } catch (error) {
      console.error(`[${this.name}] Failed to fetch live score for match ${matchId}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch squad
   */
  async fetchSquad(seriesId, teamName) {
    try {
      // CricAPI doesn't have a direct squad endpoint
      // We'll fetch from series info and filter by team
      const seriesData = await this.fetchSeriesById(seriesId);
      
      // For now, return mock squad structure
      // In production, this would come from match squads
      return this.generateMockSquad(teamName);
    } catch (error) {
      console.error(`[${this.name}] Failed to fetch squad:`, error.message);
      return this.generateMockSquad(teamName);
    }
  }

  /**
   * Fetch player stats
   */
  async fetchPlayerStats(playerId) {
    try {
      const data = await this.makeRequest('/players_info', {
        id: playerId
      });
      
      if (!data || !data.data) {
        throw new Error('Player not found');
      }
      
      return this.normalizePlayer(data.data);
    } catch (error) {
      console.error(`[${this.name}] Failed to fetch player ${playerId}:`, error.message);
      throw error;
    }
  }

  // ========================================
  // NORMALIZATION METHODS
  // ========================================

  /**
   * Normalize series to standard format
   */
  normalizeSeries(rawData) {
    return {
      apiSeriesId: rawData.id || rawData.seriesId,
      name: rawData.name,
      shortName: rawData.shortName || rawData.name,
      format: this.extractFormat(rawData.name),
      gender: this.extractGender(rawData.name),
      teams: this.extractTeams(rawData),
      startDate: rawData.startDate ? new Date(rawData.startDate * 1000) : new Date(),
      endDate: rawData.endDate ? new Date(rawData.endDate * 1000) : new Date(),
      status: this.mapStatus(rawData.status),
      metadata: {
        raw: rawData
      }
    };
  }

  /**
   * Normalize match to standard format
   */
  normalizeMatch(rawData) {
    return {
      apiMatchId: rawData.id || rawData.matchId,
      apiSeriesId: rawData.seriesId,
      team1: rawData.teams?.[0] || rawData.team1,
      team2: rawData.teams?.[1] || rawData.team2,
      team1Code: rawData.teamInfo?.[0]?.shortname,
      team2Code: rawData.teamInfo?.[1]?.shortname,
      venue: rawData.venue || 'TBA',
      city: rawData.venue?.split(',')[0] || null,
      matchDate: rawData.dateTimeGMT ? new Date(rawData.dateTimeGMT) : new Date(),
      format: rawData.matchType || this.extractFormat(rawData.name || ''),
      matchType: rawData.matchType || 'bilateral',
      status: this.mapMatchStatus(rawData.status || rawData.matchStatus),
      tossWinner: rawData.tossWinner,
      tossDecision: rawData.tossChoice,
      result: rawData.status,
      metadata: {
        raw: rawData
      }
    };
  }

  /**
   * Normalize player to standard format
   */
  normalizePlayer(rawData) {
    return {
      apiPlayerId: rawData.id || rawData.playerId,
      name: rawData.name,
      fullName: rawData.fullName || rawData.name,
      role: this.mapRole(rawData.role),
      battingStyle: rawData.battingStyle,
      bowlingStyle: rawData.bowlingStyle,
      team: rawData.country || rawData.team,
      country: rawData.country,
      imageUrl: rawData.playerImg,
      overallStats: {
        batting: rawData.stats?.batting || {},
        bowling: rawData.stats?.bowling || {},
        fielding: rawData.stats?.fielding || {}
      }
    };
  }

  /**
   * Normalize scorecard to standard format
   */
  normalizeScorecard(rawData) {
    return {
      matchId: rawData.id,
      currentInning: rawData.currentInning || 1,
      team1Score: rawData.score?.[0] || null,
      team2Score: rawData.score?.[1] || null,
      innings: rawData.scorecard || [],
      playerStats: this.extractPlayerStats(rawData),
      lastUpdated: new Date()
    };
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  extractFormat(name) {
    if (!name) return 'ODI';
    const lower = name.toLowerCase();
    if (lower.includes('test')) return 'Test';
    if (lower.includes('t20') || lower.includes('t-20')) return 'T20';
    if (lower.includes('odi')) return 'ODI';
    return 'ODI';
  }

  extractGender(name) {
    if (!name) return 'Men';
    const lower = name.toLowerCase();
    if (lower.includes('women') || lower.includes('womens') || lower.includes("women's")) {
      return 'Women';
    }
    return 'Men';
  }

  extractTeams(rawData) {
    if (rawData.teams && Array.isArray(rawData.teams)) {
      return rawData.teams;
    }
    if (rawData.name) {
      const parts = rawData.name.split(' vs ');
      if (parts.length === 2) {
        return [parts[0].trim(), parts[1].split(' ')[0].trim()];
      }
    }
    return [];
  }

  mapStatus(status) {
    if (!status) return 'upcoming';
    const lower = status.toLowerCase();
    if (lower.includes('live') || lower.includes('ongoing')) return 'live';
    if (lower.includes('complete') || lower.includes('finished')) return 'completed';
    return 'upcoming';
  }

  mapMatchStatus(status) {
    if (!status) return 'upcoming';
    const lower = status.toLowerCase();
    if (lower.includes('live') || lower.includes('in progress')) return 'live';
    if (lower.includes('complete') || lower.includes('finished') || lower.includes('result')) {
      return 'completed';
    }
    return 'upcoming';
  }

  mapRole(role) {
    if (!role) return 'Batsman';
    const lower = role.toLowerCase();
    if (lower.includes('bowl')) return 'Bowler';
    if (lower.includes('all')) return 'All-Rounder';
    if (lower.includes('wk') || lower.includes('keeper')) return 'Wicket-Keeper';
    if (lower.includes('bat')) return 'Batsman';
    return 'Batsman';
  }

  extractPlayerStats(scorecard) {
    const players = [];
    
    if (scorecard.scorecard && Array.isArray(scorecard.scorecard)) {
      for (const innings of scorecard.scorecard) {
        if (innings.batting) {
          for (const batsman of innings.batting) {
            players.push({
              playerId: batsman.id,
              name: batsman.name,
              runs: batsman.r || 0,
              ballsFaced: batsman.b || 0,
              fours: batsman['4s'] || 0,
              sixes: batsman['6s'] || 0
            });
          }
        }
        
        if (innings.bowling) {
          for (const bowler of innings.bowling) {
            const existingPlayer = players.find(p => p.playerId === bowler.id);
            if (existingPlayer) {
              existingPlayer.wickets = bowler.w || 0;
              existingPlayer.ballsBowled = bowler.o * 6 || 0;
              existingPlayer.runsConceded = bowler.r || 0;
              existingPlayer.maidens = bowler.m || 0;
            } else {
              players.push({
                playerId: bowler.id,
                name: bowler.name,
                wickets: bowler.w || 0,
                ballsBowled: bowler.o * 6 || 0,
                runsConceded: bowler.r || 0,
                maidens: bowler.m || 0
              });
            }
          }
        }
      }
    }
    
    return players;
  }

  /**
   * Generate mock squad (temporary until we have squad endpoint)
   */
  generateMockSquad(teamName) {
    const mockSquads = {
      India: [
        { id: 'ind_kohli', name: 'Virat Kohli', role: 'Batsman', team: 'India' },
        { id: 'ind_rohit', name: 'Rohit Sharma', role: 'Batsman', team: 'India' },
        { id: 'ind_bumrah', name: 'Jasprit Bumrah', role: 'Bowler', team: 'India' },
        { id: 'ind_jadeja', name: 'Ravindra Jadeja', role: 'All-Rounder', team: 'India' },
        { id: 'ind_pant', name: 'Rishabh Pant', role: 'Wicket-Keeper', team: 'India' }
      ],
      Australia: [
        { id: 'aus_smith', name: 'Steve Smith', role: 'Batsman', team: 'Australia' },
        { id: 'aus_warner', name: 'David Warner', role: 'Batsman', team: 'Australia' },
        { id: 'aus_cummins', name: 'Pat Cummins', role: 'Bowler', team: 'Australia' },
        { id: 'aus_maxwell', name: 'Glenn Maxwell', role: 'All-Rounder', team: 'Australia' },
        { id: 'aus_carey', name: 'Alex Carey', role: 'Wicket-Keeper', team: 'Australia' }
      ],
      England: [
        { id: 'eng_root', name: 'Joe Root', role: 'Batsman', team: 'England' },
        { id: 'eng_stokes', name: 'Ben Stokes', role: 'All-Rounder', team: 'England' },
        { id: 'eng_archer', name: 'Jofra Archer', role: 'Bowler', team: 'England' },
        { id: 'eng_buttler', name: 'Jos Buttler', role: 'Wicket-Keeper', team: 'England' },
        { id: 'eng_bairstow', name: 'Jonny Bairstow', role: 'Batsman', team: 'England' }
      ]
    };

    return mockSquads[teamName] || [];
  }
}

module.exports = CricAPIProvider;

