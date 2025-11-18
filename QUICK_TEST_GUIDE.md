# ⚡ Quick Test Guide - Frontend + Backend Integration

## 🎯 What's Already Connected

✅ **Authentication System**
- Login
- Register  
- Dashboard

Let's test it NOW! 🚀

---

## 🏃 Quick Start (5 Minutes)

### Terminal 1: Start Backend

```bash
cd backend

# Install if needed
npm install

# Setup database if needed
npx prisma generate
npx prisma migrate dev --name init

# Seed sample series
node -e "require('./src/services/cricket-api.service').syncSeries()"

# Start server
npm run dev
```

**Expected Output:**
```
🚀 Server running on http://localhost:5000
🏏 Cricket Fantasy API ready!
```

---

### Terminal 2: Start Frontend

```bash
cd frontend

# Install if needed  
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local

# Start dev server
npm run dev
```

**Expected Output:**
```
Ready on http://localhost:3000
```

---

## ✅ Test 1: Register New User (30 seconds)

1. Open browser: `http://localhost:3000`
2. Click **"Sign Up"** (top right)
3. Fill the form:
   - Name: `John Doe`
   - Email: `john@test.com`
   - Password: `test123` (at least 6 characters)
   - Confirm Password: `test123`
4. Click **"Create Account"**

**✅ Success looks like:**
- Green toast notification: "Account created! Welcome to Cricket Fantasy, John Doe!"
- Automatically redirected to dashboard: `http://localhost:3000/dashboard`
- Dashboard shows: "Welcome back, John Doe"

**❌ If you see error:**
- Check backend terminal for errors
- Verify backend is running on port 5000
- Check browser console (F12)

---

## ✅ Test 2: Logout & Login (20 seconds)

1. On Dashboard, click logout icon (top right)
2. Should redirect to home page
3. Click **"Login"**
4. Enter credentials:
   - Email: `john@test.com`
   - Password: `test123`
5. Click **"Login"**

**✅ Success looks like:**
- Toast: "Welcome back!"
- Redirected to dashboard
- Shows your name

---

## ✅ Test 3: Dashboard Loads (10 seconds)

On the dashboard you should see:

1. **Header:**
   - "Cricket Fantasy" logo
   - Logout button

2. **Welcome Section:**
   - "Welcome back, John Doe"

3. **Quick Actions Cards:**
   - "Create Tournament" card (green)
   - "Join Tournament" card (blue)

4. **Your Tournaments Section:**
   - Currently shows "No tournaments yet"
   - This is normal - you haven't created any!

---

## 🔍 Verify in Backend Database

```bash
cd backend
npx prisma studio
```

Opens GUI at `http://localhost:5555`

**Check:**
1. **User table** - Should have your registered user
2. **Series table** - Should have 4 sample series
3. **Tournament table** - Empty (you haven't created any yet)

---

## 🎉 What's Working

✅ **Backend:**
- API server running
- Database connected
- Sample data seeded
- Authentication endpoints working

✅ **Frontend:**
- React app running
- API client connected
- Auth context managing state
- Login/Register pages functional
- Dashboard loading

✅ **Integration:**
- Frontend → Backend API calls working
- JWT tokens being generated and stored
- Authentication flow complete

---

## ❌ Common Issues

### 1. Port 5000 Already in Use

**Error:** `Port 5000 is already in use`

**Fix:**
```bash
# Stop whatever is on port 5000
# On Windows:
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F

# Or change port in backend/.env
PORT=3001
```

### 2. Frontend Can't Connect

**Error:** `Failed to fetch` or CORS error

**Fix:**
- Ensure backend is running: `curl http://localhost:5000/api/health`
- Check `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:5000/api`
- Restart frontend dev server

### 3. Database Error

**Error:** `Database not found`

**Fix:**
```bash
cd backend
rm prisma/dev.db
npx prisma migrate dev --name init
```

### 4. No Series in Dropdown (Later)

**Error:** Series dropdown is empty

**Fix:**
```bash
cd backend
node -e "require('./src/services/cricket-api.service').syncSeries()"
```

---

## 🧪 Advanced Testing (Optional)

### Test API with cURL

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User 2",
    "email": "test2@example.com",
    "password": "password123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@test.com",
    "password": "test123"
  }'
```

Save the token from response!

**Get Series (with token):**
```bash
curl http://localhost:5000/api/series \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📊 System Status Check

### Backend Health Check

```bash
curl http://localhost:5000/api/health
```

**Expected:**
```json
{
  "status": "ok",
  "message": "Cricket Fantasy API is running"
}
```

### Frontend Status

Open: `http://localhost:3000`

Should load the landing page with hero section.

---

## 🎯 Next Steps After Testing

Once you confirm login/register is working:

1. **Create Tournament Page** - Connect to backend
2. **Join Tournament** - Test with codes
3. **Auction Page** - Place bids
4. **My Team** - View players
5. **Leaderboard** - See rankings

**See `FRONTEND_NEXT_STEPS.md` for detailed plan!**

---

## 🚀 You're Ready!

If all 3 tests pass:
- ✅ Registration works
- ✅ Login works
- ✅ Dashboard loads

**Then your integration is successful!** 🎉

The foundation is solid. Now just need to connect the remaining pages (tournament creation, auction, etc.) following the same pattern.

**Want me to connect the Tournament Create page next?** Just ask! 🏏

