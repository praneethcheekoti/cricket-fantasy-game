const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournament.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/', authMiddleware, tournamentController.createTournament);
router.post('/join', authMiddleware, tournamentController.joinTournament); // Fixed: accepts code in body
router.get('/user/list', authMiddleware, tournamentController.getUserTournaments); // Moved before /:id
router.get('/:id', authMiddleware, tournamentController.getTournamentDetails);
router.put('/:id/rules', authMiddleware, tournamentController.updateRules);
router.post('/:id/lock-rules', authMiddleware, tournamentController.lockRules);
router.post('/:id/start-auction', authMiddleware, tournamentController.startAuction);
router.delete('/:id', authMiddleware, tournamentController.deleteTournament);
router.get('/:id/leaderboard', authMiddleware, tournamentController.getLeaderboard);

module.exports = router;

