# 🏗️ Cricket Fantasy Game - System Architecture

## 📐 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Landing  │  │   Auth   │  │Dashboard │  │Tournament│   │
│  │   Page   │  │   Pages  │  │   Page   │  │  Lobby   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Auction  │  │ My Team  │  │  Match   │  │Leaderboard│  │
│  │   Page   │  │   Page   │  │  Center  │  │   Page   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  React/Next.js + Tailwind CSS + State Management            │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ HTTP/REST API
                       │ (JSON)
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                         BACKEND API                           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    Express Server                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │  │
│  │  │   Auth   │  │  Series  │  │Tournament│            │  │
│  │  │  Routes  │  │  Routes  │  │  Routes  │            │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘            │  │
│  │       │             │              │                   │  │
│  │  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐            │  │
│  │  │   Auth   │  │  Series  │  │Tournament│            │  │
│  │  │Controller│  │Controller│  │Controller│            │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘            │  │
│  │       │             │              │                   │  │
│  │  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐            │  │
│  │  │ Auction  │  │  Match   │  │ Scoring  │            │  │
│  │  │  Routes  │  │  Routes  │  │ Service  │            │  │
│  │  └──────────┘  └──────────┘  └──────────┘            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    Services Layer                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │  │
│  │  │ Cricket API  │  │   Auction    │  │   Scoring    │ │  │
│  │  │   Service    │  │   Service    │  │   Service    │ │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │  │
│  │         │                  │                  │         │  │
│  │         │ (Player Stats,   │ (Bidding,       │ (Points │  │
│  │         │  Live Scores)    │  Tiers)         │  Calc)  │  │
│  └─────────┼──────────────────┼──────────────────┼─────────┘  │
│            │                  │                  │            │
│  ┌─────────▼──────────────────▼──────────────────▼─────────┐  │
│  │                    Prisma ORM                            │  │
│  └─────────────────────────┬────────────────────────────────┘  │
└────────────────────────────┼───────────────────────────────────┘
                             │
                             │
┌────────────────────────────▼───────────────────────────────────┐
│                         DATABASE                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  SQLite (Development)  or  MongoDB (Production)          │ │
│  │                                                           │ │
│  │  Models:                                                 │ │
│  │  • User                    • Team                        │ │
│  │  • Series                  • TeamPlayer                  │ │
│  │  • Tournament              • Match                       │ │
│  │  • TournamentParticipant   • MatchPlayerScore           │ │
│  │  • AuctionPlayer           • Bid                        │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
                             │
                             │
┌────────────────────────────▼───────────────────────────────────┐
│                    EXTERNAL SERVICES                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Cricbuzz    │  │  ESPNCricinfo│  │  CricAPI     │        │
│  │     API      │  │     API      │  │   (Free)     │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│         (Live Scores & Player Statistics)                      │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### 1. User Registration/Login Flow
```
User → Frontend (Register/Login Form)
      → Backend Auth Controller
      → Prisma → Database (User table)
      ← JWT Token
      ← Frontend (Store in localStorage)
```

### 2. Tournament Creation Flow
```
User → Frontend (Create Tournament Form)
      → Backend Tournament Controller
      → Generate unique code
      → Prisma → Database (Tournament, TournamentParticipant, Team)
      ← Tournament Code
      ← Frontend (Display code)
```

### 3. Auction Flow
```
Creator → Start Auction
         → Backend generates AuctionPlayers
         → Cricket API Service (fetch player stats)
         → Prisma → Database (AuctionPlayer table)
         
User → Place Bid
     → Backend validates (wallet balance, bid amount)
     → Prisma → Database (Bid table, update player currentPrice)
     ← Updated wallet balance
     ← Frontend refreshes
```

### 4. Match Scoring Flow
```
Cron Job (every 2 mins) → Cricket API Service
                         → Fetch live scores
                         → Update MatchPlayerScore
                         → Scoring Service
                         → Calculate fantasy points
                         → Apply captain multipliers
                         → Prisma → Database
                         
User → View Leaderboard
     → Backend aggregates scores
     ← Ranked teams with points
     ← Frontend displays
```

---

## 🗂️ Database Schema Relationships

```
User
  ├── TournamentParticipant (1:many)
  ├── Team (1:many)
  └── Bid (1:many)

Series
  ├── Tournament (1:many)
  └── Match (1:many)

Tournament
  ├── TournamentParticipant (1:many)
  ├── Team (1:many)
  └── AuctionPlayer (1:many)

Team
  ├── TeamPlayer (1:many)
  └── Bid (1:many)

AuctionPlayer
  └── Bid (1:many)

Match
  └── MatchPlayerScore (1:many)

TeamPlayer
  └── MatchPlayerScore (1:many)
```

---

## 🔐 Authentication Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     │ 1. POST /auth/register {name, email, password}
     ▼
┌────────────────┐
│  Auth          │ 2. Hash password (bcrypt)
│  Controller    │ 3. Create user in DB
└────┬───────────┘
     │
     │ 4. Generate JWT (7 days expiry)
     ▼
┌────────────────┐
│   Database     │
│   (User)       │
└────────────────┘
     │
     │ 5. Return token + user info
     ▼
┌──────────┐
│  Client  │ 6. Store token in localStorage
│          │ 7. Include in future requests:
│          │    Authorization: Bearer <token>
└──────────┘
```

---

## 📡 API Request/Response Patterns

### Standard Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* result */ }
}
```

### Standard Error Response
```json
{
  "error": "Error message here"
}
```

