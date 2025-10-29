# Name Matching Improvements

## Changes Made

### 1. **Multi-Event Support** ✅
**Problem**: The scraper only returned the first race (Women's 6000m), missing Men's 10000m athletes.

**Solution**: Now returns results from **ALL events** in the meet.
- Women's 6000m: 255 athletes
- Men's 10000m: 255 athletes
- Total: 510 athletes available for matching

### 2. **Gender Filtering** ✅
**Problem**: Could potentially match wrong athlete if names were similar.

**Solution**: Added gender field to results and matching logic.
- Each result now includes: `{ name, school, time, place, gender, eventName }`
- Matching requires name + school + gender to align

### 3. **Improved Name Normalization** ✅
**Problem**: Names with double spaces, apostrophes, or suffixes wouldn't match.

**Solution**: Enhanced normalization:
```javascript
- Removes multiple spaces
- Removes punctuation (., -, ', `)
- Removes suffixes (Jr, Sr, II, III, IV)
- Handles case insensitivity
```

### 4. **Better Debugging** ✅
**Problem**: Hard to see why names weren't matching.

**Solution**: Enhanced debug endpoint shows:
- Your roster athletes
- Potential matches from same school
- Potential matches with similar last names
- Gender comparison
- Event information

## How to Use the Debug Feature

1. **Start tracking a race**:
   - Enter the PTTiming URL in your app
   - Click "Start Live Tracking"

2. **Click "Debug Data" button** in the UI

3. **Review the debug output**:
   ```json
   {
     "raceTitle": "NCAA DI Cross Country Championships - 6000m & 10000m",
     "totalLiveResults": 510,
     "teamRosters": [
       {
         "teamName": "Your Team",
         "roster": [
           {
             "name": "John Smith",
             "school": "Oregon",
             "gender": "M",
             "potentialMatches": [
               {
                 "name": "John Smith",
                 "school": "Oregon",
                 "gender": "M",
                 "place": 15,
                 "time": "28:45.2"
               }
             ]
           }
         ]
       }
     ]
   }
   ```

4. **Check for mismatches**:
   - Compare your athlete's name vs potential matches
   - Look for spelling differences
   - Check if gender matches
   - Verify school names are similar

## Common Matching Issues

### Issue 1: School Name Differences
**Your DB**: "Oregon State University"
**PTTiming**: "Oregon St"

**Fix**: School matching is fuzzy and handles this automatically.

### Issue 2: Name Format Differences
**Your DB**: "Smith, John"
**PTTiming**: "John Smith"

**Fix**: Both formats should work with fuzzy matching. If not, update your database to use "FirstName LastName" format.

### Issue 3: Missing Athletes
**Cause**: Athletes in your draft aren't in this specific race.

**Fix**: Make sure you're using the correct meet URL. The URL must match the meet where your drafted athletes actually competed.

### Issue 4: Gender Mismatch
**Your DB**: Gender field is empty or incorrect
**PTTiming**: Gender is "M" or "F"

**Fix**: Run the gender assignment script or update the database to include correct gender values.

## Testing the Fixes

### Test with Server Logs:
```bash
cd cross-country-draft/server
npm start
```

When you start tracking, you'll see detailed logs:
```
=== Calculating scores for 4 teams ===
Live results count: 510

--- Team: Your Team (7 athletes) ---
Looking for: "John Smith" from "Oregon" (M)
  Comparing with: "John Smith" from "Oregon" (M)
    Name: true, School: true, Gender: true
  ✓ MATCHED: Place 15, Time: 28:45.2, Event: 10000m
```

### What to Look For:
- ✓ "Name: true" - Name matched correctly
- ✓ "School: true" - School matched correctly
- ✓ "Gender: true" - Gender matched correctly
- ✗ "NO MATCH FOUND" - Athlete not in this race

## Next Steps

If you're still seeing mismatches:

1. **Share the debug output** - Click "Debug Data" and share the output
2. **Check server logs** - Look for the "Comparing with" messages
3. **Verify your data** - Make sure athletes in your draft actually competed in this meet
4. **Check gender field** - Run:
   ```bash
   node scripts/add-draft-gender.js
   ```

## Key Points

✅ Scraper now gets **both** Men's and Women's races
✅ Matching uses **name + school + gender**
✅ Better name normalization handles most edge cases
✅ Debug endpoint shows exactly what's being compared
✅ Server logs show detailed matching attempts
