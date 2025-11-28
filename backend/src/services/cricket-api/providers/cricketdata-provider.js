const BaseCricketProvider = require('./base-provider');

/**
 * CricketData.org Provider Implementation
 * Free tier: 100 requests/day
 * API Documentation: https://cricketdata.org/
 */
class CricketDataProvider extends BaseCricketProvider {
  constructor(apiKey) {
    super('CricketData', {
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
      // Fetch first 50 series to include more options (The Ashes, etc.)
      const data = await this.makeRequest('/series', {
        offset: 0
      });
      
      if (!data || !data.data) {
        return [];
      }
      
      // Also fetch next batch if available
      let allSeries = [...data.data];
      
      // If there are more series, fetch next batch
      if (data.info && data.info.totalRows > data.data.length) {
        try {
          const data2 = await this.makeRequest('/series', {
            offset: 25
          });
          if (data2 && data2.data) {
            allSeries = allSeries.concat(data2.data);
          }
        } catch (error) {
          console.warn(`[${this.name}] Could not fetch additional series:`, error.message);
        }
      }
      
      console.log(`[${this.name}] Fetched ${allSeries.length} series total`);
      
      // Return ALL series (international + domestic leagues)
      return allSeries.map(series => this.normalizeSeries(series));
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
      
      return data.data.matchList.map(match => ({
        ...this.normalizeMatch(match),
        apiSeriesId: seriesId
      }));
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
   * Fetch all squads for a series (all teams)
   */
  async fetchAllSquads(seriesId) {
    try {
      console.log(`[${this.name}] Fetching all squads for series ${seriesId}`);
      
      const squadData = await this.makeRequest('/series_squad', {
        id: seriesId
      });
      
      if (!squadData || !squadData.data || !Array.isArray(squadData.data)) {
        console.warn(`[${this.name}] No squad data for series ${seriesId}`);
        return [];
      }

      console.log(`[${this.name}] ✅ Found ${squadData.data.length} teams with squads`);

      // Return all players from all teams
      const allPlayers = [];
      for (const team of squadData.data) {
        if (team.players && Array.isArray(team.players)) {
          const normalizedPlayers = team.players.map(player => ({
            id: player.id || `${team.shortname}_${player.name}`.toLowerCase().replace(/\s+/g, '_'),
            name: player.name,
            role: this.mapRole(player.role || 'Batsman'),
            team: team.teamName || team.name || team.shortname,
            battingStyle: player.battingStyle || null,
            bowlingStyle: player.bowlingStyle || null,
            country: player.country || team.teamName || team.name,
            imageUrl: player.playerImg || null,
            // Extract stats if available from API
            overallStats: player.stats || {}
          }));
          allPlayers.push(...normalizedPlayers);
        }
      }

      console.log(`[${this.name}] ✅ Total players across all teams: ${allPlayers.length}`);
      return allPlayers;

    } catch (error) {
      console.error(`[${this.name}] Failed to fetch all squads:`, error.message);
      return [];
    }
  }

  /**
   * Fetch squad using the series_squad endpoint
   */
  async fetchSquad(seriesId, teamName) {
    try {
      console.log(`[${this.name}] Fetching squad for ${teamName} in series ${seriesId}`);
      
      // Use the series_squad endpoint (discovered endpoint!)
      const squadData = await this.makeRequest('/series_squad', {
        id: seriesId
      });
      
      if (!squadData || !squadData.data) {
        console.warn(`[${this.name}] No squad data returned for series ${seriesId}`);
        return [];
      }

      // squadData.data is an array of teams with their squads
      if (!Array.isArray(squadData.data) || squadData.data.length === 0) {
        console.warn(`[${this.name}] Squad data is empty for series ${seriesId}`);
        return [];
      }

      // If teamName is provided, filter for that specific team
      let teamSquad;
      if (teamName) {
        teamSquad = squadData.data.find(team => 
          team.teamName === teamName || 
          team.shortname === teamName
        );
        
        if (!teamSquad) {
          console.warn(`[${this.name}] Team ${teamName} not found in squad data`);
          return [];
        }
      } else {
        // If no team specified, return first team (shouldn't happen in practice)
        teamSquad = squadData.data[0];
      }

      // Extract and normalize players
      if (!teamSquad.players || teamSquad.players.length === 0) {
        console.warn(`[${this.name}] No players found for team ${teamName}`);
        return [];
      }

      console.log(`[${this.name}] ✅ Found ${teamSquad.players.length} players for ${teamSquad.teamName}`);

      return teamSquad.players.map(player => ({
        id: player.id || `${teamSquad.shortname}_${player.name}`.toLowerCase().replace(/\s+/g, '_'),
        name: player.name,
        role: this.mapRole(player.role || 'Batsman'),
        team: teamSquad.teamName,
        battingStyle: player.battingStyle || null,
        bowlingStyle: player.bowlingStyle || null,
        country: player.country || teamSquad.teamName,
        imageUrl: player.playerImg || null
      }));

    } catch (error) {
      console.error(`[${this.name}] Failed to fetch squad for ${teamName}:`, error.message);
      return [];
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
    const teams = this.extractTeams(rawData);
    const format = this.extractFormatFromMetadata(rawData);
    
    return {
      apiSeriesId: rawData.id || rawData.seriesId,
      name: rawData.name,
      shortName: rawData.shortName || this.createShortName(rawData.name),
      format: format,
      gender: this.extractGender(rawData.name),
      teams: teams,
      startDate: rawData.startDate ? new Date(rawData.startDate) : new Date(),
      endDate: rawData.endDate ? new Date(rawData.endDate) : new Date(),
      status: this.mapStatus(rawData.status),
      metadata: {
        odi: rawData.odi || 0,
        t20: rawData.t20 || 0,
        test: rawData.test || 0,
        squads: rawData.squads || 0,
        matches: rawData.matches || 0,
        teamCount: teams.length
      }
    };
  }

  /**
   * Normalize match to standard format
   */
  normalizeMatch(rawData) {
    const team1 = rawData.teams?.[0] || rawData.teamInfo?.[0]?.name || 'TBA';
    const team2 = rawData.teams?.[1] || rawData.teamInfo?.[1]?.name || 'TBA';
    
    return {
      apiMatchId: rawData.id || rawData.matchId,
      apiSeriesId: rawData.seriesId,
      team1: team1,
      team2: team2,
      team1Code: rawData.teamInfo?.[0]?.shortname || this.getTeamCode(team1),
      team2Code: rawData.teamInfo?.[1]?.shortname || this.getTeamCode(team2),
      venue: rawData.venue || 'TBA',
      city: this.extractCity(rawData.venue),
      matchDate: rawData.dateTimeGMT ? new Date(rawData.dateTimeGMT) : new Date(),
      format: rawData.matchType || this.extractFormat(rawData.name || ''),
      matchType: 'bilateral',
      status: this.mapMatchStatus(rawData.status || rawData.matchStatus),
      tossWinner: rawData.tossWinner,
      tossDecision: rawData.tossChoice,
      result: rawData.status,
      score: this.extractScore(rawData),
      metadata: {
        matchEnded: rawData.matchEnded || false,
        matchStarted: rawData.matchStarted || false
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
      battingStyle: rawData.battingStyle || null,
      bowlingStyle: rawData.bowlingStyle || null,
      team: rawData.country || rawData.team,
      country: rawData.country,
      imageUrl: rawData.playerImg || null,
      overallStats: {
        batting: rawData.stats?.batting || {
          matches: 0,
          runs: 0,
          average: 0,
          strikeRate: 0
        },
        bowling: rawData.stats?.bowling || {
          matches: 0,
          wickets: 0,
          average: 0,
          economy: 0
        },
        fielding: rawData.stats?.fielding || {
          catches: 0,
          stumpings: 0
        }
      }
    };
  }

  /**
   * Normalize scorecard to standard format
   */
  normalizeScorecard(rawData) {
    return {
      matchId: rawData.id,
      status: this.mapMatchStatus(rawData.status),
      currentInning: rawData.currentInning || 1,
      team1Score: this.formatScore(rawData.score?.[0]),
      team2Score: this.formatScore(rawData.score?.[1]),
      innings: rawData.scorecard || [],
      playerStats: this.extractPlayerStats(rawData),
      lastUpdated: new Date()
    };
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  extractFormatFromMetadata(rawData) {
    // Use API metadata to determine format (most accurate)
    if (rawData.t20 > 0 && rawData.odi === 0 && rawData.test === 0) {
      return 'T20';
    }
    if (rawData.test > 0 && rawData.odi === 0 && rawData.t20 === 0) {
      return 'Test';
    }
    if (rawData.odi > 0 && rawData.test === 0 && rawData.t20 === 0) {
      return 'ODI';
    }
    
    // Mixed format - use name as fallback
    return this.extractFormat(rawData.name);
  }

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
      return rawData.teams.filter(t => t !== 'TBA' && t);
    }
    if (rawData.teamInfo && Array.isArray(rawData.teamInfo)) {
      return rawData.teamInfo.map(t => t.name).filter(n => n && n !== 'TBA');
    }
    if (rawData.name) {
      const parts = rawData.name.split(' vs ');
      if (parts.length === 2) {
        return [parts[0].trim(), parts[1].split(' ')[0].trim()];
      }
    }
    return [];
  }

  extractCity(venue) {
    if (!venue) return null;
    // Extract city from venue string (usually format: "Stadium, City, Country")
    const parts = venue.split(',');
    return parts.length > 1 ? parts[1].trim() : parts[0].trim();
  }

  extractScore(rawData) {
    if (!rawData.score || rawData.score.length === 0) {
      return null;
    }
    
    const team1Score = rawData.score[0];
    const team2Score = rawData.score[1];
    
    return {
      team1: this.formatScore(team1Score),
      team2: this.formatScore(team2Score)
    };
  }

  formatScore(scoreData) {
    if (!scoreData) return null;
    
    return {
      runs: scoreData.r || 0,
      wickets: scoreData.w || 0,
      overs: scoreData.o || 0,
      display: `${scoreData.r}/${scoreData.w} (${scoreData.o})`
    };
  }

  createShortName(fullName) {
    if (!fullName) return '';
    
    // Extract team names from "India vs Australia Test Series 2024"
    const vsMatch = fullName.match(/(.+?)\s+vs\s+(.+?)(?:\s+\w+\s+Series)?/i);
    if (vsMatch) {
      const team1 = this.getTeamCode(vsMatch[1].trim());
      const team2 = this.getTeamCode(vsMatch[2].trim());
      return `${team1} vs ${team2}`;
    }
    
    return fullName.substring(0, 30);
  }

  getTeamCode(teamName) {
    const codes = {
      'India': 'IND',
      'Australia': 'AUS',
      'England': 'ENG',
      'Pakistan': 'PAK',
      'South Africa': 'SA',
      'New Zealand': 'NZ',
      'West Indies': 'WI',
      'Sri Lanka': 'SL',
      'Bangladesh': 'BAN',
      'Afghanistan': 'AFG',
      'Ireland': 'IRE',
      'Zimbabwe': 'ZIM'
    };
    
    return codes[teamName] || teamName.substring(0, 3).toUpperCase();
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
    if (lower.includes('live') || lower.includes('in progress') || lower.includes('innings break')) {
      return 'live';
    }
    if (lower.includes('complete') || lower.includes('finished') || lower.includes('result') || lower.includes('won')) {
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
              sixes: batsman['6s'] || 0,
              strikeRate: batsman.sr || 0
            });
          }
        }
        
        if (innings.bowling) {
          for (const bowler of innings.bowling) {
            const existingPlayer = players.find(p => p.playerId === bowler.id);
            if (existingPlayer) {
              existingPlayer.wickets = bowler.w || 0;
              existingPlayer.overs = bowler.o || 0;
              existingPlayer.runsConceded = bowler.r || 0;
              existingPlayer.maidens = bowler.m || 0;
              existingPlayer.economy = bowler.eco || 0;
            } else {
              players.push({
                playerId: bowler.id,
                name: bowler.name,
                wickets: bowler.w || 0,
                overs: bowler.o || 0,
                runsConceded: bowler.r || 0,
                maidens: bowler.m || 0,
                economy: bowler.eco || 0
              });
            }
          }
        }
      }
    }
    
    return players;
  }
}

module.exports = CricketDataProvider;

