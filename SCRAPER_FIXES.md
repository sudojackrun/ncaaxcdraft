# Scraper Fixes - Correct Gender & Times

## ✅ What Was Fixed

### Problem 1: Wrong Gender (Women imported as Men)
**Issue:** Importing "2024 NCAA DI Championships - Men 10K" was pulling women's results
**Example:** Got "Doris Lemngole" instead of "Parker Wolfe"

**Root Cause:** TFRRS meet pages have BOTH men's and women's races. The scraper was grabbing whichever table came first (usually women's).

**Fix:**
- Scraper now looks for section headers (e.g., "Men's 10K", "Women's 6K")
- Matches the header to the requested gender (M or F)
- Only parses the table for that specific gender
- Each predefined meet now has explicit gender setting

### Problem 2: Wrong Times (Pace instead of Time)
**Issue:** Getting 5:11.4 instead of 22:56
**Example:** "5:11.4" (pace per mile) instead of "22:56" (actual 10K time)

**Root Cause:** TFRRS tables have multiple time-related columns:
- **Time** (e.g., 22:56.3) - actual race time ✅
- **Pace** (e.g., 5:11.4) - pace per mile ❌
- **Gun Time** - time from starting gun ❌

The scraper was grabbing the wrong column.

**Fix:**
- Scraper now analyzes table headers
- Finds column labeled "Time" or "Finish" (not "Pace")
- Validates times are reasonable for XC (13-40 minutes)
- Rejects times < 10 minutes (likely pace or wrong data)

### Problem 3: Grade Display
**Issue:** Showing "10" instead of "SR"
**Example:** Grade column showed "10" instead of "SR" for seniors

**Fix:**
- Now displays year as FR/SO/JR/SR
- Also stores numeric grade (9-12) in database
- Year column on Athletes page shows "SR", "JR", etc.

## How It Works Now

### 1. Gender-Specific Import

When you import "2024 NCAA DI Championships - Men 10K":
1. Scraper receives `gender: 'M'` parameter
2. Searches page for headers containing "men" (but not "women")
3. Finds the Men's 10K section
4. Parses ONLY that table
5. Imports only male athletes

### 2. Correct Column Parsing

The scraper:
1. Reads table headers
2. Finds column positions:
   - Place (Pl, Place)
   - Name (Name, Athlete)
   - Year (Yr, Year, Class)
   - Team (Team, School)
   - **Time** (Time, Finish) - NOT Pace!
3. Extracts data from correct columns
4. Validates times are in XC range (13-40 min)

### 3. Data Validation

Before importing an athlete, the scraper checks:
- ✅ Has athlete profile link (not a team row)
- ✅ Name has first + last (not a header)
- ✅ Time is in MM:SS format
- ✅ Time is 10+ minutes (not pace)
- ✅ Time is under 40 minutes (reasonable for XC)
- ✅ Has school name

## Test It Now

### Step 1: Clear Bad Data
```
1. Go to http://localhost:3000/athletes
2. Click "Men" tab
3. Click "Delete All Men"
4. Confirm twice
```

### Step 2: Import Correct Data
```
1. Restart server: npm run dev
2. Go to http://localhost:3000/import
3. Click "Import Results" on "2024 NCAA DI Championships - Men 10K"
4. Wait 1-2 minutes
```

### Step 3: Verify Results
```
Go to http://localhost:3000/athletes
Click "Men" tab

You should see:
✅ ~255 male athletes
✅ Names like "Parker Wolfe", "Nico Young", "Connor Burns"
✅ Schools like "North Carolina", "Northern Arizona", "BYU"
✅ Year column: "SR", "JR", "SO", "FR"
✅ 10K PR column: Times like "28:36.8", "29:12.5"
✅ Grade column: 9, 10, 11, or 12

You should NOT see:
❌ Female names (Doris Lemngole, etc.)
❌ Times under 10 minutes (5:11.4, etc.)
❌ Blank/missing times
```

## Expected Results by Meet

| Meet | Gender | Distance | # Athletes | Example Names |
|------|--------|----------|------------|---------------|
| NCAA DI Champs Men | M | 10K | ~255 | Parker Wolfe, Nico Young, Connor Burns |
| NCAA DI Champs Women | F | 6K | ~255 | Sadie Engelhardt, Taylor Ewert, Carmen Alder |
| SEC Champs Men | M | 8K | ~150 | Top SEC conference runners |
| SEC Champs Women | F | 6K | ~150 | Top SEC conference runners |

## Troubleshooting

### Still getting wrong gender?
- Make sure you selected the right meet (Men vs Women)
- Check the console logs for "Found men's section" or "Found women's section"
- The meet might have unusual section headers

### Still getting pace times?
- Check console logs for "Column indices: {...}"
- The table format might be different
- Try a different meet first

### No results found?
- The page format might be different from expected
- Check console for "Could not find Time column"
- The meet might not have results posted yet

## Technical Details

### Column Detection
```javascript
headers = ["Pl", "Name", "Yr", "Team", "Time", "Pace"]
            ↓      ↓       ↓      ↓        ↓       ↓
indices  = [ 0,    1,      2,     3,       4,      5  ]

We want index 4 (Time), NOT index 5 (Pace)!
```

### Gender Section Detection
```javascript
Page structure:
<h3>Men's 10000 Meters</h3>  ← We find this!
<table>
  ... men's results ...
</table>

<h3>Women's 6000 Meters</h3>
<table>
  ... women's results ...
</table>

We parse only the table after "Men's" header
```

### Time Validation
```javascript
"22:56.3" → 1376.3 seconds → ✅ Valid (13-40 min range)
"5:11.4"  → 311.4 seconds  → ❌ Invalid (< 10 min, probably pace)
```

---

**Ready to test!** Delete your bad data and reimport with the fixed scraper! 🏃‍♂️
