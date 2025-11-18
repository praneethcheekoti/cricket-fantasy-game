# 🏏 Cricket Fantasy Game

A comprehensive private cricket fantasy game where users create custom tournaments based on real cricket series. Play with friends, auction players, and compete based on real match performances!

---

## ✨ Features

### 🎮 Core Gameplay
- **Private Tournaments**: Create custom tournaments with unique shareable codes
- **Live Auctions**: Bid on real cricket players with a Rs 100 Cr budget
- **Tier-based Pricing**: Players divided into tiers A/B/C/D (5Cr/3Cr/1Cr/50L)
- **Custom Scoring**: Fully configurable points for batting, bowling, fielding, awards
- **Captain/Vice-Captain**: Multiplier system (2x, 1.5x)
- **Real-time Scoring**: Points calculated from actual match performances
- **Leaderboards**: Match-wise and cumulative rankings

### 📊 Player Stats
During auctions, view:
- Overall international career statistics
- Performance vs tournament opposition
- Home vs Away ground splits
- Detailed batting/bowling averages

### 🌍 Coverage
- **All Formats**: Tests, ODIs, T20s (treated as separate tournaments)
- **Men's & Women's Cricket**: Full support for both
- **Series Types**: Bilateral series, tours, championships

---

## 🚀 Quick Start

### Prerequisites
- Node.js v16+
- npm or yarn

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma migrate dev --name init

# Seed sample data
node -e "require('./src/services/cricket-api.service').syncSeries()"

# Start server
npm run dev
```

✅ Backend running on `http://localhost:5000`

### 2. Frontend Setup

**Option A: Generate with AI**

