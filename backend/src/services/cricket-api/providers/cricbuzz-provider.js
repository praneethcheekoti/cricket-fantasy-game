const BaseCricketProvider = require('./base-provider');

/**
 * Cricbuzz Provider (Unofficial)
 * Uses public data endpoints, no API key required
 * Used as backup for live scores when primary APIs are exhausted
 * Note: This is for demonstration - in production, use official APIs
 */
class CricbuzzProvider extends BaseCricketProvider {
  constructor() {
    super('Cricbuzz', {
      baseUrl: 'https://unofficial-cricbuzz.p.rapidapi.com',
      apiKey: null, // No key for unofficial
      dailyLimit: 500, // Self-imposed rate limit
      isEnabled: true
    });
  }

  /**
   * Fetch all series
   * Returns empty for now - CricAPI should handle this
   */
  async fetchSeries() {
    console.log(`[${this.name}] fetchSeries not implemented (use primary API)`);
    return [];
  }

  /**
   * Fetch series by ID
   */
  async fetchSeriesById(seriesId) {
    console.log(`[${this.name}] fetchSeriesById not implemented`);
    throw new Error('Not implemented');
  }

  /**
   * Fetch matches by series
   */
  async fetchMatchesBySeries(seriesId) {
    console.log(`[${this.name}] Generating mock matches for series ${seriesId}`);
    
    // Generate mock matches for the test series
    if (seriesId === 'test_series_001') {
      return [
        {
          apiMatchId: 'match_ind_aus_001',
          apiSeriesId: seriesId,
          team1: 'India',
          team2: 'Australia',
          team1Code: 'IND',
          team2Code: 'AUS',
          venue: 'Narendra Modi Stadium, Ahmedabad',
          city: 'Ahmedabad',
          matchDate: new Date('2024-12-05T04:00:00Z'),
          format: 'Test',
          matchType: 'bilateral',
          status: 'upcoming',
          tossWinner: null,
          tossDecision: null,
          result: null,
          metadata: {
            source: 'cricbuzz_mock',
            matchNumber: 1
          }
        },
        {
          apiMatchId: 'match_ind_aus_002',
          apiSeriesId: seriesId,
          team1: 'India',
          team2: 'Australia',
          team1Code: 'IND',
          team2Code: 'AUS',
          venue: 'M. Chinnaswamy Stadium, Bengaluru',
          city: 'Bengaluru',
          matchDate: new Date('2024-12-13T04:00:00Z'),
          format: 'Test',
          matchType: 'bilateral',
          status: 'upcoming',
          tossWinner: null,
          tossDecision: null,
          result: null,
          metadata: {
            source: 'cricbuzz_mock',
            matchNumber: 2
          }
        },
        {
          apiMatchId: 'match_ind_aus_003',
          apiSeriesId: seriesId,
          team1: 'India',
          team2: 'Australia',
          team1Code: 'IND',
          team2Code: 'AUS',
          venue: 'Eden Gardens, Kolkata',
          city: 'Kolkata',
          matchDate: new Date('2024-12-21T04:00:00Z'),
          format: 'Test',
          matchType: 'bilateral',
          status: 'upcoming',
          tossWinner: null,
          tossDecision: null,
          result: null,
          metadata: {
            source: 'cricbuzz_mock',
            matchNumber: 3
          }
        }
      ];
    }
    
    return [];
  }

