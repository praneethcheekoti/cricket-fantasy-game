# ⚡ Quick Reference Card

## 🚀 Start Commands

### Terminal 1 - Backend
```bash
cd backend && npm run dev
```
→ `http://localhost:5000`

### Terminal 2 - Frontend
```bash
cd frontend && npm run dev
```
→ `http://localhost:3000`

---

## ✅ What's Connected NOW

| Feature | Status | Test URL |
|---------|--------|----------|
| Register | ✅ Working | `http://localhost:3000/register` |
| Login | ✅ Working | `http://localhost:3000/login` |
| Dashboard | ✅ Working | `http://localhost:3000/dashboard` |
| Tournament Create | 🟡 Needs API | `http://localhost:3000/tournament/create` |
| Tournament Lobby | 🟡 Needs API | `/tournament/[id]/lobby` |
| Auction | 🟡 Needs API | `/tournament/[id]/auction` |
| My Team | 🟡 Needs API | `/tournament/[id]/my-team` |
| Matches | 🟡 Needs API | `/tournament/[id]/matches` |
| Leaderboard | 🟡 Needs API | `/tournament/[id]/leaderboard` |

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `frontend/lib/api.ts` | API client - all backend calls |
| `frontend/contexts/AuthContext.tsx` | Auth state management |
| `frontend/.env.local` | Environment config (create this!) |
| `backend/src/routes/` | API route definitions |
| `backend/prisma/schema.prisma` | Database schema |

---

## 🔑 Environment Setup

Create `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 🧪 Quick Test

1. Register: `http://localhost:3000/register`
2. Login with your email/password
3. Dashboard should show your name

---

## 📚 Full Documentation

| Guide | When to Use |
|-------|-------------|
| `QUICK_TEST_GUIDE.md` | Testing login/register now |
| `FRONTEND_NEXT_STEPS.md` | Planning remaining work |
| `INTEGRATION_GUIDE.md` | Connecting pages to API |
| `FRONTEND_INTEGRATION_SUMMARY.md` | Overview of everything |

---

## 🛠️ Quick API Usage

```typescript
import { api } from '@/lib/api'

// Login
await api.auth.login({ email, password })

// Get tournaments
await api.tournaments.getUserTournaments()

// Create tournament
await api.tournaments.create({ name, seriesId })
```

---

## 🔧 Troubleshooting

**Port in use?**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**Database error?**
```bash
cd backend
rm prisma/dev.db
npx prisma migrate dev
```

**Frontend can't connect?**
- Check backend is running: `curl http://localhost:5000/api/health`
- Verify `.env.local` exists and has correct URL

---

## 🎯 Next Action

**Choose one:**

1. **Test Now** → Run `QUICK_TEST_GUIDE.md`
2. **Connect Tournament Create** → Ask me to do it
3. **Connect All Pages** → Ask me to do it
4. **DIY with my help** → Start with Tournament Create

---

## 💬 Ask Me To...

- "Test what's working" → I'll guide you
- "Connect Tournament Create page" → I'll code it
- "Connect all remaining pages" → I'll finish everything
- "Explain how [X] works" → I'll explain
- "Debug [issue]" → I'll help troubleshoot

---

**Everything is ready. Just pick your next step!** 🚀

