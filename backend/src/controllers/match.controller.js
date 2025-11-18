const { PrismaClient } = require('@prisma/client');
const cricketApiService = require('../services/cricket-api');

const prisma = new PrismaClient();

const matchController = {
  /**
   * Get all matches for a series (from cache/API)
   */
  async getSeriesMatches(req, res) {
    try {
      const { seriesId } = req.params;
      console.log(`[Match Controller] Fetching matches for series ${seriesId}...`);

      // Fetch from new cricket API service (uses cache + fallback)
      const matches = await cricketApiService.getMatchesBySeries(seriesId);

      if (!matches || matches.length === 0) {
        console.log(`[Match Controller] ⚠️  No matches found for series ${seriesId}`);
        return res.json({
          success: true,
          data: []
        });
      }

      console.log(`[Match Controller] ✅ Returning ${matches.length} matches`);

      res.json({
        success: true,
        data: matches
      });
    } catch (error) {
      console.error('[Match Controller] ❌ Error fetching matches:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch matches' 
      });
    }
  },

  /**
   * Get match details by ID (from cache/API)
   */
  async getMatchDetails(req, res) {
    try {
      const { id } = req.params;
      console.log(`[Match Controller] Fetching match ${id}...`);

      // Fetch from cricket API service
      const match = await cricketApiService.getMatchDetails(id);

      if (!match) {
        console.log(`[Match Controller] ⚠️  Match ${id} not found`);
        return res.status(404).json({ 
          success: false,
          error: 'Match not found' 
        });
      }

      console.log(`[Match Controller] ✅ Match ${id} found`);

      res.json({
        success: true,
        data: match
      });
    } catch (error) {
      console.error('[Match Controller] ❌ Error fetching match:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch match details' 
      });
    }
  },

  /**
   * Get live score for a match
   */
  async getLiveScore(req, res) {
    try {
      const { id } = req.params;
      console.log(`[Match Controller] Fetching live score for match ${id}...`);

      // Fetch live score from cricket API service
      const scorecard = await cricketApiService.getLiveScore(id);

      if (!scorecard) {
        console.log(`[Match Controller] ⚠️  No live score available for match ${id}`);
        return res.status(404).json({
          success: false,
          error: 'Live score not available'
        });
      }

      console.log(`[Match Controller] ✅ Live score retrieved for match ${id}`);

      res.json({
        success: true,
        data: scorecard
      });
    } catch (error) {
      console.error('[Match Controller] ❌ Error fetching live score:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch live score'
      });
    }
  },

  /**
   * Get fantasy match scores (calculated points from our DB)
   */
  async getMatchScores(req, res) {
    try {
      const { id } = req.params;
      console.log(`[Match Controller] Fetching fantasy scores for match ${id}...`);

      // This fetches from our own MatchPlayerScore table (calculated fantasy points)
      const scores = await prisma.matchPlayerScore.findMany({
        where: { matchId: id },
        include: {
          teamPlayer: {
            include: {
              team: {
                include: {
                  user: {
                    select: { id: true, name: true, email: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { fantasyPoints: 'desc' }
      });

      console.log(`[Match Controller] ✅ Found ${scores.length} player scores`);

      res.json({
        success: true,
        data: scores
      });
    } catch (error) {
      console.error('[Match Controller] ❌ Error fetching match scores:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch match scores' 
      });
    }
  }
};

module.exports = matchController;

