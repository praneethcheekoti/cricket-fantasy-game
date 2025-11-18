# Cricket API Configuration Guide

## Required API Keys

Add these keys to your `backend/.env` file:

```env
# Cricket API Keys
CRICAPI_KEY=your_cricapi_key_here
RAPIDAPI_KEY=your_rapidapi_key_here
CRICKETDATA_KEY=your_cricketdata_key_here

# API Configuration
ENABLE_CRICAPI=true
ENABLE_RAPIDAPI=true
ENABLE_CRICBUZZ=true
ENABLE_CRICKETDATA=true
```

## Getting API Keys

### 1. CricAPI (Primary - Recommended)
- **URL:** https://cricapi.com/
- **Free Tier:** 100 requests/day
- **Steps:**
  1. Sign up for free account
  2. Navigate to API Dashboard
  3. Copy your API key
  4. Add to `.env` as `CRICAPI_KEY`

### 2. RapidAPI Cricket Live Data (Secondary)
- **URL:** https://rapidapi.com/cricketapilive/api/cricket-live-data
- **Free Tier:** 500 requests/month
- **Steps:**
  1. Sign up for RapidAPI account
  2. Subscribe to "Cricket Live Data" API (free tier)
  3. Copy your RapidAPI key
  4. Add to `.env` as `RAPIDAPI_KEY`

### 3. Cricbuzz Unofficial (Tertiary - No Key Required)
- **Type:** Unofficial/Web Scraping
- **Free Tier:** Unlimited (with respectful rate limiting)
- **Note:** No API key required, uses public data
- **Enable:** Set `ENABLE_CRICBUZZ=true`

### 4. CricketData.org (Backup)
- **URL:** https://cricketdata.org/
- **Free Tier:** 50 requests/day
- **Steps:**
  1. Sign up for account
  2. Get your API key
  3. Add to `.env` as `CRICKETDATA_KEY`

## API Usage Strategy

The system automatically selects the best API provider based on:
- Daily usage limits
- Reliability
- Request type (static data vs live scores)

**Priority Order:**
1. **CricAPI** - Static data (series, matches, squads)
2. **RapidAPI** - Live match scores (limited usage)
3. **Cricbuzz** - Burst live updates (unlimited)
4. **CricketData** - Backup for all data types

## Testing Without API Keys

For development/testing without API keys:

```env
# Disable all APIs (will return empty/mock data)
ENABLE_CRICAPI=false
ENABLE_RAPIDAPI=false
ENABLE_CRICBUZZ=false
ENABLE_CRICKETDATA=false
```

The system will gracefully handle missing API keys and show appropriate error messages.

