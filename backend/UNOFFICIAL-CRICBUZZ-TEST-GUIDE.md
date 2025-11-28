# 🏏 Unofficial Cricbuzz API - Interactive Test Guide

## 📋 Overview

This standalone test program explores the **Unofficial Cricbuzz API** to compare its data structure with CricketData.org.

**File:** `test-unofficial-cricbuzz-interactive.js`

**Status:** ✅ Completely independent - does NOT affect your main application

---

## 🚀 How to Run

```bash
cd backend
node test-unofficial-cricbuzz-interactive.js
```

---

## 🎮 Interactive Flow

### **Step 1: Select Series**
```
📋 AVAILABLE INTERNATIONAL SERIES
════════════════════════════════════════════

📅 JANUARY 2022
────────────────────────────────────────────
  1. England tour of West Indies, 2022
     ID: 3482 | Jan 22, 2022 → Jan 28, 2022

📅 FEBRUARY 2022
────────────────────────────────────────────
  2. West Indies tour of India, 2022
     ID: 3687 | Feb 6, 2022 → Feb 20, 2022

🖱️  Enter series number: _
```

### **Step 2: Select Squad/Team**
```
📋 SQUADS FOR: India tour of England, 2022
════════════════════════════════════════════

🏆 TEST
────────────────────────────────────────────
  1. India (Squad ID: 12021)
  2. England (Squad ID: 12022)

🏆 ODI
────────────────────────────────────────────
  3. India (Squad ID: 12023)
  4. England (Squad ID: 12024)

🖱️  Enter squad number: _
```

### **Step 3: View Players**
```
👥 PLAYERS: India (Test)
════════════════════════════════════════════

📋 RAW API RESPONSE:

{
  "player": [
    {
      "id": 1234,
      "name": "Virat Kohli",
      "role": "Batsman",
      ...
    }
  ]
}
```

---

## 🎯 What to Look For

### **Series Data:**
- ✅ Do they separate Test/ODI/T20 as different series?
- ✅ Or combine them in one series?
- ✅ How is format information provided?

### **Squad Structure:**
- ✅ How are teams organized?
- ✅ Format grouping (Test, ODI, T20)
- ✅ Squad IDs per format

### **Player Data:**
- ✅ Player IDs
- ✅ Names, roles
- ✅ Additional metadata (stats, images, etc.)

---

## 📊 Comparison with CricketData.org

| Feature | CricketData.org | Unofficial Cricbuzz |
|---------|----------------|---------------------|
| **Series Structure** | One series can have multiple formats | ? |
| **Format Separation** | Via metadata counts (odi/t20/test) | ? |
| **Squad Organization** | By team only | By format → team |
| **Player IDs** | UUID strings | ? |
| **API Calls Needed** | 1 for series + 1 per team | 1 for series + 1 for squads + 1 per squad |

---

## 🔍 Key Questions to Answer

1. **Does Cricbuzz separate tours by format?**
   - Example: Is "India tour of England" one series or split into Test/ODI/T20?

2. **How does squad data work?**
   - Are squads format-specific from the start?
   - Can we easily identify which matches each squad is for?

3. **Player data quality:**
   - Do we get roles (Batsman/Bowler/All-Rounder)?
   - Any stats available?
   - Image URLs?

4. **API limits:**
   - How many calls needed to get all data?
   - Rate limits on RapidAPI?

---

## ⚠️ Notes

- **API Key:** Using your provided RapidAPI key
- **Endpoint:** `unofficial-cricbuzz.p.rapidapi.com`
- **Match Type:** `international` (can be changed in code)
- **Independent:** This script does NOT write to your database

---

## 🗑️ Cleanup

When done testing, simply delete:
```bash
rm test-unofficial-cricbuzz-interactive.js
rm UNOFFICIAL-CRICBUZZ-TEST-GUIDE.md
```

---

## 📝 Save Results

Copy the output to compare with CricketData.org and decide which API is better for your needs!

---

**Ready to test!** 🚀

