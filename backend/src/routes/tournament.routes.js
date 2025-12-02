const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournament.controller');
const matchController = require('../controllers/match.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/', authMiddleware, tournamentController.createTournament);
router.post('/join', authMiddleware, tournamentController.joinTournament); // Fixed: accepts code in body
router.get('/user/list', authMiddleware, tournamentController.getUserTournaments); // Moved before /:id
router.get('/series/:seriesId/formats', authMiddleware, tournamentController.getSeriesFormats); // Get available formats for a series

// Match Center - Get all matches for tournament (MUST be before /:id route)
router.get('/:tournamentId/matches', authMiddleware, matchController.getTournamentMatches);

// Calculate fantasy points for a match (MUST be before /:id route)
router.post('/:tournamentId/matches/:matchId/calculate', authMiddleware, matchController.calculateMatchPoints);

// Leaderboard - Match-wise breakdown (MUST be before /:id/leaderboard route)
router.get('/:tournamentId/leaderboard/match/:matchId', authMiddleware, tournamentController.getMatchWiseBreakdown);

// Leaderboard - Overall standings with user stats (MUST be before /:id/leaderboard route)
router.get('/:tournamentId/leaderboard/overall', authMiddleware, tournamentController.getOverallStandings);

// Get all participants in tournament (for dropdown in match-wise breakdown)
router.get('/:tournamentId/participants', authMiddleware, tournamentController.getTournamentParticipants);

// Generic routes (MUST be after specific routes to avoid conflicts)
router.get('/:id', authMiddleware, tournamentController.getTournamentDetails);
router.put('/:id/rules', authMiddleware, tournamentController.updateRules);
router.post('/:id/lock-rules', authMiddleware, tournamentController.lockRules);
router.post('/:id/start-auction', authMiddleware, tournamentController.startAuction);
router.delete('/:id', authMiddleware, tournamentController.deleteTournament);
router.get('/:id/leaderboard', authMiddleware, tournamentController.getLeaderboard); // Mock leaderboard

module.exports = router;