  /**
   * Fetch match details
   */
  async fetchMatchDetails(matchId) {
    console.log(`[${this.name}] Generating mock match details for ${matchId}`);
    
    // Mock match details for known matches
    const mockMatches = {
      'match_ind_aus_001': {
        apiMatchId: 'match_ind_aus_001',
        apiSeriesId: 'test_series_001',
        team1: 'India',
        team2: 'Australia',
        team1Code: 'IND',
        team2Code: 'AUS',
        venue: 'Narendra Modi Stadium, Ahmedabad',
        city: 'Ahmedabad',
        matchDate: new Date('2024-12-05T04:00:00Z'),
        format: 'Test',
        matchType: 'bilateral',
        status: 'upcoming',
        tossWinner: null,
        tossDecision: null,
        result: null,
        metadata: {
          source: 'cricbuzz_mock',
          matchNumber: 1,
          umpires: ['Umpire 1', 'Umpire 2'],
          referee: 'Match Referee'
        }
      },
      'match_ind_aus_002': {
        apiMatchId: 'match_ind_aus_002',
        apiSeriesId: 'test_series_001',
        team1: 'India',
        team2: 'Australia',
        team1Code: 'IND',
        team2Code: 'AUS',
        venue: 'M. Chinnaswamy Stadium, Bengaluru',
        city: 'Bengaluru',
        matchDate: new Date('2024-12-13T04:00:00Z'),
        format: 'Test',
        matchType: 'bilateral',
        status: 'upcoming',
        tossWinner: null,
        tossDecision: null,
        result: null,
        metadata: {
          source: 'cricbuzz_mock',
          matchNumber: 2,
          umpires: ['Umpire 3', 'Umpire 4'],
          referee: 'Match Referee'
        }
      },
      'match_ind_aus_003': {
        apiMatchId: 'match_ind_aus_003',
        apiSeriesId: 'test_series_001',
        team1: 'India',
        team2: 'Australia',
        team1Code: 'IND',
        team2Code: 'AUS',
        venue: 'Eden Gardens, Kolkata',
        city: 'Kolkata',
        matchDate: new Date('2024-12-21T04:00:00Z'),
        format: 'Test',
        matchType: 'bilateral',
        status: 'upcoming',
        tossWinner: null,
        tossDecision: null,
        result: null,
        metadata: {
          source: 'cricbuzz_mock',
          matchNumber: 3,
          umpires: ['Umpire 5', 'Umpire 6'],
          referee: 'Match Referee'
        }
      }
    };
    
    if (mockMatches[matchId]) {
      return mockMatches[matchId];
    }
    
    throw new Error(`Match ${matchId} not found`);
  }

