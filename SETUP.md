# 🏏 Cricket Fantasy Game - Complete Setup Guide

## 📁 Project Overview

This is a full-stack cricket fantasy game with:
- **Backend**: Node.js + Express + Prisma (SQLite/MongoDB)
- **Frontend**: React/Next.js (to be generated via AI UI tool)

## 🎯 Architecture

```
Project Root/
├── backend/           # Node.js API (COMPLETE ✅)
│   ├── src/
│   ├── prisma/
│   └── package.json
└── frontend/          # React UI (Generate with AI tool)
    └── (to be created)
```

---

## 🚀 STEP 1: Backend Setup

### 1.1 Install Dependencies

```bash
cd backend
npm install
```

### 1.2 Create Environment File

```bash
cp .env.example .env
```

Edit `.env` if needed (defaults work fine for local development)

### 1.3 Initialize Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 1.4 Seed Sample Data

```bash
node -e "require('./src/services/cricket-api.service').syncSeries()"
```

This creates sample series for India vs Australia, Women's Ashes, etc.

### 1.5 Start Backend Server

```bash
npm run dev
```

✅ Backend running on `http://localhost:5000`

Test it: Open browser to `http://localhost:5000/api/health`

---

## 🎨 STEP 2: Generate Frontend with AI

### 2.1 Use the AI UI Generator Prompt

Copy the prompt from below and paste it into your AI UI generator (V0, Bolt.new, Claude, etc.):

---

**[COPY THIS ENTIRE PROMPT]**

```
Build a modern, responsive Cricket Fantasy Game web application using React/Next.js and Tailwind CSS.

## PAGES & FEATURES NEEDED:

### 1. HOME PAGE / LANDING
- Hero section with "Create Tournament" and "Join Tournament" buttons
- Brief explanation of how the game works
- Modern cricket-themed design

### 2. AUTH PAGES
- Login page (email + password)
- Registration page (name, email, password)
- Simple, clean forms

### 3. DASHBOARD (After Login)
- Show user's active tournaments (as cards)
- "Create New Tournament" button
- "Join Tournament" button (opens modal for code entry)
- User's wallet balance display (Rs 100 Cr default)

### 4. CREATE TOURNAMENT PAGE
- Dropdown to select cricket series (fetch from API: GET /api/series)
- Tournament name input
- Display comprehensive scoring configuration form with these categories:
  * BATTING: Runs (per run), Fours, Sixes, 50s, 100s, Strike Rate bonuses, Duck penalty
  * BOWLING: Wickets, Maidens, Economy Rate bonuses, 3-wicket haul, 5-wicket haul
  * FIELDING: Catches, Run-outs, Stumpings
  * CAPTAIN/VICE-CAPTAIN: Captain multiplier (2x), Vice-captain multiplier (1.5x), Enable/disable toggle
  * AWARDS: Man of the Match, Player of the Series
  * TEAM COMPOSITION (optional): Min batsmen, bowlers, all-rounders, wicket-keepers
- All fields should have default values pre-filled
- "Create Tournament" button → generates shareable code
- Show generated tournament code prominently with copy button

### 5. TOURNAMENT LOBBY PAGE (Before Lock-in)
- Tournament details at top (name, series, code)
- List of joined participants
- Scoring rules display (accordion/tabs to show all categories)
- "Edit Rules" button (only for creator)
- Each participant has "Lock Rules" checkbox
- Once ALL participants lock → "Start Auction" button appears

### 6. AUCTION PAGE
- Split screen:
  * LEFT: Current player bidding card showing:
    - Player photo placeholder
    - Player name, role, tier (A/B/C/D)
    - Stats tabs: "Overall International" | "vs Opposition" | "Home/Away Split"
    - Stats should show: Matches, Runs/Wickets, Average, Strike Rate, etc.
    - Current bid amount
    - Bid input + "Place Bid" button
  * RIGHT: 
    - YOUR TEAM section (cards of purchased players with price)
    - Your wallet balance (updates live)
    - Tabs to view other teams
- Player queue at bottom showing upcoming players
- Auto-advance to next player after purchase

### 7. MY TEAM PAGE (Post-Auction)
- Display all purchased players as cards
- If captain/vice-captain enabled: Dropdown on each card to designate C/VC
- Total team cost
- Remaining wallet balance

### 8. MATCH CENTER / LIVE SCORING
- Series match schedule/tabs
- For each match:
  * Live score display (if match in progress)
  * Player-wise fantasy points table
  * Real-time leaderboard showing:
    - Rank, Team Owner Name, Match Points
  * Cumulative leaderboard (series total)

### 9. LEADERBOARD PAGE
- Two tabs: "Match-wise" | "Overall Series"
- Match-wise: Dropdown to select match, show winners
- Overall: Cumulative points, winner highlighted

## DESIGN REQUIREMENTS:
- Modern, clean UI with cricket green/white/blue theme
- Mobile-responsive (works on phones)
- Loading states for API calls
- Toast notifications for actions (bid placed, rules locked, etc.)
- Smooth transitions and animations
- Icons for batting/bowling/fielding stats

## API INTEGRATION STRUCTURE:
All API calls should use these endpoints (assume base URL: http://localhost:5000/api):

- POST /auth/register
- POST /auth/login
- GET /series (list all available series)
- POST /tournaments (create tournament)
- POST /tournaments/:id/join (join with code)
- GET /tournaments/:id (get tournament details)
- PUT /tournaments/:id/rules (update rules)
- POST /tournaments/:id/lock-rules (participant locks rules)
- GET /tournaments/:id/players (get players for auction)
- POST /tournaments/:id/bid (place bid)
- GET /tournaments/:id/teams (get all teams)
- GET /tournaments/:id/matches (get matches in series)
- GET /matches/:id/scores (get live scores)
- GET /tournaments/:id/leaderboard (get standings)

Use axios or fetch for API calls. Show loading spinners during API calls. Handle errors gracefully with toast messages.

Build this as a complete, production-ready application with proper state management (Context API or Zustand).
```

