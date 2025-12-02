# Match & Leaderboard Improvements

## 🎯 Overview
This document summarizes two major improvements to the leaderboard system:
1. **Match-wise breakdown for all users** (not just current user)
2. **Match descriptions in dropdowns** (e.g., "1st ODI", "2nd Test")

---

## ✅ Changes Made

### **1. Database Schema Updates**

#### **Add `matchDesc` to Match Model**
**File:** `backend/prisma/schema.prisma`

```prisma
model Match {
  id            String         @id @default(auto()) @map("_id") @db.ObjectId
  seriesId      String
  matchNumber   Int
  matchDesc     String?        // ← NEW: "1st ODI", "2nd Test", etc.
  team1         String
  team2         String
  // ... other fields
}
```

**Migration Required:**
```bash
cd backend
npx prisma db push
```

---

### **2. Backend Updates**

#### **A. Store matchDesc When Creating Matches**
**File:** `backend/src/controllers/match.controller.js`

```javascript
// Extract matchDesc from API metadata
let matchDesc = null;
if (apiMatch.metadata) {
  try {
    const metadata = typeof apiMatch.metadata === 'string' 
      ? JSON.parse(apiMatch.metadata) 
      : apiMatch.metadata;
    matchDesc = metadata.matchDesc || null; // "1st ODI", "2nd Test", etc.
  } catch (e) {
    console.warn('⚠️  Could not parse match metadata');
  }
}

// Create Match with matchDesc
match = await prisma.match.create({
  data: {
    matchDesc: matchDesc, // ← NEW
    team1: apiMatch.team1,
    team2: apiMatch.team2,
    // ... other fields
  }
});
```

**Result:** Match records now have `matchDesc` like "1st ODI", "2nd Test", "Final".

---

#### **B. Support User Selection in Match-wise Breakdown**
**File:** `backend/src/controllers/tournament.controller.js`

```javascript
async getMatchWiseBreakdown(req, res) {
  const { tournamentId, matchId } = req.params;
  const { userId } = req.query; // ← NEW: Accept userId from query
  const currentUserId = req.userId; // From auth middleware
  
  // Use provided userId or default to current user
  const targetUserId = userId || currentUserId;

  const breakdown = await leaderboardService.getMatchWiseBreakdown(
    tournamentId,
    matchId,
    targetUserId // ← Pass selected user
  );
}
```

**Result:** Frontend can request any user's match breakdown by passing `?userId={id}`.

---

#### **C. Add Participants Endpoint**
**File:** `backend/src/controllers/tournament.controller.js`

```javascript
async getTournamentParticipants(req, res) {
  const { tournamentId } = req.params;

  const participants = await prisma.team.findMany({
    where: { tournamentId },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: {
      user: { name: 'asc' }
    }
  });

  res.json({
    success: true,
    data: participants.map(p => ({
      userId: p.user.id,
      userName: p.user.name,
      userEmail: p.user.email,
      teamId: p.id,
      teamName: p.name
    }))
  });
}
```

**Route:** `GET /api/tournaments/:tournamentId/participants`

**Result:** Returns list of all users in the tournament for dropdown population.

---

#### **D. Add Route**
**File:** `backend/src/routes/tournament.routes.js`

```javascript
// Get all participants in tournament (for dropdown in match-wise breakdown)
router.get('/:tournamentId/participants', authMiddleware, tournamentController.getTournamentParticipants);
```

---

### **3. Frontend Updates**

#### **A. Add State for User Selection**
**File:** `frontend/app/tournament/[id]/leaderboard/page.tsx`

```javascript
const [participants, setParticipants] = useState<any[]>([])
const [selectedUserId, setSelectedUserId] = useState<string>('')
const [currentUserId, setCurrentUserId] = useState<string>('')
```

---

#### **B. Fetch Participants on Load**
```javascript
// Fetch participants (for user dropdown)
const participantsRes = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/tournaments/${params.id}/participants`,
  {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  }
)
const participantsData = await participantsRes.json()
setParticipants(participantsData.data || [])

// Get current user ID from token
const token = localStorage.getItem('token')
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]))
  const userId = payload.userId
  setCurrentUserId(userId)
  setSelectedUserId(userId) // Default to current user
}
```

---

#### **C. Update API Call to Include userId**
```javascript
const fetchMatchWiseBreakdown = async (matchId: string, userId: string) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/tournaments/${params.id}/leaderboard/match/${matchId}?userId=${userId}`,
    {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }
  )
}
```

