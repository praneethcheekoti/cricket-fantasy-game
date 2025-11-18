# Background Jobs System

## Overview

The Cricket Fantasy Game includes a background job system that runs automated tasks to keep data fresh, clean up expired cache, and maintain system health.

---

## 🎯 Architecture

All background jobs run **inside the main backend server** (no separate infrastructure needed).

```
Backend Server (Single Node.js Process)
├── Express API (Port 5000)
│   └── All API endpoints
│
└── Background Jobs (node-cron)
    ├── Cache Cleanup (Daily at 2 AM)
    ├── API Usage Reset (Daily at Midnight)
    └── Live Score Refresh (Every 5 minutes)
```

---

## 📋 Jobs

### 1. Cache Cleanup Job 🧹

**Purpose:** Delete expired cache entries from MongoDB

**Schedule:** Daily at 2:00 AM (IST)

**Also runs:** On server startup

**What it does:**
- Finds all cache entries where `expiresAt < now`
- Deletes expired entries from:
  - SeriesCache
  - MatchCache
  - PlayerCache
  - LiveScoreCache (older than 30 days)
- Logs cleanup statistics

**File:** `src/jobs/cache-cleanup.job.js`

**Example Output:**
```
🧹 [CACHE CLEANUP] Starting cache cleanup job...
⏰ [CACHE CLEANUP] Time: 2024-11-16T02:00:00.000Z
✅ [CACHE CLEANUP] Cleanup completed successfully!
   📊 Series deleted: 2
   📊 Matches deleted: 5
   📊 Players deleted: 10
   📊 Scores deleted: 15
   🎯 Total entries cleaned: 32
```

---

### 2. API Usage Reset Job 🔄

**Purpose:** Reset daily API call counters for all providers

**Schedule:** Daily at 12:00 AM Midnight (IST)

**Also runs:** On server startup (if new day detected)

**What it does:**
- Checks all API providers in `ApiUsageTracker`
- Resets `callsToday` to 0
- Resets `errorCount` to 0
- Updates `lastResetAt` timestamp
- Only resets if it's a different day than last reset

**File:** `src/jobs/api-reset.job.js`

**Example Output:**
```
🔄 [API RESET] Starting API usage reset job...
⏰ [API RESET] Time: 2024-11-16T00:00:00.000Z
   ✅ Reset cricapi: 45 → 0 calls
   ✅ Reset rapidapi: 12 → 0 calls
   ✅ Reset cricbuzz: 78 → 0 calls
   ✅ Reset cricketdata: 8 → 0 calls
✅ [API RESET] Reset completed!
   🎯 Providers reset: 4/4
```

---

### 3. Live Score Refresh Job 🔴

**Purpose:** Update scores for all live matches

**Schedule:** Every 5 minutes

**Also runs:** On server startup

**What it does:**
- Finds all matches with `status = 'live'` in MatchCache
- Fetches latest scorecard from Cricket API
- Updates LiveScoreCache with new data
- Logs update statistics

**File:** `src/jobs/live-score.job.js`

**Example Output:**
```
🔴 [LIVE SCORES] Starting live score refresh job...
⏰ [LIVE SCORES] Time: 2024-11-16T14:35:00.000Z
📊 [LIVE SCORES] Found 2 live match(es)
   🔄 Refreshing: India vs Australia
   ✅ Updated: India vs Australia
   🔄 Refreshing: England vs Pakistan
   ✅ Updated: England vs Pakistan
✅ [LIVE SCORES] Refresh completed!
   🎯 Updated: 2/2
```

---

## ⚙️ Configuration

### Timezone

All jobs use **Asia/Kolkata (IST)** timezone.

To change timezone, edit `src/scheduler.js`:

```javascript
const job = cron.schedule('0 2 * * *', async () => {
  await cleanupExpiredCache();
}, {
  scheduled: true,
  timezone: "America/New_York" // Change this
});
```

### Job Schedules

To modify job schedules, edit `src/scheduler.js`:

```javascript
// Current schedules:
'0 2 * * *'     // Cache Cleanup: 2 AM daily
'0 0 * * *'     // API Reset: Midnight daily
'*/5 * * * *'   // Live Scores: Every 5 minutes

// Cron format: minute hour day month weekday
// Examples:
'*/10 * * * *'  // Every 10 minutes
'0 */6 * * *'   // Every 6 hours
'30 3 * * *'    // Daily at 3:30 AM
'0 0 * * 0'     // Weekly on Sunday at midnight
```

---

## 🚀 How It Works

### On Server Startup:

1. **Server Starts** → Express server initializes
2. **Startup Jobs Run** → All 3 jobs execute immediately:
   - Cache cleanup
   - API reset (if new day)
   - Live score refresh
3. **Scheduler Starts** → Cron jobs registered for recurring execution
4. **API Ready** → Server accepts requests

