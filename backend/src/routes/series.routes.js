const express = require('express');
const router = express.Router();
const seriesController = require('../controllers/series.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/', authMiddleware, seriesController.getAllSeries);
router.get('/health/status', authMiddleware, seriesController.getHealthStatus); // API health check
router.get('/:id', authMiddleware, seriesController.getSeriesById);
router.post('/sync', authMiddleware, seriesController.syncFromAPI); // Admin feature

module.exports = router;

