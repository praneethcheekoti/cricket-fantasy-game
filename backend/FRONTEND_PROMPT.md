# 🎨 Frontend AI Generator Prompt

Copy this EXACT prompt to your AI UI generator (V0.dev, Bolt.new, Claude, etc.):

---

Build a modern, responsive Cricket Fantasy Game web application using React/Next.js and Tailwind CSS.

## PAGES & FEATURES NEEDED:

### 1. HOME PAGE / LANDING
- Hero section with "Create Tournament" and "Join Tournament" buttons
- Brief explanation of how the game works
- Modern cricket-themed design (green/white/blue colors)
- Responsive navbar with logo

### 2. AUTH PAGES

**Registration Page:**
- Form fields: Name, Email, Password, Confirm Password
- Validation for all fields
- "Sign Up" button
- Link to login page
- Show success message on registration

**Login Page:**
- Form fields: Email, Password
- "Remember Me" checkbox
- "Login" button
- Link to registration page
- Show error messages for invalid credentials

### 3. DASHBOARD (After Login)
- Welcome message with user name
- Grid of tournament cards showing:
  * Tournament name
  * Series name
  * Status (Setup/Auction/Live/Completed)
  * Your team name
  * Participant count
- "Create New Tournament" button (prominent)
- "Join Tournament" button (opens modal for code entry)
- Display default wallet balance: Rs 100 Cr

### 4. CREATE TOURNAMENT PAGE

**Step 1: Basic Info**
- Tournament name input field
- Dropdown to select cricket series
  * Fetch from: `GET /api/series`
  * Display: Series name, format (ODI/Test/T20), teams

**Step 2: Scoring Configuration**

Display as expandable accordion sections:

**BATTING RULES:**
- Runs (per run): Number input [default: 1]
- Boundary (4s): Number input [default: 4]
- Boundary (6s): Number input [default: 6]
- Half-century bonus: Number input [default: 50]
- Century bonus: Number input [default: 100]
- Duck penalty: Number input [default: -10]
- Strike Rate Bonus (toggle + ranges):
  * SR > 150: +20 points
  * SR 120-150: +10 points
  * SR 60-80: -10 points

**BOWLING RULES:**
- Wicket: Number input [default: 25]
- Maiden over: Number input [default: 10]
- 3-wicket haul bonus: Number input [default: 30]
- 5-wicket haul bonus: Number input [default: 50]
- Economy Rate Bonus (toggle + ranges):
  * ER < 5: +20 points
  * ER 5-7: +10 points
  * ER > 10: -10 points

**FIELDING RULES:**
- Catch: Number input [default: 10]
- Run-out: Number input [default: 15]
- Stumping: Number input [default: 15]

**CAPTAIN/VICE-CAPTAIN:**
- Enable/Disable toggle [default: ON]
- Captain multiplier: Number input [default: 2]
- Vice-captain multiplier: Number input [default: 1.5]

**AWARDS:**
- Man of the Match: Number input [default: 50]
- Player of the Series: Number input [default: 100]

**TEAM COMPOSITION (Optional):**
- Minimum batsmen: Number input [default: 0]
- Minimum bowlers: Number input [default: 0]
- Minimum all-rounders: Number input [default: 0]
- Minimum wicket-keepers: Number input [default: 0]

**Buttons:**
- "Reset to Defaults"
- "Create Tournament"

**After Creation:**
- Show success modal with tournament code
- Large display of shareable code
- "Copy Code" button
- "Go to Tournament" button

### 5. TOURNAMENT LOBBY PAGE

**Header Section:**
- Tournament name (large)
- Series name and format
- Tournament code with copy button
- Status badge

**Participants Section:**
- List of joined users with avatars/initials
- Show "Waiting for players..." if solo
- Real-time updates when someone joins

**Scoring Rules Display:**
- Tabbed interface or accordion
- Show all configured rules
- "Edit Rules" button (only visible to creator)
- Lock indicator for each participant

**Lock Section:**
- Checkbox: "I approve these rules"
- Shows which participants have locked
- When all locked: "Start Auction" button (creator only)

### 6. AUCTION PAGE

**Layout: Two-Panel Split**

**LEFT PANEL (60% width):**

**Current Player Card:**
- Player photo placeholder (cricket silhouette)
- Player name (large, bold)
- Role badge (Batsman/Bowler/All-Rounder/Wicket-Keeper)
- Tier badge (A/B/C/D with color coding)
  * Tier A: Gold
  * Tier B: Silver
  * Tier C: Bronze
  * Tier D: Gray

**Stats Tabs:**
- Tab 1: "Overall International"
  * Matches played
  * Runs / Wickets
  * Average
  * Strike Rate / Economy
  * Best performance
  
- Tab 2: "vs [Opponent]"
  * Head-to-head stats
  * Runs/Wickets vs this opponent
  * Average vs opponent
  
- Tab 3: "Home vs Away"
  * Home ground stats
  * Away ground stats
  * Split comparison