---

#### **D. Add User Dropdown to UI**
```jsx
{/* User Selection Dropdown */}
<div className="space-y-2">
  <label className="text-sm font-medium">Select User</label>
  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
    <SelectTrigger>
      <SelectValue placeholder="Select a user" />
    </SelectTrigger>
    <SelectContent>
      {participants.map((participant) => (
        <SelectItem key={participant.userId} value={participant.userId}>
          {participant.userName}
          {participant.userId === currentUserId && ' (You)'}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

---

#### **E. Use matchDesc in Match Dropdown**
```jsx
{/* Match Selection Dropdown */}
<Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
  <SelectTrigger>
    <SelectValue placeholder="Select a match" />
  </SelectTrigger>
  <SelectContent>
    {matches.map((match) => (
      <SelectItem key={match.id} value={match.id}>
        {match.matchDesc || `${match.team1} vs ${match.team2}`}
        {match.date && ` - ${new Date(match.date).toLocaleDateString()}`}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Before:**
```
India vs South Africa - 11/30/2025
```

**After:**
```
1st ODI - 11/30/2025
2nd ODI - 12/02/2025
3rd ODI - 12/05/2025
```

---

## 🚀 How It Works

### **User Flow:**

1. User navigates to **Leaderboard** page
2. Clicks **"Match-wise Breakdown"** tab
3. Sees **two dropdowns**:
   - **Select User**: Shows all participants (default: current user)
   - **Select Match**: Shows processed matches with descriptions ("1st ODI", "2nd Test")
4. Selects any user from dropdown
5. Selects a match
6. Views that user's team performance for that match

---

## 📊 Data Flow

```
Frontend: Leaderboard Page
    ↓
1. Fetch Participants: GET /tournaments/{id}/participants
   Returns: [{ userId, userName, teamId, teamName }]
    ↓
2. User selects different user from dropdown
    ↓
3. Fetch Match Breakdown: GET /tournaments/{id}/leaderboard/match/{matchId}?userId={selectedUserId}
    ↓
Backend: getMatchWiseBreakdown
    ↓
Extract userId from query or default to current user
    ↓
Leaderboard Service: getMatchWiseBreakdown(tournamentId, matchId, targetUserId)
    ↓
Fetch team for that specific user
    ↓
Return player stats with captain/VC multipliers
    ↓
Frontend displays selected user's team performance
```

---

## ✅ Benefits

### **1. Match Descriptions**
- ✅ Clearer match identification ("1st ODI" vs "IND vs SA")
- ✅ Easier to find specific matches in a series
- ✅ Professional presentation

### **2. View All Users**
- ✅ Compare strategies between teams
- ✅ Learn from top performers
- ✅ Analyze friend's team selections
- ✅ Full transparency in the league

---

## 🧪 Testing Checklist

### **Backend:**
- [ ] Run `npx prisma db push` to add `matchDesc` field
- [ ] Restart backend server
- [ ] Test: `GET /tournaments/{id}/participants` returns all users
- [ ] Test: `GET /tournaments/{id}/leaderboard/match/{matchId}?userId={id}` returns that user's data

### **Frontend:**
- [ ] Leaderboard page loads without errors
- [ ] User dropdown shows all participants with "(You)" marker
- [ ] Match dropdown shows matchDesc ("1st ODI") if available
- [ ] Selecting different user refreshes the match breakdown
- [ ] Default selection is current user

### **Integration:**
- [ ] Calculate points for a match
- [ ] Go to Leaderboard → Match-wise tab
- [ ] Verify matchDesc appears in dropdown
- [ ] Select different user, verify their team stats load
- [ ] Verify captain/VC multipliers are correct

---

## 📝 Notes

- **matchDesc** is optional (`String?`) - falls back to `team1 vs team2` if not available
- **Current user ID** extracted from JWT token in frontend
- **Default selection** is current user for backward compatibility
- **Participants** ordered alphabetically by name
- **No breaking changes** - existing functionality still works if userId not provided

---

**Last Updated:** 2025-12-01  
**Status:** ✅ Implemented, Ready for Testing

