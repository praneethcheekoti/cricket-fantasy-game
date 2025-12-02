# 🚀 Production Deployment Checklist

## ✅ Before Deploying to Production

### 1. Environment Variables Setup

Make sure these are set in your production environment:

#### **Critical (Required)**
- [ ] `DATABASE_URL` - MongoDB connection string
- [ ] `JWT_SECRET` - Strong random secret (generate with `openssl rand -base64 32`)
- [ ] `FRONTEND_URL` - Your frontend deployment URL (e.g., `https://your-app.vercel.app`)

#### **For Player Stats (Recommended)**
- [ ] `RAPIDAPI_KEY` - Get from https://rapidapi.com (subscribe to CrickkAPI)
  - **Without this:** Players will show 0s for all stats
  - **With this:** Real player career statistics will be displayed

#### **Optional (For Additional Data Sources)**
- [ ] `CRICKETDATA_API_KEY` - For squad data (https://cricketdata.org/)
- [ ] `CRICAPI_KEY` - Alternative API (https://cricapi.com/)

---

## 📋 Backend Deployment (Render / Heroku / Railway)

### Step 1: Prepare Backend
```bash
cd backend
npm install
npx prisma generate
```

### Step 2: Set Environment Variables

#### On Render:
1. Go to Dashboard → Your Service → Environment
2. Add each variable from `.env.example`
3. Click **Save Changes**

#### On Heroku:
```bash
heroku config:set DATABASE_URL="your_mongo_url" --app your-app-name
heroku config:set JWT_SECRET="your_secret" --app your-app-name
heroku config:set RAPIDAPI_KEY="your_key" --app your-app-name
heroku config:set FRONTEND_URL="https://your-app.vercel.app" --app your-app-name
```

#### On Railway:
1. Go to your project → Variables
2. Add each environment variable
3. Deploy

### Step 3: Deploy
```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

### Step 4: Verify Backend
Test your backend API:
```bash
curl https://your-backend.onrender.com/api/health
```

---

## 🌐 Frontend Deployment (Vercel / Netlify)

### Step 1: Set Environment Variables

Create `.env.local` in frontend directory:
```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

### Step 2: Update API URL in Frontend

In `frontend/lib/api.ts`, ensure the base URL is correct:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
```

### Step 3: Deploy to Vercel
```bash
cd frontend
vercel --prod
```

Or connect your GitHub repo to Vercel for auto-deployment.

### Step 4: Update Backend CORS

Update `FRONTEND_URL` in backend environment variables to match your Vercel deployment URL.

---

## 🧪 Post-Deployment Testing

### 1. Test Authentication
- [ ] Sign up works
- [ ] Login works
- [ ] JWT tokens are issued

### 2. Test Series & Tournaments
- [ ] Can view series
- [ ] Can create tournament
- [ ] Can join tournament with code

### 3. Test Auction
- [ ] Auction loads properly
- [ ] Players show stats (or 0s if RAPIDAPI_KEY not set)
- [ ] Bidding works
- [ ] Wallet balance updates

### 4. Test Match Center
- [ ] Matches are listed
- [ ] Can add scores
- [ ] Leaderboard updates

---

## ⚠️ Common Production Issues & Fixes

### Issue 1: "No stats available" in production
**Cause:** Missing `RAPIDAPI_KEY` environment variable  
**Fix:** Add `RAPIDAPI_KEY` to production environment (see above)  
**Alternative:** Use the fix in `PRODUCTION-STATS-ISSUE-FIX.md` to show 0s instead

### Issue 2: CORS errors
**Cause:** `FRONTEND_URL` not set or incorrect  
**Fix:** Set `FRONTEND_URL` to match your frontend deployment URL

### Issue 3: JWT authentication fails
**Cause:** `JWT_SECRET` not set or different from frontend  
**Fix:** Ensure `JWT_SECRET` is set in backend environment

### Issue 4: Database connection fails
**Cause:** `DATABASE_URL` incorrect or MongoDB not accessible  
**Fix:** 
- Use MongoDB Atlas for production (https://www.mongodb.com/atlas)
- Whitelist your hosting provider's IP in MongoDB Atlas
- Verify connection string format

### Issue 5: Players not loading in auction
**Cause:** Squad data API limits exceeded or not available  
**Fix:** 
- Check backend logs
- Verify API keys are set
- May need to wait 24 hours for API limits to reset

---

## 🔒 Security Checklist

- [ ] `JWT_SECRET` is strong and unique (not the example value)
- [ ] `.env` file is in `.gitignore` (never committed)
- [ ] All API keys are kept secret
- [ ] Database credentials are secure
- [ ] CORS is properly configured (only allows your frontend)

---

## 📊 Monitoring & Maintenance

### Backend Logs
- Check Render/Heroku logs regularly
- Look for API errors or rate limit warnings

### Database
- Monitor MongoDB Atlas for connection issues
- Set up alerts for high usage

### API Usage
- Monitor RapidAPI dashboard for quota usage
- Upgrade plan if needed

---

## 🎯 Performance Optimization (Optional)

After successful deployment:

1. **Enable Caching:**
   - Player stats are already cached (7 days)
   - Match data cached (30 minutes for live matches)

2. **CDN for Frontend:**
   - Vercel provides CDN automatically
   - No additional setup needed

3. **Database Indexing:**
   - Prisma handles indexes automatically
   - No manual optimization needed

---

## 📞 Support & Resources

- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **MongoDB Atlas:** https://www.mongodb.com/docs/atlas/
- **RapidAPI:** https://docs.rapidapi.com/

---

## ✅ Final Deployment Status

Once everything is checked:

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Environment variables set
- [ ] All tests pass
- [ ] CORS configured correctly
- [ ] Player stats working (or showing 0s gracefully)

**You're live! 🎉**

---

**Last Updated:** 2025-01-29  
**Status:** Ready for Production


