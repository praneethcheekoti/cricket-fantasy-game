# Testing Phase 1 - Series & Match APIs with Caching

## 🎯 What We're Testing

We've implemented **75% of the system**:
- ✅ Cache infrastructure (tested)
- ✅ API providers (tested)
- ✅ API selector & usage tracker
- ✅ Main cricket API service
- ✅ **Series Controller** (NEW - uses caching)
- ✅ **Match Controller** (NEW - uses caching)

**NOT testing yet:**
- ⏳ Auction Service (still has mocks - will update next)
- ⏳ Background jobs (not created yet)

---

## 📋 Pre-Test Checklist

### 1. Ensure Backend is Ready
```bash
cd backend

# Generate Prisma client (if not done)
npx prisma generate

# Check environment variables
# Make sure DATABASE_URL is set in .env
```

### 2. Start the Backend Server
```bash
npm run dev
```

**Expected Output:**
```
Server running on port 5000
✓ Connected to MongoDB
```

---

## 🧪 Test Suite

### **Test 1: API Health Status** ⭐ Start Here

**Purpose:** Verify the new API infrastructure is initialized

**Request:**
```bash
GET http://localhost:5000/api/series/health/status
Headers: Authorization: Bearer YOUR_JWT_TOKEN
```

**Or with cURL:**
```bash
curl -X GET http://localhost:5000/api/series/health/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-11-16T...",
    "providers": [
      {
        "api": "cricapi",
        "active": true,
        "usage": "0/100",
        "remaining": 100,
        "errors": 0,
        "status": "🟢 Available"
      },
      {
        "api": "cricbuzz",
        "active": true,
        "usage": "0/500",
        "remaining": 500,
        "status": "🟢 Available"
      }
    ],
    "summary": {
      "total": 4,
      "active": 2,
      "disabled": 2,
      "exhausted": 0
    },
    "cache": {
      "hits": 0,
      "misses": 0,
      "apiCalls": 0,
      "hitRate": "0%"
    }
  }
}
```

✅ **Success Criteria:**
- `success: true`
- At least 1 provider is `active: true`
- `status: "🟢 Available"`

---

### **Test 2: Fetch Series (First Call - Cache Miss)**

**Purpose:** Test API fetch + cache save

**Request:**
```bash
GET http://localhost:5000/api/series
Headers: Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Behavior:**
1. Cache MISS (no cached data)
2. Fetches from CricAPI provider
3. Saves to SeriesCache
4. Returns series list

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "apiSeriesId": "...",
      "name": "India vs Australia Test Series 2024",
      "format": "Test",
      "gender": "Men",
      "teams": ["India", "Australia"],
      "status": "upcoming",
      "startDate": "2024-12-01T...",
      "endDate": "2024-12-26T..."
    },
    // ... more series
  ]
}
```

**Backend Console (Check for these logs):**
```
[Cricket API] 📋 Fetching series...
[Cricket API] 🌐 Cache miss, fetching from API...
[API Selector] 🎯 Selecting provider for: series
[API Selector] ✅ Selected: cricapi
[CricAPI] Request: GET https://api.cricapi.com/v1/series
[CricAPI] ✅ Success
[Cache] 💾 Saved series ...
[Cricket API] ✅ Fetched and cached X series
[Series Controller] ✅ Returning X series
```

✅ **Success Criteria:**
- Returns array of series
- Console shows "Cache miss"
- Console shows "Saved series"
- MongoDB has new entries in `SeriesCache` collection

---

### **Test 3: Fetch Series Again (Cache Hit)** ⭐ Important!

**Purpose:** Verify caching is working

**Request:**
```bash
GET http://localhost:5000/api/series
Headers: Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Behavior:**
1. Cache HIT (data exists, < 24h old)
2. Returns immediately from cache
3. **NO API call made!**

**Backend Console (Should see):**
```
[Cricket API] 📋 Fetching series...
[Cache] ✅ All series - HIT (X items)
[Cricket API] ✅ Returning X series from cache
[Series Controller] ✅ Returning X series
```

**Should NOT see:**
- ❌ "Cache miss"
- ❌ "Fetching from API"
- ❌ CricAPI request

✅ **Success Criteria:**
- Same data returned instantly
- Console shows "Cache HIT"
- No API request made
- Response time < 100ms (very fast!)

---

### **Test 4: Fetch Matches for Series**

**Purpose:** Test match caching

**First, get a series ID from Test 2, then:**

**Request:**
```bash
GET http://localhost:5000/api/matches/series/SERIES_ID_HERE
Headers: Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "apiMatchId": "...",
      "apiSeriesId": "...",
      "team1": "India",
      "team2": "Australia",
      "venue": "Mumbai",
      "matchDate": "2024-12-05T...",
      "status": "upcoming",
      "format": "Test"
    },
    // ... more matches
  ]
}
```

**Backend Console:**
```
[Match Controller] Fetching matches for series ...
[Cricket API] 🏏 Fetching matches for series ...
[Cricket API] 🌐 Cache miss, fetching from API...
[API Selector] ✅ Selected: cricapi
[Cache] 💾 Saved match ...
[Match Controller] ✅ Returning X matches
```

✅ **Success Criteria:**
- Returns array of matches
- Matches are cached in `MatchCache` collection
- Second request is cache hit

---

### **Test 5: Force Refresh (Bypass Cache)**

**Purpose:** Test force refresh functionality

**Request:**
```bash
POST http://localhost:5000/api/series/sync
Headers: Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Behavior:**
1. Bypasses cache
2. Fetches fresh data from API
3. Updates cache

