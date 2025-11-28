# 🧪 Cricket API Testing Guide

This guide helps you test different cricket APIs **without affecting your main project**.

---

## 📁 Test Scripts

### 1. `test-cricket-apis.js` - Compare Multiple APIs
Tests all major cricket APIs and compares their capabilities.

**Run:**
```bash
node test-cricket-apis.js
```

**What it tests:**
- ✅ RapidAPI Cricbuzz (current)
- ✅ CricketData.org (current for squads)
- ✅ CricAPI.com (alternative)
- ✅ ESPN Cricinfo (via RapidAPI)
- ✅ Cricsheet (historical data)

---

### 2. `test-custom-api.js` - Test Any API Endpoint
Quickly test any cricket API endpoint with custom parameters.

**Run:**
```bash
node test-custom-api.js
```

**How to use:**
1. Open `test-custom-api.js`
2. Modify the `TEST_CONFIG` section:
   ```javascript
   const TEST_CONFIG = {
     url: 'YOUR_API_ENDPOINT',
     method: 'GET',
     headers: { ... },
     params: { ... }
   };
   ```
3. Save and run: `node test-custom-api.js`

---

## 🔑 API Keys Needed

Add these to your `.env` file to test:

```env
# Current APIs (already in your .env)
RAPIDAPI_KEY=your_rapidapi_key
CRICKETDATA_API_KEY=your_cricketdata_key

# Optional: To test alternatives
CRICAPI_KEY=your_cricapi_key  # Sign up at https://www.cricapi.com/
```

---

## 🧪 Testing Examples

### Example 1: Test RapidAPI Cricbuzz Player Search

```bash
# Uses default config in test-cricket-apis.js
node test-cricket-apis.js
```

### Example 2: Test Custom Player Stats

Edit `test-custom-api.js`:
```javascript
TEST_CONFIG.url = 'https://cricbuzz-cricket.p.rapidapi.com/stats/v1/player/253802/batting';
TEST_CONFIG.params = {};
```

Then run:
```bash
node test-custom-api.js
```

### Example 3: Test Different Player

Edit `test-custom-api.js`:
```javascript
TEST_CONFIG.params.plrN = 'Rohit Sharma';
```

Then run:
```bash
node test-custom-api.js
```

---

## 🌐 Alternative APIs to Explore

### 1. **CricAPI.com**
- **Website**: https://www.cricapi.com/
- **Pricing**: Free tier available
- **Good for**: Player stats, match scores, series info
- **Endpoints**:
  - `/players` - Search players
  - `/players_info` - Player details
  - `/match_info` - Match details

**Example:**
```javascript
// In test-custom-api.js
TEST_CONFIG.url = 'https://api.cricapi.com/v1/players';
TEST_CONFIG.headers = {};
TEST_CONFIG.params = {
  apikey: process.env.CRICAPI_KEY,
  offset: 0,
  search: 'Babar Azam'
};
```

### 2. **CricHeroes API**
- **Website**: https://cricheroes.com/api
- **Good for**: Local cricket data, tournament management
- **Note**: More focused on grassroots cricket

### 3. **Cricsheet.org**
- **Website**: https://cricsheet.org/
- **Good for**: Historical ball-by-ball data
- **Format**: YAML/JSON files (not REST API)
- **Data**: All international matches since 2004

### 4. **RapidAPI Cricket Hub**
- **Website**: https://rapidapi.com/hub?search=cricket
- **Browse**: 20+ cricket APIs
- **Compare**: Features, pricing, data quality

---

## 📊 What to Look For

When testing APIs, check:

### ✅ Player Stats Coverage
- [ ] Career stats (Test, ODI, T20, IPL)
- [ ] Recent form/performance
- [ ] Batting stats (runs, average, SR)
- [ ] Bowling stats (wickets, economy, average)
- [ ] Fielding stats (catches, stumpings)

### ✅ Data Quality
- [ ] Up-to-date information
- [ ] Complete historical records
- [ ] Accurate statistics
- [ ] Player images/photos

### ✅ API Reliability
- [ ] Response time
- [ ] Rate limits
- [ ] Error handling
- [ ] Documentation quality

### ✅ Pricing
- [ ] Free tier limits
- [ ] Paid tier pricing
- [ ] Request quotas
- [ ] Cost per 1000 requests

---

## 💡 Recommendations

Based on testing, here's what works best:

| Need | Best API | Alternative |
|------|----------|-------------|
| **Player Stats** | RapidAPI Cricbuzz | CricAPI.com |
| **Squad Data** | CricketData.org | RapidAPI Cricbuzz |
| **Live Scores** | RapidAPI Cricbuzz | CricketData.org |
| **Historical Data** | Cricsheet.org | - |
| **Player Images** | RapidAPI Cricbuzz | - |

**Current Hybrid Approach (Recommended):**
- ✅ **CricketData.org** for series & squads (free, reliable)
- ✅ **RapidAPI Cricbuzz** for player stats (comprehensive, paid)

---

## 🔧 Troubleshooting

### Error: "Invalid API Key"
- Check `.env` file has correct key
- Verify key is active on provider's dashboard
- Check if free tier quota exceeded

### Error: "Rate Limit Exceeded"
- Wait for quota reset (usually daily)
- Consider upgrading to paid tier
- Switch to alternative API temporarily

### Error: "Player Not Found"
- Try different name spelling
- Check player exists in that API's database
- Some APIs only have international players

---

## 🎯 Next Steps

1. **Test current APIs:**
   ```bash
   node test-cricket-apis.js
   ```

2. **Explore alternatives:**
   - Sign up for CricAPI.com
   - Browse RapidAPI hub
   - Test with `test-custom-api.js`

3. **Compare results:**
   - Data completeness
   - Response times
   - Pricing
   - Reliability

4. **Decide:**
   - Keep current setup?
   - Switch to alternative?
   - Use multiple APIs?

---

## ⚠️ Important Notes

- ✅ These test scripts **DO NOT** modify your main project
- ✅ Safe to run anytime
- ✅ Won't affect your database
- ✅ Won't affect your tournament/auction code
- ✅ Only tests API responses

---

## 📝 Adding Results to Documentation

After testing, you can add your findings:

```javascript
// In test-cricket-apis.js, add notes:
console.log('📋 MY FINDINGS:');
console.log('   API X: Great for Y, but missing Z');
console.log('   API Y: Slower, but has Z data');
```

---

**Happy Testing! 🏏🧪**


