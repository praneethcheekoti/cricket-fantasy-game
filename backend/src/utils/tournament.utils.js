const crypto = require('crypto');

function generateTournamentCode() {
  // Generate 8-character alphanumeric code
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function getDefaultScoringRules() {
  return {
    batting: {
      run: 1,
      four: 4,
      six: 6,
      fifty: 50,
      century: 100,
      duck: -10,
      strikeRateBonus: {
        enabled: true,
        ranges: [
          { min: 150, max: 999, points: 20 },  // SR > 150
          { min: 120, max: 149.99, points: 10 }, // SR 120-150
          { min: 60, max: 79.99, points: -10 }   // SR 60-80
        ]
      }
    },
    bowling: {
      wicket: 25,
      maiden: 10,
      threeWicketHaul: 30,
      fiveWicketHaul: 50,
      economyRateBonus: {
        enabled: true,
        ranges: [
          { min: 0, max: 5, points: 20 },      // ER < 5
          { min: 5, max: 6.99, points: 10 },   // ER 5-7
          { min: 10, max: 999, points: -10 }   // ER > 10
        ]
      }
    },
    fielding: {
      catch: 10,
      runOut: 15,
      stumping: 15,
      directHit: 5
    },
    captain: {
      enabled: true,
      captainMultiplier: 2,
      viceCaptainMultiplier: 1.5
    },
    awards: {
      manOfTheMatch: 50,
      playerOfTheSeries: 100
    },
    composition: {
      minBatsmen: 0,
      minBowlers: 0,
      minAllRounders: 0,
      minWicketKeepers: 0
    }
  };
}

module.exports = {
  generateTournamentCode,
  getDefaultScoringRules
};

