# 🔌 Frontend-Backend Integration Guide

## ✅ What's Been Connected

### 1. **API Client Created** ✅
- Location: `frontend/lib/api.ts`
- Centralized service for all backend endpoints
- Handles authentication headers automatically
- Type-safe responses with TypeScript

### 2. **Auth Context Added** ✅
- Location: `frontend/contexts/AuthContext.tsx`
- Global authentication state
- Login, Register, Logout functions
- Automatic token management

### 3. **Pages Updated** ✅
- **Login Page**: Now uses real backend `/api/auth/login`
- **Register Page**: Now uses real backend `/api/auth/register`
- **Dashboard Page**: Fetches tournaments from `/api/tournaments/user/list`
- **Layout**: Wrapped with AuthProvider for global auth state

### 4. **Environment Config** ✅
- `.env.example` created with API URL
- Need to create `.env.local` (see below)

---

## 🚀 Next Steps to Get Running

### Step 1: Create Environment File

Create `frontend/.env.local`:

```bash
# Copy from example
cp .env.example .env.local
```

Content:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_DEBUG=true
```

### Step 2: Install Dependencies (if not done)

```bash
cd frontend
npm install
# or
pnpm install
```

### Step 3: Start Backend

In a **separate terminal**:

```bash
cd backend
npm run dev
```

✅ Backend should be running on `http://localhost:5000`

### Step 4: Start Frontend

```bash
cd frontend
npm run dev
```

✅ Frontend should be running on `http://localhost:3000`

---

## 🧪 Testing the Integration

### Test 1: User Registration

1. Open `http://localhost:3000`
2. Click **"Sign Up"**
3. Fill in:
   - Name: `Test User`
   - Email: `test@example.com`
   - Password: `test123`
4. Click **"Create Account"**
5. Should redirect to Dashboard

**Expected Result:**
- Success toast appears
- Redirected to `/dashboard`
- User created in backend database

**Verify in Backend:**
```bash
cd backend
npx prisma studio
```
Check the `User` table for your new user.

### Test 2: User Login

1. Go to `http://localhost:3000/login`
2. Enter the credentials you just created
3. Click **"Login"**

**Expected Result:**
- Success toast: "Welcome back!"
- Redirected to Dashboard
- User info displayed

### Test 3: Create Tournament

1. From Dashboard, click **"Create Tournament"**
2. Tournament creation page should load
3. You should see series dropdown (fetched from backend)

**Note:** Tournament creation page needs more work (see below)

### Test 4: Join Tournament

1. From Dashboard, click **"Join Tournament"**
2. Enter a valid tournament code
3. Click **"Join"**

**Expected Result:**
- Success toast if code is valid
- Error toast if code is invalid

---

## 📂 Files Still Need Backend Integration

These pages exist but still need API connections:

### 🟡 **Tournament Create Page**
**File:** `frontend/app/tournament/create/page.tsx`

**Needs:**
- Fetch series list from `/api/series`
- Submit tournament creation to `/api/tournaments`
- Show generated tournament code

### 🟡 **Tournament Lobby Page**
**File:** `frontend/app/tournament/[id]/lobby/page.tsx`

**Needs:**
- Fetch tournament details from `/api/tournaments/:id`
- Show participants
- Display scoring rules
- Lock rules functionality
- Start auction button

### 🟡 **Auction Page**
**File:** `frontend/app/tournament/[id]/auction/page.tsx`

**Needs:**
- Fetch players from `/api/auction/:tournamentId/players`
- Place bids `/api/auction/:tournamentId/bid`
- Show wallet balance
- Display player stats

### 🟡 **My Team Page**
**File:** `frontend/app/tournament/[id]/my-team/page.tsx`

**Needs:**
- Fetch team from `/api/auction/:tournamentId/my-team`
- Set captain/vice-captain `/api/auction/:tournamentId/captain`

### 🟡 **Matches Page**
**File:** `frontend/app/tournament/[id]/matches/page.tsx`

**Needs:**
- Fetch matches from `/api/matches/series/:seriesId`
- Show live scores `/api/matches/:id/scores`

### 🟡 **Leaderboard Page**
**File:** `frontend/app/tournament/[id]/leaderboard/page.tsx`

**Needs:**
- Fetch leaderboard from `/api/tournaments/:id/leaderboard`
- Show match-wise and cumulative standings

---

## 🛠️ How to Connect Remaining Pages

For each page above, follow this pattern:

### Example: Tournament Create Page

