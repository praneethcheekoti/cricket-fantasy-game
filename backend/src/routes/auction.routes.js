const express = require('express');
const router = express.Router();
const auctionController = require('../controllers/auction.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/:tournamentId/players', authMiddleware, auctionController.getAuctionPlayers);
router.post('/:tournamentId/bid', authMiddleware, auctionController.placeBid);
router.post('/:tournamentId/complete/:playerId', authMiddleware, auctionController.completePlayerAuction);
router.get('/:tournamentId/teams', authMiddleware, auctionController.getAllTeams);
router.get('/:tournamentId/my-team', authMiddleware, auctionController.getMyTeam);
router.put('/:tournamentId/captain', authMiddleware, auctionController.setCaptainViceCaptain);
router.delete('/:tournamentId/remove-duplicates', authMiddleware, auctionController.removeDuplicatePlayers);

module.exports = router;