1. Copy the prompt from `backend/FRONTEND_PROMPT.md`
2. Paste into your AI UI generator:
   - [V0.dev](https://v0.dev) (Vercel)
   - [Bolt.new](https://bolt.new)
   - Claude with artifacts
   - ChatGPT with code generation
3. Copy generated code to `frontend/`
4. Run `npm install` and `npm run dev`

**Option B: Use Provided Prompt**

The complete frontend specification is in `backend/FRONTEND_PROMPT.md` with:
- 9 pages fully designed
- Component specifications
- API integration code
- Cricket-themed color scheme
- Responsive layouts

---

## 📁 Project Structure

```
cricket-fantasy-game/
├── backend/                    # Node.js API (✅ COMPLETE)
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── middleware/        # Auth, validation
│   │   ├── utils/             # Helper functions
│   │   └── server.js          # Express app
│   ├── prisma/
│   │   └── schema.prisma      # Database models
│   ├── package.json
│   └── README.md
├── frontend/                   # React/Next.js UI (Generate with AI)
│   └── (to be generated)
├── SETUP.md                    # Step-by-step setup guide
├── PROJECT_STATUS.md           # Current status & roadmap
└── README.md                   # This file
```

---

## 🎯 How to Play

### 1. **Create Tournament**
- Select a cricket series (e.g., India vs Australia ODI 2024)
- Customize scoring rules
- Get a unique shareable code

### 2. **Invite Friends**
- Share the tournament code
- Friends join via the code
- Everyone reviews the rules

### 3. **Lock Rules**
- All participants must approve the scoring rules
- Once locked, rules cannot be changed

### 4. **Auction Players**
- Bid on real cricket players
- Rs 100 Cr wallet for each user
- Highest bidder gets the player
- Build your dream team (no squad limit)

### 5. **Set Captain/Vice-Captain**
- Designate your captain (2x points)
- Designate your vice-captain (1.5x points)

### 6. **Watch Real Matches**
- Real cricket matches happen
- System calculates fantasy points automatically
- Check live leaderboards

### 7. **Win!**
- Match winners (highest points per match)
- Series winner (most cumulative points)

---

## 🏗️ Tech Stack

### Backend (Complete ✅)
- **Runtime**: Node.js
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: SQLite (local) → MongoDB (production-ready)
- **Auth**: JWT + bcrypt
- **API**: RESTful

### Frontend (Ready to Generate 🎨)
- **Framework**: React / Next.js
- **Styling**: Tailwind CSS
- **State**: Context API / Zustand
- **HTTP**: Axios / Fetch

### Future: Mobile Apps 📱
- React Native
- Or Capacitor (wrap web app)

---

## 🔑 Key Features Detail

### Scoring System

**Batting Points:**
- Run: 1 point
- Four: 4 points
- Six: 6 points
- 50: 50 bonus
- 100: 100 bonus
- Duck: -10 points
- Strike rate bonuses (configurable)

**Bowling Points:**
- Wicket: 25 points
- Maiden: 10 points
- 3 wickets: 30 bonus
- 5 wickets: 50 bonus
- Economy rate bonuses (configurable)

**Fielding Points:**
- Catch: 10 points
- Run-out: 15 points
- Stumping: 15 points

**Awards:**
- Man of the Match: 50 points
- Player of the Series: 100 points

*All values are defaults and fully customizable!*

### Auction System

**Tier Pricing:**
| Tier | Base Price | Typical Players |
|------|------------|-----------------|
| A | Rs 5 Cr | Star players (Kohli, Smith, Bumrah) |
| B | Rs 3 Cr | Good players (Shubman Gill, KL Rahul) |
| C | Rs 1 Cr | Average players (Shreyas Iyer) |
| D | Rs 50 L | Emerging players (Tilak Varma) |

**Bidding:**
- Increments of Rs 10 Lakh
- Real-time wallet updates
- No squad size limit
- Buy as many players as budget allows

---

## 📚 Documentation

- **[SETUP.md](SETUP.md)**: Complete setup guide
- **[PROJECT_STATUS.md](PROJECT_STATUS.md)**: Current status & roadmap
- **[backend/README.md](backend/README.md)**: API documentation
- **[backend/FRONTEND_PROMPT.md](backend/FRONTEND_PROMPT.md)**: UI generation prompt

---

## 🗄️ Database

### Local Development (SQLite)
Default setup uses SQLite for easy local testing.

### Production (MongoDB)
Switch to MongoDB with one command:

```bash
cd backend
npm run switch:mongodb
```

Update `.env`:
```env
DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/cricket-fantasy"
```

Run:
```bash
npx prisma generate
npx prisma db push
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

### Series
- `GET /api/series` - List all series
- `GET /api/series/:id` - Get series details

### Tournaments
- `POST /api/tournaments` - Create tournament
- `POST /api/tournaments/:id/join` - Join with code
- `GET /api/tournaments/:id` - Get details
- `PUT /api/tournaments/:id/rules` - Update rules
- `POST /api/tournaments/:id/lock-rules` - Lock rules
- `POST /api/tournaments/:id/start-auction` - Start auction
- `GET /api/tournaments/:id/leaderboard` - Get standings

### Auction
- `GET /api/auction/:tournamentId/players` - Get players
- `POST /api/auction/:tournamentId/bid` - Place bid
- `GET /api/auction/:tournamentId/my-team` - Get my team
- `PUT /api/auction/:tournamentId/captain` - Set captain

### Matches
- `GET /api/matches/series/:seriesId` - Get matches
- `GET /api/matches/:id/scores` - Get match scores

**Full API docs:** `backend/README.md`

---

## 🎨 Frontend Prompt

To generate the beautiful UI, use the comprehensive prompt in:

**📄 `backend/FRONTEND_PROMPT.md`**

This prompt includes:
- ✅ 9 complete pages
- ✅ Component designs
- ✅ Cricket-themed color scheme
- ✅ Responsive layouts
- ✅ API integration
- ✅ State management
- ✅ Error handling

Just copy, paste into AI generator, and you're done!

---

## 🧪 Testing

### Test Backend APIs

**Using Postman/Insomnia:**
1. Import collection or create requests
2. Test each endpoint
3. Use JWT token for protected routes

**Using Prisma Studio:**
```bash
cd backend
npx prisma studio
```
Opens GUI to view/edit database at `http://localhost:5555`

---

## 📱 Mobile Apps (Future)

### React Native
- Create `mobile/` directory
- Use same backend APIs
- Platform-specific features

### Capacitor
- Wrap Next.js frontend
- Quick deployment
- Share web codebase

**Backend is already mobile-ready!** No changes needed.

---

## 🛠️ Development

### Backend Development

```bash
cd backend
npm run dev        # Start with nodemon (auto-reload)
npm start          # Production mode
npm run prisma:studio  # Open database GUI
```

### View Logs
Backend logs show:
- Server startup
- API requests
- Database queries
- Errors

### Database Changes
After modifying `schema.prisma`:

```bash
npx prisma migrate dev --name your_change_name
npx prisma generate
```

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
rm prisma/dev.db
npx prisma migrate reset
```

### Port already in use
Change port in `.env`:
```env
PORT=3001
```

---

## 🚀 Deployment

### Backend
Deploy to:
- **Vercel** (serverless functions)
- **Railway** (managed hosting)
- **AWS EC2** (full control)
- **DigitalOcean** (VPS)
- **Heroku** (easy deployment)

### Frontend
Deploy to:
- **Vercel** (Next.js native)
- **Netlify** (static hosting)
- **AWS Amplify**

### Database
- **MongoDB Atlas** (cloud MongoDB)
- **AWS RDS** (managed SQL)

---

## 🎓 Learning Resources

- **Prisma**: https://www.prisma.io/docs
- **Express**: https://expressjs.com
- **Next.js**: https://nextjs.org/docs
- **React**: https://react.dev
- **JWT**: https://jwt.io/introduction

---

## 🤝 Contributing

This is a personal/private project, but feel free to:
1. Fork the repository
2. Create feature branches
3. Submit pull requests
4. Report issues

---

## 📜 License

MIT License - Feel free to use for personal or commercial projects!

---

## 🙏 Acknowledgments

- Cricket data structure inspired by real fantasy platforms
- Built with modern web technologies
- Designed for cricket enthusiasts worldwide

---

## 📞 Support

For questions or issues:
- Check `SETUP.md` for setup help
- Review `PROJECT_STATUS.md` for current status
- Open GitHub issues for bugs
- Refer to `backend/README.md` for API docs

---

## 🎉 Status

**Backend**: ✅ 100% Complete & Production-Ready

**Frontend**: 🎨 Ready to Generate (prompt provided)

**Mobile**: 📱 Blueprint Ready (future implementation)

---

**Ready to build the ultimate cricket fantasy experience! 🏏🚀**

Start with `SETUP.md` and let's play! 🎮

