# Cricket Fantasy Game - Backend API

A comprehensive backend API for a private cricket fantasy game where users create custom tournaments based on real cricket series.

## 🚀 Features

- **User Authentication** (JWT-based)
- **Series Management** (Bilateral, Tours, Championships)
- **Tournament Creation** with shareable codes
- **Customizable Scoring Rules**
- **Live Auction System** with tier-based pricing
- **Real-time Match Scoring**
- **Leaderboards** (Match-wise and Cumulative)
- **Captain/Vice-Captain Multipliers**
- **Player Stats** (Overall & Opposition-specific)
- **Database Flexibility** (SQLite → MongoDB with one command)

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup Environment Variables

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your configurations:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-change-in-production"
PORT=5000
CRICKET_API_URL="https://api.cricapi.com/v1"
CRICKET_API_KEY="your-api-key-here"
```

### 3. Initialize Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Seed Sample Data (Optional)

```bash
node -e "require('./src/services/cricket-api.service').syncSeries()"
```

### 5. Start Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server will run on `http://localhost:5000`

## 🔄 Switching to MongoDB

When ready to move from local SQLite to MongoDB:

### 1. Run Switch Script

```bash
npm run switch:mongodb
```

### 2. Update .env with MongoDB Connection

```env
DATABASE_URL="mongodb://localhost:27017/cricket-fantasy"
# Or MongoDB Atlas:
# DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/cricket-fantasy"
```

### 3. Push Schema to MongoDB

```bash
npx prisma generate
npx prisma db push
```

That's it! Your app now uses MongoDB with zero code changes.

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |

### Series

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/series` | Get all series |
| GET | `/api/series/:id` | Get series details |
| POST | `/api/series/sync` | Sync series from API |

### Tournaments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tournaments` | Create tournament |
| POST | `/api/tournaments/:id/join` | Join tournament with code |
| GET | `/api/tournaments/:id` | Get tournament details |
| GET | `/api/tournaments/user/list` | Get user's tournaments |
| PUT | `/api/tournaments/:id/rules` | Update scoring rules |
| POST | `/api/tournaments/:id/lock-rules` | Lock rules |
| POST | `/api/tournaments/:id/start-auction` | Start auction |
| GET | `/api/tournaments/:id/leaderboard` | Get leaderboard |

### Auction

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auction/:tournamentId/players` | Get auction players |
| POST | `/api/auction/:tournamentId/bid` | Place bid |
| GET | `/api/auction/:tournamentId/teams` | Get all teams |
| GET | `/api/auction/:tournamentId/my-team` | Get my team |
| PUT | `/api/auction/:tournamentId/captain` | Set captain/vice-captain |

### Matches

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/matches/series/:seriesId` | Get series matches |
| GET | `/api/matches/:id` | Get match details |
| GET | `/api/matches/:id/scores` | Get match scores |

## 🎮 Usage Flow

### 1. Register/Login

```bash
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### 2. Create Tournament

```bash
POST /api/tournaments
Headers: { "Authorization": "Bearer <token>" }
{
  "name": "IPL Fantasy 2024",
  "seriesId": "series-id-here"
}
```

Response includes shareable `code`

### 3. Friends Join

```bash
POST /api/tournaments/:id/join
{
  "code": "ABC123XY"
}
```

### 4. Configure & Lock Rules

```bash
PUT /api/tournaments/:id/rules
{
  "scoringRules": {
    "batting": { "run": 1, "four": 4, "six": 6, ... },
    "bowling": { "wicket": 25, ... },
    ...
  }
}

POST /api/tournaments/:id/lock-rules
```

### 5. Start Auction

```bash
POST /api/tournaments/:id/start-auction
```

### 6. Place Bids

```bash
POST /api/auction/:tournamentId/bid
{
  "playerId": "player-id",
  "amount": 600000000
}
```

### 7. View Leaderboard

```bash
GET /api/tournaments/:id/leaderboard
GET /api/tournaments/:id/leaderboard?matchId=match-id
```

## 🏗️ Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── controllers/           # Request handlers
│   │   ├── auth.controller.js
│   │   ├── series.controller.js
│   │   ├── tournament.controller.js
│   │   ├── auction.controller.js
│   │   └── match.controller.js
│   ├── routes/                # API routes
│   ├── services/              # Business logic
│   │   ├── cricket-api.service.js
│   │   ├── auction.service.js
│   │   └── scoring.service.js
│   ├── middleware/
│   │   └── auth.middleware.js
│   ├── utils/
│   │   └── tournament.utils.js
│   └── server.js              # Express app
├── scripts/
│   └── switch-to-mongodb.js
├── package.json
└── .env
```

## 🎯 Scoring System

### Default Scoring Rules

**Batting:**
- Run: 1 point
- Four: 4 points
- Six: 6 points
- 50: 50 bonus points
- 100: 100 bonus points
- Duck: -10 points
- Strike Rate bonuses

**Bowling:**
- Wicket: 25 points
- Maiden: 10 points
- 3 wickets: 30 bonus
- 5 wickets: 50 bonus
- Economy rate bonuses

**Fielding:**
- Catch: 10 points
- Run-out: 15 points
- Stumping: 15 points

**Captain/Vice-Captain:**
- Captain: 2x multiplier
- Vice-Captain: 1.5x multiplier

**Awards:**
- Man of the Match: 50 points
- Player of Series: 100 points

## 🔐 Authentication

All protected routes require JWT token:

```
Authorization: Bearer <your-jwt-token>
```

Token expires in 7 days.

## 🐛 Troubleshooting

### Database Issues

```bash
# Reset database
rm prisma/dev.db
npx prisma migrate reset

# Regenerate client
npx prisma generate
```

### Port Already in Use

Change `PORT` in `.env` or:

```bash
PORT=3000 npm run dev
```

## 📝 TODO / Future Enhancements

- [ ] Integrate real cricket API (Cricbuzz/ESPNCricinfo)
- [ ] WebSocket support for real-time auction
- [ ] Admin panel for series management
- [ ] Email notifications
- [ ] Player performance analytics
- [ ] Mobile apps (React Native)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## 📄 License

MIT License

## 🆘 Support

For issues and questions, please open a GitHub issue.

---

Built with ❤️ for cricket fans worldwide 🏏