### While Server is Running:

- Jobs run **automatically** at scheduled times
- If server is **down** at scheduled time → Job doesn't run (no problem!)
- Next **startup** → Jobs run again to catch up

---

## 🔍 Monitoring

### Check Job Status

View active jobs in console on server startup:

```
✅ [SCHEDULER] All jobs registered successfully!

📋 [SCHEDULER] Active Jobs:
   1. Cache Cleanup
      Schedule: 0 2 * * * (Daily at 2:00 AM)
   2. API Usage Reset
      Schedule: 0 0 * * * (Daily at 12:00 AM (Midnight))
   3. Live Score Refresh
      Schedule: */5 * * * * (Every 5 minutes)

⏰ [SCHEDULER] Jobs will run according to schedule.
💡 [SCHEDULER] Tip: Keep the server running to ensure jobs execute.
```

### Console Logs

All jobs output detailed logs:
- 🧹 `[CACHE CLEANUP]` - Cache cleanup activities
- 🔄 `[API RESET]` - API counter resets
- 🔴 `[LIVE SCORES]` - Score refresh activities
- 🚀 `[SCHEDULER]` - Scheduler events

---

## 🛠️ Troubleshooting

### Jobs Not Running?

**Check 1:** Is server running?
```bash
# Backend should be running
cd backend
npm run dev
```

**Check 2:** Look for startup logs
```
🌟 RUNNING STARTUP JOBS
```

**Check 3:** Look for scheduler confirmation
```
✅ [SCHEDULER] All jobs registered successfully!
```

### Missed Scheduled Time?

**Not a problem!** Jobs will run on next server startup.

**Example:**
- Server was off at 2 AM (cache cleanup didn't run)
- You start server at 10 AM
- Cache cleanup runs immediately on startup
- Then scheduled for tomorrow 2 AM

---

## 🏭 Production Considerations

### Deployment (Railway, Render, Vercel Functions, etc.)

When deployed, servers typically run **24/7**, so:
- ✅ All jobs run at scheduled times
- ✅ No missed executions
- ✅ Consistent cache cleanup
- ✅ Real-time score updates

### Local Development

When running locally:
- ✅ Jobs run on startup (always fresh)
- ⚠️ Jobs run at scheduled time (only if server is on)
- 💡 Not critical - startup jobs handle catch-up

### Scaling

Current setup works for:
- Single server instance ✅
- Horizontal scaling with load balancer ✅
- Multiple servers can run jobs independently (MongoDB handles conflicts)

For **high-scale production** with multiple servers, consider:
- Using a dedicated job queue (Bull, BullMQ)
- Job locking to prevent duplicate execution
- Centralized job scheduler

---

## 📊 Performance Impact

### Resource Usage:

**Cache Cleanup:**
- Runs: Once daily (1-2 seconds)
- Impact: Minimal (database query + delete)

**API Reset:**
- Runs: Once daily (< 1 second)
- Impact: Negligible (4 database updates)

**Live Score Refresh:**
- Runs: Every 5 minutes
- Impact: Depends on # of live matches
  - 0 live matches → 0 API calls
  - 2 live matches → 2 API calls (cached for 30s)
  - Minimal impact (most requests hit cache)

**Total:** < 0.1% CPU usage, < 10 MB memory

---

## 🔮 Future Enhancements

### Phase 3 Possibilities:

1. **Admin Dashboard** - View job status, trigger manually
2. **Job History** - Track execution history in database
3. **Alerts** - Notify if jobs fail repeatedly
4. **Dynamic Schedules** - Adjust based on match timings
5. **Match-specific Updates** - Only refresh scores for active tournaments

---

## 📁 File Structure

```
backend/src/
├── jobs/
│   ├── cache-cleanup.job.js    (Cleanup expired cache)
│   ├── api-reset.job.js        (Reset API counters)
│   └── live-score.job.js       (Refresh live scores)
├── scheduler.js                 (Cron job registration)
└── server.js                    (Startup integration)
```

---

## ✅ Testing

### Manual Testing:

**Test startup jobs:**
```bash
# Restart server and watch console
cd backend
npm run dev

# Look for:
# 🌟 RUNNING STARTUP JOBS
# ✅ STARTUP JOBS COMPLETED
```

**Test scheduled jobs:**
```bash
# Wait 5 minutes and check for live score refresh:
# 🔴 [LIVE SCORES] Starting live score refresh job...
```

### Verify in MongoDB:

**Check API Usage Tracker:**
```javascript
db.ApiUsageTracker.find()
// Should show callsToday = 0 after reset
```

**Check Cache:**
```javascript
db.SeriesCache.find({ expiresAt: { $lt: new Date() } })
// Should return 0 results after cleanup
```

---

**Last Updated:** November 16, 2025