---

### 2.2 Copy Generated Code

Once the AI generates the frontend code:

1. Create `frontend` directory in project root
2. Copy all generated files into `frontend/`
3. Install dependencies:

```bash
cd frontend
npm install
```

### 2.3 Start Frontend

```bash
npm run dev
```

Frontend typically runs on `http://localhost:3000`

---

## 🔗 STEP 3: Connect Frontend to Backend

The frontend should automatically connect to `http://localhost:5000/api` (as specified in the prompt).

If using Next.js, you can create a `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## ✅ STEP 4: Test the Complete Flow

### 4.1 Register User

1. Go to frontend URL
2. Click "Sign Up"
3. Register with email/password

### 4.2 Create Tournament

1. Dashboard → "Create Tournament"
2. Select series (e.g., "India vs Australia ODI 2024")
3. Enter tournament name
4. Review/edit scoring rules
5. Click "Create"
6. Copy tournament code

### 4.3 Invite Friends

1. Share tournament code with friends
2. They join via "Join Tournament" with the code

### 4.4 Lock Rules

1. All participants review rules
2. Each clicks "Lock Rules"
3. Once all locked, creator starts auction

### 4.5 Auction

1. Players appear one by one
2. Place bids (increments of Rs 10L)
3. Highest bidder gets the player
4. Watch wallet balance update

### 4.6 Set Captain/Vice-Captain

1. Go to "My Team"
2. Designate captain (2x points)
3. Designate vice-captain (1.5x points)

### 4.7 Watch Matches

1. Real matches happen
2. System calculates points
3. Check leaderboard for rankings

---

## 🗄️ Database Migration (SQLite → MongoDB)

When ready to scale:

```bash
cd backend
npm run switch:mongodb
```

Update `.env`:
```env
DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/cricket-fantasy"
```

```bash
npx prisma generate
npx prisma db push
```

---

## 📱 Mobile Apps (Future)

To extend to Android/iOS:

1. Use React Native with same backend
2. Or wrap Next.js frontend with Capacitor
3. Backend APIs remain identical

---

## 🐛 Troubleshooting

### Backend won't start
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Database errors
```bash
cd backend
rm prisma/dev.db
npx prisma migrate reset
```

### Frontend won't connect to backend
- Check backend is running on port 5000
- Check CORS is enabled (already configured)
- Verify API_URL in frontend env

---

## 🎓 Learning Resources

- **Prisma**: https://www.prisma.io/docs
- **Express**: https://expressjs.com
- **Next.js**: https://nextjs.org/docs
- **React**: https://react.dev

---

## 🤝 Need Help?

- Backend API docs: `backend/README.md`
- API testing: Use Postman/Insomnia with the endpoints
- Database viewer: `npx prisma studio` (opens GUI)

---

Happy Building! 🚀🏏