```typescript
'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

export default function CreateTournamentPage() {
  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchSeries()
  }, [])

  const fetchSeries = async () => {
    try {
      const response = await api.series.getAll()
      setSeries(response.data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (formData: any) => {
    try {
      const response = await api.tournaments.create(formData)
      
      toast({
        title: 'Success!',
        description: `Tournament created! Code: ${response.data.code}`
      })
      
      // Show code in a modal or navigate
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  // ... rest of component
}
```

---

## 🔧 Common Issues & Solutions

### Issue: CORS Error

**Error:** `Access to fetch blocked by CORS policy`

**Solution:** Backend already has CORS enabled. Make sure:
1. Backend is running on port 5000
2. Frontend environment variable is correct: `NEXT_PUBLIC_API_URL=http://localhost:5000/api`

### Issue: 401 Unauthorized

**Error:** `Authentication required`

**Solution:**
- User needs to be logged in
- Token is stored in localStorage
- Check if token is valid (not expired)
- Re-login if needed

### Issue: Network Error

**Error:** `Failed to fetch` or `Network request failed`

**Solution:**
1. Check if backend is running: `curl http://localhost:5000/api/health`
2. Verify API URL in `.env.local`
3. Check browser console for details

### Issue: No Tournaments Showing

**Possible Causes:**
1. User hasn't created/joined any tournaments yet
2. API endpoint error
3. Backend database is empty

**Debug:**
```javascript
// In dashboard page, add console.log
const fetchTournaments = async (token: string) => {
  try {
    const response = await api.tournaments.getUserTournaments()
    console.log('Tournaments:', response.data) // ADD THIS
    setTournaments(response.data || [])
  } catch (error) {
    console.error('Error:', error) // ADD THIS
  }
}
```

---

## 📊 API Client Reference

All available API methods in `frontend/lib/api.ts`:

```typescript
// Authentication
api.auth.register({ name, email, password })
api.auth.login({ email, password })

// Series
api.series.getAll()
api.series.getById(id)

// Tournaments
api.tournaments.create({ name, seriesId, scoringRules })
api.tournaments.join(code)
api.tournaments.getById(id)
api.tournaments.getUserTournaments()
api.tournaments.updateRules(id, scoringRules)
api.tournaments.lockRules(id)
api.tournaments.startAuction(id)
api.tournaments.getLeaderboard(id, matchId?)

// Auction
api.auction.getPlayers(tournamentId)
api.auction.placeBid(tournamentId, playerId, amount)
api.auction.getAllTeams(tournamentId)
api.auction.getMyTeam(tournamentId)
api.auction.setCaptain(tournamentId, captainId, viceCaptainId)

// Matches
api.matches.getSeriesMatches(seriesId)
api.matches.getById(id)
api.matches.getScores(id)
```

---

## 🎯 Quick Checklist

Before testing, ensure:

- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] `.env.local` created with correct API URL
- [ ] Database initialized (`cd backend && npx prisma migrate dev`)
- [ ] Sample series seeded (`node -e "require('./src/services/cricket-api.service').syncSeries()"`)
- [ ] Browser console open (F12) for debugging

---

## 🚀 Priority: What to Connect Next

### High Priority (Core Features)
1. ✅ **Auth (Login/Register)** - DONE
2. ✅ **Dashboard** - DONE
3. 🟡 **Tournament Create** - Needs work
4. 🟡 **Tournament Lobby** - Needs work
5. 🟡 **Auction** - Needs work

### Medium Priority
6. 🔴 **My Team** - Not started
7. 🔴 **Matches** - Not started
8. 🔴 **Leaderboard** - Not started

### Recommended Order:
1. Fix Tournament Create page (to generate tournaments)
2. Fix Tournament Lobby (to see tournament details)
3. Fix Auction page (to buy players)
4. Fix My Team page (to see your players)
5. Fix Matches & Leaderboard (to see scores)

---

## 💡 Development Tips

### Use Browser DevTools

**Network Tab:**
- See all API requests
- Check request/response data
- Verify status codes

**Console Tab:**
- Check for JavaScript errors
- View API responses
- Debug issues

### Test API Directly

Use Postman or curl:

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Get series (with token)
curl http://localhost:5000/api/series \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Monitor Backend Logs

Keep terminal with backend visible:
```bash
cd backend
npm run dev
```

You'll see all API requests and errors.

---

## 📞 Need Help?

If you encounter issues:

1. **Check Backend Logs** - See what errors backend is throwing
2. **Check Browser Console** - See frontend errors
3. **Check Network Tab** - See API requests/responses
4. **Verify Database** - Use `npx prisma studio` to check data

---

**Ready to connect the remaining pages!** 🎉

Start with Tournament Create page - let me know when you're ready and I can help update it! 🚀