**Backend Console:**
```
[Series Controller] 🔄 Force refreshing series from API...
[API Selector] ✅ Selected: cricapi
[CricAPI] Request: GET ...
[Cache] 💾 Saved series ...
[Series Controller] ✅ Refreshed X series
```

✅ **Success Criteria:**
- Returns fresh data
- Makes API call even if cache exists
- Updates cache with new data

---

### **Test 6: Check API Usage Tracking**

**Purpose:** Verify usage is being tracked

**Request:**
```bash
GET http://localhost:5000/api/series/health/status
Headers: Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "api": "cricapi",
        "usage": "2/100",  // ← Should be > 0 now
        "remaining": 98,
        "status": "🟢 Available"
      }
    ],
    "cache": {
      "hits": 1,      // ← From Test 3
      "misses": 2,    // ← From Test 2 & 4
      "apiCalls": 2,  // ← From Test 2 & 4
      "hitRate": "33.3%"
    }
  }
}
```

✅ **Success Criteria:**
- `usage` shows API calls made (should be 2-3)
- `cache.hits` > 0 (from repeated requests)
- `cache.hitRate` is calculated correctly

---

## 🗄️ Verify MongoDB Data

Open MongoDB Compass or Atlas and check these collections:

### **SeriesCache**
Should have entries like:
```json
{
  "_id": "...",
  "apiSeriesId": "test_series_001",
  "name": "India vs Australia...",
  "teams": "[\"India\",\"Australia\"]",
  "status": "upcoming",
  "cachedAt": "2024-11-16T...",
  "expiresAt": "2024-11-17T..." // 24 hours later
}
```

### **ApiUsageTracker**
Should have entries for each provider:
```json
{
  "_id": "...",
  "apiName": "cricapi",
  "callsToday": 2,
  "dailyLimit": 100,
  "isActive": true,
  "errorCount": 0
}
```

### **CacheStatistics**
Should have today's stats:
```json
{
  "_id": "...",
  "date": "2024-11-16T00:00:00Z",
  "cacheHits": 1,
  "cacheMisses": 2,
  "apiCalls": 2
}
```

---

## 📊 Performance Expectations

| Operation | First Call | Cached Call |
|-----------|------------|-------------|
| Get Series | ~1-2s | <100ms ✅ |
| Get Matches | ~1-2s | <100ms ✅ |
| API Calls | 1 per request | 0 ✅ |
| DB Queries | Few | 1-2 ✅ |

**Caching is working if:**
- ✅ Second requests are 10-20x faster
- ✅ Console shows "Cache HIT"
- ✅ No API requests on cached data

---

## ❌ Troubleshooting

### Issue: "Cannot find module '../services/cricket-api'"

**Solution:**
The file is at `backend/src/services/cricket-api/index.js`

Check import:
```javascript
// Should be:
const cricketApiService = require('../services/cricket-api');
// NOT:
const cricketApiService = require('../services/cricket-api.service');
```

### Issue: "No available API provider"

**Cause:** All providers disabled or no API keys

**Solution:**
```bash
# Check .env file
ENABLE_CRICAPI=true
ENABLE_CRICBUZZ=true

# CricAPI key optional for mock data
CRICAPI_KEY=your_key_here
```

### Issue: "Series returns empty array"

**Expected:** First time setup, APIs might not have data

**Solution:**
- CricAPI may need API key for real data
- For testing, providers will use mock squad data
- Check console logs for errors

### Issue: Cache not working (always fetching from API)

**Check:**
1. MongoDB connection working?
2. `SeriesCache` collection created?
3. Check console for "Cache HIT" messages
4. Verify `expiresAt` is in future

**Debug:**
```bash
# In MongoDB, check:
db.SeriesCache.find().pretty()

# Should see entries with expiresAt > now
```

---

## ✅ Test Completion Checklist

Run through all 6 tests:
- [ ] Test 1: Health status returns correctly
- [ ] Test 2: First series fetch works (cache miss)
- [ ] Test 3: Second series fetch is cached (cache hit)
- [ ] Test 4: Matches fetch works
- [ ] Test 5: Force refresh works
- [ ] Test 6: Usage tracking shows accurate numbers

Verify MongoDB:
- [ ] SeriesCache has entries
- [ ] ApiUsageTracker shows usage
- [ ] CacheStatistics recorded

Performance:
- [ ] Cached requests are significantly faster
- [ ] API usage stays low (<5 calls for tests)

---

## 🎯 Success Metrics

After running all tests:

**Expected Results:**
```
Total API Calls:     3-4 calls
Cache Hit Rate:      ~33-50%
Cached Responses:    <100ms
API Tracked:         ✅ Yes
MongoDB Updated:     ✅ Yes
Errors:              0
```

**If all tests pass:**
✅ **Ready to continue with remaining 25% implementation!**

---

## 📝 Report Results

After testing, please share:
1. ✅/❌ for each test
2. Any errors from console
3. Screenshot of MongoDB collections (optional)
4. Health status API response

This will help identify any issues before we continue! 🚀