**Bidding Section:**
- Current bid amount (large, red if yours)
- Your current bid (if any)
- Bid input field (increments of Rs 10L)
- "Place Bid" button (primary color)
- Timer countdown (optional: 30 seconds per player)

**RIGHT PANEL (40% width):**

**Your Team Section:**
- Header: "YOUR TEAM"
- Wallet balance (prominent, color-coded)
  * Green if healthy
  * Red if low
- List of purchased players:
  * Player name
  * Role
  * Purchase price
  * Small icon
- Total spent
- Remaining balance

**Other Teams (Tabs):**
- Tabs for each competing team
- Click to view their purchases
- Show their wallet balance
- Number of players purchased

**Bottom Section:**
- Player queue (horizontal scrollable)
- Shows next 5-10 players coming up
- Small cards with name + tier

### 7. MY TEAM PAGE

**Team Overview:**
- Team name (editable)
- Total players count
- Total money spent
- Remaining wallet balance

**Players Grid:**
Display as cards in a grid:
- Player name
- Role badge
- Purchase price
- Stats preview

**Captain Selection (if enabled):**
- Dropdown/radio on each card:
  * Captain (shows "C" badge, 2x)
  * Vice-Captain (shows "VC" badge, 1.5x)
  * Regular player
- "Save Selection" button

**Summary:**
- Total team value
- Average player cost
- Role distribution (pie chart optional)

### 8. MATCH CENTER

**Match Schedule View:**
- List/cards of all matches in series
- For each match:
  * Match number
  * Teams
  * Date & time
  * Venue
  * Status badge (Upcoming/Live/Completed)

**Live Match View:**
- Real match score display
  * Team 1 vs Team 2
  * Current score
  * Overs
  * Required run rate (if chasing)

**Fantasy Scoring Section:**
- Table of YOUR players who are playing
  * Player name
  * Real performance (runs, wickets, etc.)
  * Fantasy points earned
  * Running total
- Live updates (refresh every 2 mins or WebSocket)

**Leaderboard (Match-specific):**
- Rank
- Team owner name
- Match points
- Highlight current user's rank

### 9. LEADERBOARD PAGE

**Two Tabs:**

**Tab 1: Match-wise Winners**
- Dropdown to select match
- Display top 10 teams for that match
- Show:
  * Rank
  * Owner name
  * Team name
  * Points
  * Top performing player
- Winner gets trophy icon

**Tab 2: Overall Series**
- Cumulative standings
- All teams ranked by total points
- Display:
  * Rank
  * Owner name
  * Team name
  * Total points
  * Matches played
  * Average points per match
- Top 3 get podium display

## DESIGN SPECIFICATIONS:

**Color Scheme:**
- Primary: Cricket Green (#1B5E20)
- Secondary: Sky Blue (#2196F3)
- Accent: Orange (#FF6F00)
- Background: Light Gray (#F5F5F5)
- Text: Dark Gray (#212121)

**Typography:**
- Headings: Bold, sans-serif
- Body: Regular, readable
- Numbers: Monospace for scores/money

**Components:**
- Rounded corners (border-radius: 8-12px)
- Subtle shadows for cards
- Smooth transitions (0.3s ease)
- Loading spinners for async operations
- Toast notifications for actions

**Responsive:**
- Mobile: Single column, stacked
- Tablet: Adapt grid layouts
- Desktop: Full multi-column

## API INTEGRATION:

**Base URL:** `http://localhost:5000/api`

**Authentication:**
All protected routes need header:
```
Authorization: Bearer <token>
```

**Endpoints to Use:**

```javascript
// Auth
POST /auth/register { name, email, password }
POST /auth/login { email, password }

// Series
GET /series

// Tournaments
POST /tournaments { name, seriesId, scoringRules? }
POST /tournaments/:id/join { code }
GET /tournaments/:id
GET /tournaments/user/list
PUT /tournaments/:id/rules { scoringRules }
POST /tournaments/:id/lock-rules
POST /tournaments/:id/start-auction
GET /tournaments/:id/leaderboard?matchId=optional

// Auction
GET /auction/:tournamentId/players
POST /auction/:tournamentId/bid { playerId, amount }
GET /auction/:tournamentId/teams
GET /auction/:tournamentId/my-team
PUT /auction/:tournamentId/captain { captainId, viceCaptainId }

// Matches
GET /matches/series/:seriesId
GET /matches/:id
GET /matches/:id/scores
```

**State Management:**
- Use Context API or Zustand
- Store: auth token, user info, current tournament
- Persist auth token in localStorage

**Error Handling:**
- Show toast notification on API errors
- Display friendly error messages
- Handle network failures gracefully

**Loading States:**
- Skeleton loaders for lists
- Spinners for actions
- Disable buttons during API calls

Build this as a complete, production-ready, beautiful application that cricket fans would love to use!

---

**End of Prompt**

