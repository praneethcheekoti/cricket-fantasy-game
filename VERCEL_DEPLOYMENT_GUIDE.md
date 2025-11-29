# 🚀 Vercel Frontend Deployment Guide

## Prerequisites
- ✅ Backend already deployed on Render
- ✅ GitHub account (recommended) or Vercel CLI
- ✅ Your Render backend URL

---

## Method 1: Deploy via Vercel Dashboard (Easiest)

### Step 1: Push to GitHub (if not already)
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 2: Import to Vercel

1. **Go to Vercel:**
   - Visit: https://vercel.com/new
   - Sign in with GitHub

2. **Import Repository:**
   - Click "Import Project"
   - Select your repository
   - Click "Import"

3. **Configure Project:**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `frontend` ⚠️ **IMPORTANT!**
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)

4. **Environment Variables:**
   Click "Environment Variables" and add:
   
   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_API_URL` | `https://your-backend-app.onrender.com/api` |
   
   ⚠️ **Replace with your actual Render backend URL!**

5. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes for build
   - Your app will be live at: `https://your-app-name.vercel.app`

---

## Method 2: Deploy via Vercel CLI

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Navigate to Frontend
```bash
cd frontend
```

### Step 3: Deploy
```bash
vercel
```

Follow the prompts:
- **Set up and deploy:** Yes
- **Which scope:** Your account
- **Link to existing project:** No
- **Project name:** (enter your project name)
- **Directory:** `./` (you're already in frontend)
- **Override settings:** No

### Step 4: Add Environment Variable
```bash
vercel env add NEXT_PUBLIC_API_URL
```
Enter your Render backend URL: `https://your-backend-app.onrender.com/api`

### Step 5: Deploy to Production
```bash
vercel --prod
```

---

## Post-Deployment Steps

### 1. Update Backend CORS

Your backend needs to allow requests from your new Vercel URL.

**On Render Dashboard:**
- Go to your backend service
- Environment Variables
- Update `FRONTEND_URL` to: `https://your-app-name.vercel.app`
- Or edit `backend/src/server.js` CORS settings:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-app-name.vercel.app', // Add this
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));
```

### 2. Test Your Deployment

Visit: `https://your-app-name.vercel.app`

Test:
- ✅ Registration page loads
- ✅ Can register new user
- ✅ Can login
- ✅ Dashboard loads
- ✅ Can create tournament

### 3. Set Custom Domain (Optional)

In Vercel Dashboard:
- Go to your project
- Settings → Domains
- Add your custom domain

---

## Common Issues & Solutions

### ❌ "CORS Error"
**Solution:** Add your Vercel URL to backend CORS (see above)

### ❌ "API Request Failed"
**Solution:** Check `NEXT_PUBLIC_API_URL` environment variable is correct

### ❌ "Build Failed"
**Solution:** 
- Check build logs in Vercel dashboard
- Ensure `Root Directory` is set to `frontend`
- Verify all dependencies in `package.json`

### ❌ "Environment Variable Not Working"
**Solution:** 
- Must start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding env vars

---

## Automatic Deployments

✅ **Every push to `main` branch will auto-deploy!**

To disable:
- Vercel Dashboard → Project Settings → Git
- Uncheck "Production Branch"

---

## Useful Commands

```bash
# Check deployment status
vercel ls

# View logs
vercel logs

# Open project in browser
vercel open

# Remove deployment
vercel remove your-project-name
```

---

## What's Your Render Backend URL?

You need to get it from Render:
1. Go to https://dashboard.render.com
2. Click on your backend service
3. Copy the URL (looks like: `https://your-app-name.onrender.com`)
4. Add `/api` at the end: `https://your-app-name.onrender.com/api`

Use this as `NEXT_PUBLIC_API_URL` in Vercel!

---

## Need Help?

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Vercel Discord:** https://vercel.com/discord

---

## Quick Checklist

- [ ] Backend is running on Render
- [ ] Got backend URL from Render
- [ ] Pushed code to GitHub (if using dashboard method)
- [ ] Created Vercel account
- [ ] Set Root Directory to `frontend`
- [ ] Added `NEXT_PUBLIC_API_URL` environment variable
- [ ] Deployed successfully
- [ ] Updated backend CORS with Vercel URL
- [ ] Tested registration & login
- [ ] Celebrated! 🎉