### Protected Route Pattern
```
Client Request → Auth Middleware (verify JWT)
                      ↓ (if valid)
                 Controller → Service → Database
                      ← Response
                 Client ← Response
```

---

## 🎯 Service Layer Architecture

### Cricket API Service
**Responsibilities:**
- Sync cricket series from external APIs
- Fetch player statistics
- Update live match scores
- Create sample data for testing

**Key Methods:**
- `syncSeries()`: Import series data
- `getPlayerStats()`: Fetch player performance
- `syncLiveScores()`: Update match scores
- `updateMatchPlayerScores()`: Record player performances

### Auction Service
**Responsibilities:**
- Generate auction player list
- Assign tiers based on stats
- Manage bidding logic
- Handle player replacements

**Key Methods:**
- `generateAuctionPlayers()`: Create player pool
- `completePlayerAuction()`: Award player to highest bidder
- `handlePlayerReplacement()`: Swap injured/dropped players

### Scoring Service
**Responsibilities:**
- Calculate fantasy points
- Apply scoring rules
- Generate leaderboards
- Aggregate match scores

**Key Methods:**
- `calculateMatchPoints()`: Compute points per player
- `calculateLeaderboard()`: Rank teams
- `getMatchScoresForTournament()`: Detailed breakdown

---

## 🔄 State Management (Frontend)

### Recommended Structure

```javascript
// Context/Store
{
  auth: {
    token: string,
    user: { id, name, email },
    isAuthenticated: boolean
  },
  
  tournament: {
    current: Tournament,
    list: Tournament[],
    participants: User[]
  },
  
  auction: {
    players: AuctionPlayer[],
    currentPlayer: AuctionPlayer,
    myTeam: TeamPlayer[],
    walletBalance: number
  },
  
  matches: {
    schedule: Match[],
    live: Match[],
    scores: MatchPlayerScore[]
  },
  
  leaderboard: {
    matchWise: LeaderboardEntry[],
    overall: LeaderboardEntry[]
  }
}
```

---

## 🚀 Deployment Architecture

### Development
```
Local Machine
  ├── Backend (localhost:5000)
  │   └── SQLite Database (file)
  └── Frontend (localhost:3000)
```

### Production (Recommended)
```
┌─────────────────────────────────────┐
│         Vercel (Frontend)           │
│         Next.js SSR/SSG             │
└─────────────┬───────────────────────┘
              │ API Calls
              ▼
┌─────────────────────────────────────┐
│      Railway/AWS (Backend)          │
│      Node.js Express Server         │
└─────────────┬───────────────────────┘
              │ Database Connection
              ▼
┌─────────────────────────────────────┐
│      MongoDB Atlas (Database)       │
│      Cloud Database Cluster         │
└─────────────────────────────────────┘
              │
              │ External APIs
              ▼
┌─────────────────────────────────────┐
│      Cricket APIs                   │
│      (Live Scores & Stats)          │
└─────────────────────────────────────┘
```

---

## 🔧 Technology Choices

### Why Prisma?
- **Type-safe** database queries
- **Easy migration** between SQLite → MongoDB
- **Auto-generated** client code
- **Built-in** connection pooling

### Why SQLite for Development?
- **Zero setup** - file-based database
- **Fast** for local development
- **Easy testing** - just delete file to reset
- **Same Prisma code** works with MongoDB

### Why Express?
- **Mature** and stable
- **Large ecosystem** of middleware
- **Simple** to understand and extend
- **Well-documented**

### Why JWT?
- **Stateless** authentication
- **Mobile-ready** (no sessions)
- **Scalable** across multiple servers
- **Standard** industry practice

---

## 📊 Performance Considerations

### Database Indexes
Prisma automatically creates indexes on:
- Primary keys (id)
- Unique fields (email, code, etc.)
- Foreign keys

### Query Optimization
- Use `include` for related data (avoid N+1 queries)
- Pagination for large lists
- Select only needed fields

### Caching Strategy (Future)
- Redis for session storage
- Cache tournament rules
- Cache player stats
- Cache leaderboards

### Scaling (Future)
- Load balancer for multiple backend instances
- Database read replicas
- CDN for frontend assets
- WebSocket for real-time updates

---

## 🔒 Security Measures

### Implemented
✅ Password hashing (bcrypt)
✅ JWT token authentication
✅ Environment variables for secrets
✅ Input validation
✅ CORS configuration
✅ SQL injection prevention (Prisma)

### Recommended for Production
- Rate limiting (express-rate-limit)
- Helmet.js for HTTP headers
- HTTPS only
- CSRF protection
- API key authentication for external services
- Database backups
- Logging and monitoring

---

## 🧪 Testing Strategy (Future)

### Backend Tests
- Unit tests (Jest)
- Integration tests (Supertest)
- Database tests (Prisma)

### Frontend Tests
- Component tests (React Testing Library)
- E2E tests (Playwright/Cypress)
- Visual regression tests

---

## 📈 Monitoring & Observability (Future)

### Logging
- Winston for structured logs
- Log levels (error, warn, info, debug)
- Separate files for errors

### Metrics
- API response times
- Database query performance
- User activity tracking

### Alerts
- Server down
- Database connection lost
- High error rate
- Slow API responses

---

This architecture is designed to be:
- ✅ **Scalable**: Handle growing user base
- ✅ **Maintainable**: Clean separation of concerns
- ✅ **Testable**: Isolated components
- ✅ **Extensible**: Easy to add features
- ✅ **Production-ready**: Best practices implemented

---

**Ready to scale from 10 to 10,000 users!** 🚀

