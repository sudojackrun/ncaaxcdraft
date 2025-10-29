# Troubleshooting Name Matching Issues

## What Was Fixed ✅

### 1. Multi-Event Support
- **Before**: Only scraped the first race (Women's 6000m)
- **After**: Scrapes ALL races in the meet (Women's 6000m + Men's 10000m = 510 athletes)
- **Impact**: Men's athletes will now be found and matched

### 2. Gender Filtering
- **Before**: Only matched by name + school
- **After**: Matches by name + school + gender
- **Impact**: More accurate matching, prevents cross-gender mismatches

### 3. Improved Name Normalization
- Handles double spaces, apostrophes, hyphens
- Removes suffixes (Jr, Sr, II, III, IV)
- Better fuzzy matching for name variations

## Verified Working ✅

Test with NCAA DI Championships showed **perfect matching**:
```
Looking for: "Doris Lemngole" from "Alabama" (F)
  Comparing with: "Doris Lemngole" from "Alabama" (F)
    Name: true, School: true, Gender: true
  ✓ MATCHED: Place 1, Time: 19:21.0, Event: 6000m
```

## If Names Still Aren't Matching

Here are the most common causes:

### 1. **Athletes Not in This Meet**
**Symptom**: All athletes show "NO MATCH FOUND"

**Cause**: Your draft has athletes from a different meet than the URL you entered.

**How to Check**:
1. Click "Debug Data" button in the UI
2. Look at "sampleLiveResults" to see who ran in this race
3. Verify your athletes are in that list

**Fix**: Use the correct PTTiming URL for the meet where your athletes competed.

---

### 2. **Name Format Mismatch**
**Symptom**: School matches but name doesn't

**Cause**: Your database has names in different format than PTTiming.

**Examples**:
- **Your DB**: "Smith, John" | **PTTiming**: "John Smith" ❌
- **Your DB**: "John Q. Smith" | **PTTiming**: "John Smith" ❌
- **Your DB**: "J. Smith" | **PTTiming**: "John Smith" ❌

**How to Check**:
```bash
cd server
node -e "
import db from './db/database.js';
const athletes = db.prepare('SELECT name, school, gender FROM athletes LIMIT 20').all();
athletes.forEach(a => console.log(\`\${a.name} (\${a.school}) - \${a.gender || 'NO GENDER'}\`));
"
```

**Fix**: Update your database to use "FirstName LastName" format:
```sql
-- Example: If names are "Last, First" format
UPDATE athletes SET name =
  TRIM(SUBSTR(name, INSTR(name, ',') + 1)) || ' ' || TRIM(SUBSTR(name, 1, INSTR(name, ',') - 1))
WHERE name LIKE '%,%';
```

---

### 3. **Missing Gender Field**
**Symptom**: Name + School match but still no match

**Cause**: Gender field is empty or incorrect in your database.

**How to Check**:
```bash
cd server
node -e "
import db from './db/database.js';
const noGender = db.prepare('SELECT COUNT(*) as count FROM athletes WHERE gender IS NULL OR gender = \"\"').get();
console.log('Athletes without gender:', noGender.count);
"
```

**Fix**: Run the gender assignment script:
```bash
cd server
node scripts/add-draft-gender.js
```

Or manually add gender to the schema and update records.

---

### 4. **School Name Variations**
**Symptom**: Name matches but school doesn't

**Cause**: School names are in different formats.

**Examples**:
- **Your DB**: "University of Oregon" | **PTTiming**: "Oregon" ✅ (fuzzy match should work)
- **Your DB**: "UO" | **PTTiming**: "Oregon" ❌ (too different)
- **Your DB**: "Oregon State" | **PTTiming**: "Oregon" ❌ (different schools!)

**How to Check**: Look at the debug output and compare school names.

**Fix**: Update school names in your database to match common abbreviations:
```sql
UPDATE athletes SET school = 'Oregon' WHERE school IN ('University of Oregon', 'U of Oregon');
UPDATE athletes SET school = 'Oregon St' WHERE school IN ('Oregon State University', 'OSU');
```

---

### 5. **Special Characters**
**Symptom**: Similar names don't match

**Examples**:
- **Your DB**: "O'Brien" | **PTTiming**: "OBrien" ✅ (apostrophe handling works)
- **Your DB**: "José García" | **PTTiming**: "Jose Garcia" ❌ (accents might cause issues)

**Fix**: Remove accents from your database:
```sql
UPDATE athletes SET name = REPLACE(REPLACE(REPLACE(name, 'é', 'e'), 'á', 'a'), 'í', 'i');
```

---

## Debug Checklist

When names aren't matching, follow these steps:

1. **Start Live Tracking** with your PTTiming URL

2. **Check Server Logs**:
   ```bash
   cd server
   npm start
   ```
   Look for lines like:
   ```
   Looking for: "John Smith" from "Oregon" (M)
     Comparing with: "Jon Smith" from "Oregon" (M)
       Name: false, School: true, Gender: true
     ✗ NO MATCH FOUND
   ```

3. **Click "Debug Data"** in the UI to see:
   - Complete list of live results
   - Your team rosters
   - Potential matches for each athlete

4. **Compare**:
   - ✅ Name format: "FirstName LastName"
   - ✅ School names are similar
   - ✅ Gender is present and correct
   - ✅ Athlete actually ran in this meet

5. **Common Issues**:
   - Last name matches but first name is initial only
   - School is abbreviated differently
   - Gender field is missing
   - Athlete didn't compete in this specific meet

---

## Still Having Issues?

If you've checked everything above and still having problems:

1. **Share the debug output**:
   - Click "Debug Data" in UI
   - Copy the JSON output
   - Look at the "potentialMatches" for your athletes

2. **Share a specific example**:
   ```
   Your DB: "John Smith" from "Oregon" (M)
   PTTiming Results: "Jonathan Smith" from "Oregon" (M)
   Match Status: ✗ NO MATCH
   ```

3. **Check the matching logic**:
   The current logic requires:
   - Name match (exact or fuzzy)
   - School match (exact or fuzzy)
   - Gender match (if both have gender data)

   If ANY of these fail, no match occurs.

---

## Quick Test

Run this to verify scraping works:
```bash
cd server
curl "https://live.pttiming.com/xc-ptt.html?mid=7388" | head -20
```

You should see "Loading Data" or similar HTML content (not an error).

Then test the scraper:
```bash
cd server
node -e "
import { scrapePTTimingResults } from './utils/pttiming-scraper.js';
scrapePTTimingResults('https://live.pttiming.com/xc-ptt.html?mid=7388').then(data => {
  console.log('Results:', data.results.length);
  console.log('Sample:', data.results[0]);
});
"
```

Should output: `Results: 510` (or similar)
