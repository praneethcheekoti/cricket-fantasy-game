# Environment Variables Setup Guide

## 📋 Required Environment Variables

Create a `.env` file in the `backend` directory with these variables:

### **Critical (Required)**

```bash
# Database Configuration
DATABASE_URL="mongodb://localhost:27017/cricket-fantasy"
# For MongoDB Atlas (Production):
# DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/cricket-fantasy"

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
# Generate with: openssl rand -base64 32

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:3000"
# Production: FRONTEND_URL="https://your-app.vercel.app"
```

### **For Player Stats (Recommended)**

```bash
# RapidAPI Key (REQUIRED for player stats)
# Get from: https://rapidapi.com
# Subscribe to: CrickkAPI (https://rapidapi.com/crickkapi/api/crickkapi)
RAPIDAPI_KEY=your_rapidapi_key_here
RAPIDAPI_HOST=cricbuzz-cricket.p.rapidapi.com
```

**⚠️ Without RAPIDAPI_KEY:**
- Players will show **0s** for all statistics
- Auction will still work, just without real player data

**✅ With RAPIDAPI_KEY:**
- Players will show **real career statistics**
- Better bidding decisions
- More engaging auction experience

### **Optional API Keys**

```bash
# CricketData API (Optional - for squad data)
# Get from: https://cricketdata.org/
CRICKETDATA_API_KEY=your_cricketdata_key_here

# CricAPI (Optional - alternative source)
# Get from: https://cricapi.com/
CRICAPI_KEY=your_cricapi_key_here
```

### **API Feature Flags**

```bash
# Enable/disable specific API providers
ENABLE_RAPIDAPI=true
ENABLE_CRICKETDATA=true
ENABLE_CRICAPI=true
ENABLE_CRICBUZZ=true
```

---

## 🚀 Quick Start (Local Development)

1. **Copy the template:**
   ```bash
   cd backend
   touch .env
   ```

2. **Add these minimum values:**
   ```bash
   DATABASE_URL="mongodb://localhost:27017/cricket-fantasy"
   JWT_SECRET="dev-secret-key-change-in-production"
   PORT=5000
   FRONTEND_URL="http://localhost:3000"
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

App will work, but player stats will show 0s.

---

## 🔑 How to Get RapidAPI Key

### Step 1: Sign Up
1. Go to https://rapidapi.com
2. Click **Sign Up** (free)
3. Complete registration

### Step 2: Subscribe to CrickkAPI
1. Search for "CrickkAPI" in RapidAPI marketplace
2. Or visit: https://rapidapi.com/crickkapi/api/crickkapi
3. Click **Subscribe to Test**
4. Select **Basic Plan** (Free tier available)

### Step 3: Get Your Key
1. After subscribing, go to **Endpoints**
2. Look for **X-RapidAPI-Key** in the code snippet
3. Copy the key value

### Step 4: Add to .env
```bash
RAPIDAPI_KEY=your_copied_key_here
```

### Step 5: Restart Server
```bash
npm run dev
```

---

## 🌐 Production Environment Setup

### Render
1. Go to Dashboard → Your Service → **Environment**
2. Click **Add Environment Variable**
3. Add each variable from `.env`
4. Click **Save Changes**

### Heroku
```bash
heroku config:set DATABASE_URL="your_mongo_url"
heroku config:set JWT_SECRET="your_secret"
heroku config:set RAPIDAPI_KEY="your_key"
heroku config:set FRONTEND_URL="https://your-app.vercel.app"
```

### Vercel (if deploying backend on Vercel)
1. Go to Project Settings → **Environment Variables**
2. Add each variable
3. Redeploy

### Railway
1. Go to your project → **Variables**
2. Add each environment variable
3. Deploy

---

## ✅ Verification

### Check if .env is loaded correctly:
```javascript
// In your code or in console
console.log('RAPIDAPI_KEY present:', !!process.env.RAPIDAPI_KEY);
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('JWT_SECRET present:', !!process.env.JWT_SECRET);
```

### Test API connection:
```bash
# Start server
npm run dev

# Check health endpoint
curl http://localhost:5000/api/health
```

---

## 🐛 Troubleshooting

### Problem: "No stats available" in production
**Solution:** Add `RAPIDAPI_KEY` to production environment

### Problem: CORS errors
**Solution:** Set `FRONTEND_URL` to match your frontend deployment URL

### Problem: Database connection fails
**Solution:** 
- Verify `DATABASE_URL` is correct
- For MongoDB Atlas, whitelist your IP
- Check network access settings

### Problem: Environment variables not loading
**Solution:**
- Ensure `.env` file is in `backend/` directory
- Restart the server after adding variables
- Check file is not named `.env.txt` or `.env.example`

---

## 🔒 Security Best Practices

1. **Never commit `.env` to Git**
   - Already in `.gitignore`
   - If accidentally committed, rotate all secrets immediately

2. **Use Strong JWT Secret**
   ```bash
   # Generate secure random string
   openssl rand -base64 32
   ```

3. **Different Secrets for Each Environment**
   - Local development: Can use simple secret
   - Production: Must use strong random secret

4. **Rotate API Keys Periodically**
   - Change JWT_SECRET every few months
   - Monitor API usage for suspicious activity

---

## 📊 API Usage & Limits

### RapidAPI (CrickkAPI)
- **Free Tier:** Check current limits on RapidAPI
- **Rate Limiting:** Handled automatically by our caching
- **Cache Duration:** Player stats cached for 7 days

### Best Practices:
- Stats are cached to minimize API calls
- Only fetches when player has no cached data
- Respects rate limits automatically

---

## 🎯 What Works Without API Keys

| Feature | Without RAPIDAPI_KEY | With RAPIDAPI_KEY |
|---------|---------------------|-------------------|
| User Authentication | ✅ | ✅ |
| Tournament Creation | ✅ | ✅ |
| Series Browsing | ✅ | ✅ |
| Auction System | ✅ | ✅ |
| Bidding | ✅ | ✅ |
| Player Stats | Shows 0s | Shows real stats |
| Match Scoring | ✅ | ✅ |
| Leaderboards | ✅ | ✅ |

**Bottom Line:** App works fully without RAPIDAPI_KEY, but player stats will show 0s.

---

## 📞 Need Help?

- **RapidAPI Support:** https://rapidapi.com/support
- **MongoDB Atlas Help:** https://www.mongodb.com/docs/atlas/
- **Render Support:** https://render.com/docs

---

**Status:** ✅ **Ready to Use**  
**Last Updated:** 2025-01-29

