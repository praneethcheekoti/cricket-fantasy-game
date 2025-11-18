# 🎯 Frontend Integration - Next Steps

## ✅ What's Complete

### Backend
- ✅ Full REST API with 26 endpoints
- ✅ Authentication (JWT)
- ✅ Tournament management
- ✅ Auction system
- ✅ Scoring & leaderboards
- ✅ Database (SQLite/MongoDB ready)

### Frontend 
- ✅ Beautiful UI generated from V0
- ✅ All pages created
- ✅ **API Client integrated** (`frontend/lib/api.ts`)
- ✅ **Auth Context added** (`frontend/contexts/AuthContext.tsx`)
- ✅ **Login page connected** to backend
- ✅ **Register page connected** to backend
- ✅ **Dashboard connected** to backend

---

## 🔧 Setup Instructions

### 1. Create Environment File

```bash
cd frontend

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local
echo "NEXT_PUBLIC_DEBUG=true" >> .env.local
```

### 2. Start Backend

In **Terminal 1**:
```bash
cd backend
npm install     # if not done
npm run dev
```

✅ Backend: `http://localhost:5000`

### 3. Start Frontend

In **Terminal 2**:
```bash
cd frontend
npm install     # if not done
npm run dev
```

✅ Frontend: `http://localhost:3000`

---

## 🧪 Test What's Working Now

### ✅ Test 1: Register User

1. Go to `http://localhost:3000`
2. Click **"Sign Up"**
3. Fill form:
   - Name: Test User
   - Email: test@example.com
   - Password: test123
4. Click **"Create Account"**

**Expected:** Redirects to dashboard, user created in backend

### ✅ Test 2: Login

1. Go to `http://localhost:3000/login`
2. Enter credentials from above
3. Click **"Login"**

**Expected:** Redirects to dashboard, shows "Welcome back, Test User"

### ✅ Test 3: Dashboard

1. Should show "Your Tournaments" section
2. Currently empty (no tournaments created yet)
3. Can see "Create Tournament" and "Join Tournament" cards

---

## 📝 Remaining Pages to Connect

### Priority 1: Core Game Flow

#### 1. **Tournament Create Page** 🟡
**File:** `frontend/app/tournament/create/page.tsx`

**Current Status:** Has UI but no backend connection

**Needs:**
- Fetch series from `/api/series` 
- Submit form to `/api/tournaments`
- Show generated tournament code
- Copy-to-clipboard functionality

**Key Changes Needed:**
```typescript
// Add at top
import { api } from '@/lib/api'

// Fetch series
const [series, setSeries] = useState([])
useEffect(() => {
  api.series.getAll().then(res => setSeries(res.data))
}, [])

// On submit
const handleCreate = async (formData) => {
  const response = await api.tournaments.create(formData)
  // Show code: response.data.code
}
```

---

#### 2. **Tournament Lobby Page** 🟡
**File:** `frontend/app/tournament/[id]/lobby/page.tsx`

**Current Status:** Has UI but no backend connection

**Needs:**
- Fetch tournament details from `/api/tournaments/:id`
- Show participants list
- Display scoring rules
- Lock rules button → `/api/tournaments/:id/lock-rules`
- Start auction button (creator only) → `/api/tournaments/:id/start-auction`

---

#### 3. **Auction Page** 🟡
**File:** `frontend/app/tournament/[id]/auction/page.tsx`

**Current Status:** Has UI but no backend connection

**Needs:**
- Fetch players from `/api/auction/:tournamentId/players`
- Place bids → `/api/auction/:tournamentId/bid`
- Show your team (right panel)
- Update wallet balance in real-time
- Show other teams tabs

**This is the most complex page!**

---

### Priority 2: Team Management

#### 4. **My Team Page** 🔴
**File:** `frontend/app/tournament/[id]/my-team/page.tsx`

**Needs:**
- Fetch team from `/api/auction/:tournamentId/my-team`
- Show all purchased players
- Select captain/vice-captain
- Submit selection → `/api/auction/:tournamentId/captain`

---

### Priority 3: Match Tracking

#### 5. **Matches Page** 🔴
**File:** `frontend/app/tournament/[id]/matches/page.tsx`

**Needs:**
- Get tournament to find seriesId
- Fetch matches from `/api/matches/series/:seriesId`
- For each match, show scores
- Live updates for ongoing matches

---

#### 6. **Leaderboard Page** 🔴
**File:** `frontend/app/tournament/[id]/leaderboard/page.tsx`

**Needs:**
- Fetch leaderboard from `/api/tournaments/:id/leaderboard`
- Show match-wise winners (with match dropdown)
- Show cumulative series standings
- Highlight user's rank

---

## 🛠️ How I Can Help

### Option 1: I Update All Pages
I can go through each remaining page and connect them to the backend. This will take ~15-20 minutes.

### Option 2: I Update One Page, You Follow Pattern
I update one complete page (e.g., Tournament Create), then you follow the same pattern for others. I'm here for questions!

### Option 3: Guided Step-by-Step
I guide you through updating each page, explaining each change.

**Which would you prefer?**

---

## 📚 Quick Reference

### API Client Usage Pattern

```typescript
'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

export default function YourPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await api.yourEndpoint.method()
      setData(response.data)
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

  // ... rest of component
}
```

### Auth Context Usage

```typescript
import { useAuth } from '@/contexts/AuthContext'

export default function YourPage() {
  const { user, token, isAuthenticated, logout } = useAuth()

  if (!isAuthenticated) {
    // Redirect or show login
  }

  // Use user data
  console.log(user.name, user.email)
}
```

---

## 🎯 Recommended Next Action

**I suggest starting with Tournament Create page** because:
1. It's relatively simple
2. You need it to create tournaments for testing
3. Once working, you can test the full flow

**Shall I update the Tournament Create page for you?** 

Just say "yes" and I'll:
1. Read the current Tournament Create page
2. Connect it to backend APIs
3. Add form handling
4. Show tournament code after creation
5. Add error handling

Then you can test creating your first real tournament! 🏆

---

## 📞 Ready When You Are!

**Your backend is 100% ready and tested.** ✅  
**Your frontend UI is beautiful and ready.** ✅  
**API connections are partially done.** 🟡  

**Just need to connect the dots!** 🔌

Let me know how you'd like to proceed! 🚀