  /**
   * Fetch live score (PRIMARY USE CASE for this provider)
   */
  async fetchLiveScore(matchId) {
    try {
      // For demo purposes, return mock live score structure
      // In production, this would scrape or use unofficial API
      console.log(`[${this.name}] Generating mock live score for ${matchId}`);
      
      return this.generateMockLiveScore(matchId);
    } catch (error) {
      console.error(`[${this.name}] Failed to fetch live score:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch squad
   */
  async fetchSquad(seriesId, teamName) {
    console.log(`[${this.name}] Generating mock squad for ${teamName} in series ${seriesId}`);
    
    // Mock squads for India vs Australia series
    const mockSquads = {
      India: [
        {
          apiPlayerId: 'ind_rohit_001',
          name: 'Rohit Sharma',
          fullName: 'Rohit Gurunath Sharma',
          role: 'Batsman',
          battingStyle: 'Right-hand bat',
          bowlingStyle: 'Right-arm offbreak',
          team: 'India',
          country: 'India',
          imageUrl: null,
          overallStats: {
            batting: { matches: 45, runs: 3500, average: 48.5, strikeRate: 55.2 },
            bowling: { wickets: 5, average: 35.0, economy: 3.5 },
            fielding: { catches: 45 }
          }
        },
        {
          apiPlayerId: 'ind_kohli_002',
          name: 'Virat Kohli',
          fullName: 'Virat Kohli',
          role: 'Batsman',
          battingStyle: 'Right-hand bat',
          bowlingStyle: 'Right-arm medium',
          team: 'India',
          country: 'India',
          imageUrl: null,
          overallStats: {
            batting: { matches: 111, runs: 8848, average: 49.4, strikeRate: 56.8 },
            bowling: { wickets: 0, average: 0, economy: 0 },
            fielding: { catches: 102 }
          }
        },
        {
          apiPlayerId: 'ind_bumrah_003',
          name: 'Jasprit Bumrah',
          fullName: 'Jasprit Jasbirsingh Bumrah',
          role: 'Bowler',
          battingStyle: 'Right-hand bat',
          bowlingStyle: 'Right-arm fast',
          team: 'India',
          country: 'India',
          imageUrl: null,
          overallStats: {
            batting: { matches: 36, runs: 120, average: 8.0, strikeRate: 30.0 },
            bowling: { wickets: 159, average: 20.7, economy: 2.76 },
            fielding: { catches: 15 }
          }
        }
      ],
      Australia: [
        {
          apiPlayerId: 'aus_smith_001',
          name: 'Steve Smith',
          fullName: 'Steven Peter Devereux Smith',
          role: 'Batsman',
          battingStyle: 'Right-hand bat',
          bowlingStyle: 'Right-arm legbreak',
          team: 'Australia',
          country: 'Australia',
          imageUrl: null,
          overallStats: {
            batting: { matches: 103, runs: 9685, average: 58.7, strikeRate: 55.3 },
            bowling: { wickets: 18, average: 40.5, economy: 3.2 },
            fielding: { catches: 202 }
          }
        },
        {
          apiPlayerId: 'aus_cummins_002',
          name: 'Pat Cummins',
          fullName: 'Patrick James Cummins',
          role: 'Bowler',
          battingStyle: 'Right-hand bat',
          bowlingStyle: 'Right-arm fast',
          team: 'Australia',
          country: 'Australia',
          imageUrl: null,
          overallStats: {
            batting: { matches: 60, runs: 1100, average: 18.5, strikeRate: 45.0 },
            bowling: { wickets: 269, average: 21.8, economy: 2.85 },
            fielding: { catches: 35 }
          }
        },
        {
          apiPlayerId: 'aus_labuschagne_003',
          name: 'Marnus Labuschagne',
          fullName: 'Marnus Labuschagne',
          role: 'Batsman',
          battingStyle: 'Right-hand bat',
          bowlingStyle: 'Right-arm legbreak',
          team: 'Australia',
          country: 'Australia',
          imageUrl: null,
          overallStats: {
            batting: { matches: 42, runs: 3871, average: 54.8, strikeRate: 51.2 },
            bowling: { wickets: 5, average: 45.0, economy: 3.5 },
            fielding: { catches: 43 }
          }
        }
      ]
    };
    
    return mockSquads[teamName] || [];
  }

  /**
   * Fetch player stats
   */
  async fetchPlayerStats(playerId) {
    console.log(`[${this.name}] fetchPlayerStats not implemented`);
    throw new Error('Not implemented');
  }

  // ========================================
  // NORMALIZATION METHODS
  // ========================================

  normalizeSeries(rawData) {
    return {};
  }

  normalizeMatch(rawData) {
    return {};
  }

  normalizePlayer(rawData) {
    return {};
  }

  normalizeScorecard(rawData) {
    return {
      matchId: rawData.matchId,
      currentInning: rawData.currentInning || 1,
      team1Score: rawData.team1Score,
      team2Score: rawData.team2Score,
      innings: rawData.innings || [],
      playerStats: rawData.playerStats || [],
      lastUpdated: new Date()
    };
  }

  // ========================================
  // MOCK DATA GENERATION (Temporary)
  // ========================================

  /**
   * Generate mock live score
   * This simulates what we'd get from real API
   */
  generateMockLiveScore(matchId) {
    const randomScore = () => Math.floor(Math.random() * 300) + 150;
    const randomWickets = () => Math.floor(Math.random() * 10);
    const randomOvers = () => (Math.random() * 50).toFixed(1);

    return {
      matchId: matchId,
      currentInning: 2,
      team1Score: `${randomScore()}/${randomWickets()} (${randomOvers()})`,
      team2Score: `${randomScore()}/${randomWickets()} (${randomOvers()})`,
      status: 'live',
      currentOver: randomOvers(),
      recentBalls: ['4', 'W', '1', '0', '6', '2'],
      innings: [
        {
          inningNumber: 1,
          battingTeam: 'Team A',
          batting: [
            { id: 'p1', name: 'Player 1', runs: 45, ballsFaced: 38, fours: 4, sixes: 1 },
            { id: 'p2', name: 'Player 2', runs: 32, ballsFaced: 28, fours: 3, sixes: 0 }
          ],
          bowling: [
            { id: 'p3', name: 'Player 3', overs: 8, runs: 45, wickets: 2, maidens: 1 },
            { id: 'p4', name: 'Player 4', overs: 7, runs: 38, wickets: 1, maidens: 0 }
          ]
        }
      ],
      playerStats: [
        { playerId: 'p1', runs: 45, ballsFaced: 38, fours: 4, sixes: 1, wickets: 0 },
        { playerId: 'p2', runs: 32, ballsFaced: 28, fours: 3, sixes: 0, wickets: 0 },
        { playerId: 'p3', runs: 0, ballsFaced: 0, fours: 0, sixes: 0, wickets: 2, ballsBowled: 48, runsConceded: 45, maidens: 1 },
        { playerId: 'p4', runs: 0, ballsFaced: 0, fours: 0, sixes: 0, wickets: 1, ballsBowled: 42, runsConceded: 38, maidens: 0 }
      ],
      lastUpdated: new Date()
    };
  }
}

module.exports = CricbuzzProvider;

