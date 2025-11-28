const express = require('express');
const router = express.Router();
const auctionController = require('../controllers/auction.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/:tournamentId/players', authMiddleware, auctionController.getAuctionPlayers);
router.post('/:tournamentId/bid', authMiddleware, auctionController.placeBid);
router.post('/:tournamentId/complete/:playerId', authMiddleware, auctionController.completePlayerAuction);
router.post('/:tournamentId/rebid/:playerId', authMiddleware, auctionController.rebidPlayer);
router.get('/:tournamentId/teams', authMiddleware, auctionController.getAllTeams);
router.get('/:tournamentId/player/:playerId/bids', authMiddleware, auctionController.getPlayerBidHistory);
router.get('/:tournamentId/player/:playerId/dynamic-stats', authMiddleware, auctionController.getDynamicPlayerStats);
router.post('/:tournamentId/pause', authMiddleware, auctionController.pauseAuction);
router.post('/:tournamentId/unpause', authMiddleware, auctionController.unpauseAuction);
router.get('/:tournamentId/my-team', authMiddleware, auctionController.getMyTeam);
router.put('/:tournamentId/captain', authMiddleware, auctionController.setCaptainViceCaptain);
router.delete('/:tournamentId/remove-duplicates', authMiddleware, auctionController.removeDuplicatePlayers);

module.exports = router;

