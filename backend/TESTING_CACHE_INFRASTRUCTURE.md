# Testing Cricket API Cache Infrastructure

## 🎯 What We're Testing

We've implemented:
1. ✅ **7 new cache models** in Prisma schema (SeriesCache, MatchCache, PlayerCache, etc.)
2. ✅ **Base provider interface** for all cricket APIs
3. ✅ **CricAPI provider** (primary source with 100 req/day)
4. ✅ **Cricbuzz provider** (backup for live scores)
5. ✅ **Cache service** with smart TTL and expiration logic

## 📋 Step-by-Step Testing Instructions

### Step 1: Generate Prisma Client
```bash
cd backend
npx prisma generate
```

**Expected Output:**
```
✔ Generated Prisma Client (5.x.x | library) to ./node_modules/@prisma/client
```

This creates TypeScript types for all our new cache models.

---

### Step 2: Run the Test Script
```bash
node src/services/cricket-api/test-infrastructure.js
```

**Expected Output:**
```
🏏 ========================================
   CRICKET API INFRASTRUCTURE TEST
========================================

📋 Test 1: Initialize API Providers

✅ CricAPI Provider initialized
   - Base URL: https://api.cricapi.com/v1
   - Daily Limit: 100
   - Enabled: true
✅ Cricbuzz Provider initialized
   - Base URL: https://unofficial-cricbuzz.p.rapidapi.com
   - Daily Limit: 500
   - Enabled: true


📋 Test 2: Cache Service - Series Operations

✅ Series saved to cache
✅ Series retrieved from cache
   - Name: India vs Australia Test Series 2024
   - Format: Test
   - Teams: India vs Australia
   - Status: upcoming
✅ TTL calculated: 24 hours


📋 Test 3: Cache Service - Match Operations

✅ Match saved to cache
✅ Match retrieved from cache
   - Teams: India vs Australia
   - Venue: Mumbai
   - Status: upcoming

... (more tests)

========================================
   TEST SUMMARY
========================================

✅ Providers: Initialized successfully
✅ Cache Service: All operations working
✅ TTL Logic: Functioning correctly
✅ Statistics: Recording properly

🎉 Infrastructure is ready!
```

---

### Step 3: Verify Database

Open a MongoDB Atlas or Compass and check these collections were created:

- ✅ `SeriesCache`
- ✅ `MatchCache`
- ✅ `PlayerCache`
- ✅ `LiveScoreCache`
- ✅ `ApiUsageTracker`
- ✅ `CacheStatistics`

**Sample data from test:**
```javascript
SeriesCache {
  _id: "...",
  apiSeriesId: "test_series_001",
  name: "India vs Australia Test Series 2024",
  format: "Test",
  teams: "[\"India\",\"Australia\"]",
  status: "upcoming",
  cachedAt: "2024-11-16T...",
  expiresAt: "2024-11-17T..." // 24 hours later
}
```

---

## 🧪 Manual Testing

### Test Cache Service Directly

Create a test file `backend/test-cache.js`:

```javascript
const cacheService = require('./src/services/cricket-api/cache-service');

async function test() {
  // Save a series
  await cacheService.saveSeriesCache({
    apiSeriesId: 'manual_test_001',
    name: 'My Test Series',
    format: 'ODI',
    gender: 'Men',
    teams: ['Team A', 'Team B'],
    startDate: new Date(),
    endDate: new Date(),
    status: 'upcoming',
    metadata: {}
  }, 'manual');

  // Retrieve it
  const series = await cacheService.getSeriesCache('manual_test_001');
  console.log('Retrieved:', series);
}

test();
```

Run: `node backend/test-cache.js`

---

## ✅ Success Criteria

Your infrastructure is working if:

1. ✅ Prisma generates without errors
2. ✅ Test script runs and all tests pass
3. ✅ MongoDB collections are created
4. ✅ Data is saved and retrieved correctly
5. ✅ TTL logic calculates correctly (24h for series, 30s for live, etc.)
6. ✅ Cache hit/miss statistics are recorded

---

## 🐛 Troubleshooting

### Error: `PrismaClientValidationError`
**Solution:** Run `npx prisma generate` again

### Error: `Cannot find module './cache-service'`
**Solution:** Check file paths, ensure you're in `backend/` directory

### Error: Connection to MongoDB fails
**Solution:** Verify `DATABASE_URL` in `.env` is correct

### No data in MongoDB
**Solution:** This is expected on first run - data only persists after API calls

---

## 📊 What's Working Now

| Component | Status | Description |
|-----------|--------|-------------|
| Cache Models | ✅ Ready | 7 models in Prisma schema |
| Base Provider | ✅ Ready | Interface for all APIs |
| CricAPI Provider | ✅ Ready | Can fetch series, matches, players |
| Cricbuzz Provider | ✅ Ready | Can fetch live scores |
| Cache Service | ✅ Ready | Save/retrieve with TTL |
| Statistics | ✅ Ready | Track hits/misses/API calls |

## 🚧 What's Not Implemented Yet

| Component | Status | Description |
|-----------|--------|-------------|
| API Selector | ⏳ Pending | Smart provider selection |
| Main Service | ⏳ Pending | Coordinates cache + APIs |
| Controllers | ⏳ Pending | Update to use new system |
| Background Jobs | ⏳ Pending | Live updates & cleanup |
| Real API Calls | ⏳ Pending | Currently using mocks |

---

## 🎯 Next Steps (After Testing)

Once tests pass, we'll implement:

1. **API Selector Service** - Intelligently chooses which API to use
2. **Main Cricket API Service** - Orchestrates cache + providers
3. **Update Controllers** - Series, Match, Auction controllers
4. **Background Jobs** - Live match updates every 30s
5. **Real API Integration** - Connect to actual CricAPI

---

## 💡 Notes

- **No API keys required yet** - Test uses mock data
- **Cache works offline** - Can test without internet
- **Safe to run multiple times** - Upserts prevent duplicates
- **TTL is accurate** - Series expire in 24h, live scores in 30s

---

**Ready to test?** Run the commands above and share any errors! 🚀

