const express = require('express');
const router = express.Router();
const matchController = require('../controllers/match.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/series/:seriesId', authMiddleware, matchController.getSeriesMatches);
router.get('/:id/live', authMiddleware, matchController.getLiveScore); // Live score from API
router.get('/:id/scores', authMiddleware, matchController.getMatchScores); // Fantasy scores from DB
router.get('/:id', authMiddleware, matchController.getMatchDetails);

// Man of the Match
router.put('/:matchId/man-of-match', authMiddleware, matchController.setManOfMatch);

// Player of the Series
router.put('/tournament/:tournamentId/player-of-series', authMiddleware, matchController.setPlayerOfSeries);
router.post('/tournament/:tournamentId/apply-pots-bonus', authMiddleware, matchController.applyPlayerOfSeriesBonus);

module.exports = router;

