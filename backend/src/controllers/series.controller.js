const { PrismaClient } = require('@prisma/client');
const cricketApiService = require('../services/cricket-api');

const prisma = new PrismaClient();

const seriesController = {
  /**
   * Get all series from cache/API
   */
  async getAllSeries(req, res) {
    try {
      console.log('[Series Controller] Fetching all series...');

      // Fetch from new cricket API service (uses cache + fallback)
      const series = await cricketApiService.getSeries();

      if (!series || series.length === 0) {
        console.log('[Series Controller] ⚠️  No series available');
        return res.json({
          success: true,
          data: []
        });
      }

      console.log(`[Series Controller] ✅ Returning ${series.length} series`);

      res.json({
        success: true,
        data: series
      });
    } catch (error) {
      console.error('[Series Controller] ❌ Error fetching series:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch series' 
      });
    }
  },

  /**
   * Get series by ID (API series ID from cache)
   */
  async getSeriesById(req, res) {
    try {
      const { id } = req.params;
      console.log(`[Series Controller] Fetching series ${id}...`);
      
      // Fetch from cricket API service
      const series = await cricketApiService.getSeriesById(id);

      if (!series) {
        console.log(`[Series Controller] ⚠️  Series ${id} not found`);
        return res.status(404).json({ 
          success: false,
          error: 'Series not found' 
        });
      }

      console.log(`[Series Controller] ✅ Series ${id} found`);

      res.json({
        success: true,
        data: series
      });
    } catch (error) {
      console.error(`[Series Controller] ❌ Error fetching series ${id}:`, error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch series' 
      });
    }
  },

  /**
   * Force refresh series from API (bypass cache)
   */
  async syncFromAPI(req, res) {
    try {
      console.log('[Series Controller] 🔄 Force refreshing series from API...');

      const series = await cricketApiService.refreshSeries();
      
      console.log(`[Series Controller] ✅ Refreshed ${series.length} series`);

      res.json({
        success: true,
        message: `Refreshed ${series.length} series from API`,
        data: series
      });
    } catch (error) {
      console.error('[Series Controller] ❌ Error syncing series:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to sync series from API' 
      });
    }
  },

  /**
   * Get API health status
   */
  async getHealthStatus(req, res) {
    try {
      const health = await cricketApiService.getHealthStatus();

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      console.error('[Series Controller] ❌ Error getting health status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get health status'
      });
    }
  }
};

module.exports = seriesController;

