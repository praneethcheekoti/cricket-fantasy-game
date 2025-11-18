# ⚡ Cricket Fantasy Game - Quick Start

Get up and running in **5 minutes**!

---

## 🚀 Backend Setup (2 minutes)

### Option A: Automated Setup (Recommended)

```bash
cd backend
node scripts/setup.js
npm run dev
```

**Done!** Backend running on `http://localhost:5000` ✅

---

### Option B: Manual Setup

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
node -e "require('./src/services/cricket-api.service').syncSeries()"
npm run dev
```

---

## 🎨 Frontend Setup (3 minutes)

### Step 1: Copy the Prompt

Open this file:
```
backend/FRONTEND_PROMPT.md
```

### Step 2: Generate UI

Go to one of these AI tools:
- **V0.dev**: https://v0.dev (Vercel - Best for Next.js)
- **Bolt.new**: https://bolt.new (StackBlitz - Full stack)
- **Claude**: https://claude.ai (with artifacts enabled)

Paste the entire prompt and let it generate!

### Step 3: Use Generated Code

Copy the generated code to:
```
frontend/
```

Then:
```bash
cd frontend
npm install
npm run dev
```

**Done!** Frontend running on `http://localhost:3000` ✅

---

## ✅ Verify Everything Works

### 1. Test Backend

Open browser: `http://localhost:5000/api/health`

You should see:
```json
{
  "status": "ok",
  "message": "Cricket Fantasy API is running"
}
```

### 2. View Database

```bash
cd backend
npx prisma studio
```

Opens GUI at `http://localhost:5555` showing:
- 4 sample cricket series
- Empty users, tournaments (ready for testing)

### 3. Test Frontend

Open browser: `http://localhost:3000`

You should see:
- Landing page with "Create Tournament" button
- Login/Register options
- Cricket-themed design

---

## 🎮 First Tournament (5 minutes)

### 1. Register
- Click "Sign Up"
- Enter name, email, password
- You're logged in!

### 2. Create Tournament
- Click "Create Tournament"
- Select "India vs Australia ODI Series 2024"
- Review default scoring rules (or customize)
- Click "Create"
- **Copy the tournament code** (e.g., `ABC123XY`)

### 3. Invite Friend
- Share code with friend (or use incognito window)
- Friend clicks "Join Tournament"
- Enters code
- They're in!

### 4. Lock Rules
- Both review rules
- Both click "Lock Rules"
- Creator sees "Start Auction" button

### 5. Auction
- Creator clicks "Start Auction"
- Players appear with stats
- Place bids (increments of Rs 10L)
- Build your team!

### 6. Set Captain
- Go to "My Team"
- Select Captain (2x points)
- Select Vice-Captain (1.5x points)

### 7. Wait for Match
- Real match happens
- System calculates points
- Check leaderboard!

---

## 🔧 Common Issues

### Backend port already in use
```bash
# Change port in backend/.env
PORT=3001
```

### Database errors
```bash
cd backend
rm prisma/dev.db
npx prisma migrate reset
```

### Frontend can't connect to backend
- Ensure backend is running on port 5000
- Check frontend API URL configuration
- Look for CORS errors in console

---

## 📚 Next Steps

### Learn More:
- **Full Setup Guide**: `SETUP.md`
- **API Documentation**: `backend/README.md`
- **Project Status**: `PROJECT_STATUS.md`
- **Main README**: `README.md`

### Customize:
- Modify scoring rules in UI
- Change default values in `backend/src/utils/tournament.utils.js`
- Adjust tier prices in `backend/src/services/auction.service.js`
- Update UI colors/theme in frontend

### Deploy:
- Backend: Vercel, Railway, AWS
- Frontend: Vercel, Netlify
- Database: MongoDB Atlas

---

## 🎯 Cheat Sheet

### Backend Commands
```bash
cd backend
npm run dev              # Start server
npx prisma studio        # View database GUI
npx prisma migrate dev   # Create new migration
npm run switch:mongodb   # Switch to MongoDB
```

### Frontend Commands
```bash
cd frontend
npm run dev              # Start dev server
npm run build            # Production build
npm start                # Start production
```

### Test API with curl
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","password":"pass123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@test.com","password":"pass123"}'

# Get series (with auth token)
curl http://localhost:5000/api/series \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🎉 You're Ready!

Everything you need to know is here. Now go build and play! 🏏🚀

**Have fun creating your cricket fantasy tournaments!** 🎮

---

Questions? Check `SETUP.md` or `README.md` for detailed guides.

