# Quick Import Setup Guide

Your app now has **automatic data import** from TFRRS! Here's how to get real NCAA D1 cross country data.

## Installation

Install the new scraping dependencies:

```bash
cd /Users/jack/cross-country-draft
npm install --workspace=server
```

This installs `cheerio` and `node-fetch` for web scraping.

## Start the App

```bash
npm run dev
```

Open http://localhost:3000

## Import Data (3 Options)

### Option 1: Single Meet Import (RECOMMENDED)

**Best for avoiding rate limits**

1. Go to "Import Data" in the navigation
2. Under "2024-2025 Season Meets", find the meet you want
3. Click "Import Results" on that meet
4. Wait 1-2 minutes
5. Done! Check the "Athletes" page to see your new runners

**Top meets to import:**
- NCAA DI Championships (Nov 23, 2024) - 250+ top athletes
- SEC Championships - Top SEC conference runners
- Big Ten Championships - Top Big Ten runners

### Option 2: Auto-Import Multiple Meets

**WARNING: May get rate-limited by TFRRS**

1. Go to "Import Data"
2. Check the boxes next to meets you want
3. Click "Auto-Import Selected"
4. Wait 2-3 minutes per meet (can take 15-30 min total)
5. If it fails with rate limiting, wait 10 minutes and try again

### Option 3: Custom Meet URL

**For any TFRRS meet not in the predefined list**

1. Go to https://xc.tfrrs.org/
2. Find your desired meet (e.g., a conference championship)
3. Copy the full URL from your browser
   - Example: `https://www.tfrrs.org/results/xc/25256/SEC_Cross_Country_Championships`
4. Paste into "Import Custom Meet" section
5. Click "Import Meet"

## Troubleshooting

### "TFRRS is blocking requests"

**Solution**: TFRRS uses rate limiting. Wait 5-10 minutes and try again.
- Don't import more than 2-3 meets in a row
- Use single meet import instead of auto-import
- Try during off-peak hours (early morning or late evening)

### "URL must contain /results/xc/"

**Solution**: Make sure you're using a results page URL, not a rankings or team page.
- ✅ Good: `https://www.tfrrs.org/results/xc/25334/NCAA_DI_Championships`
- ❌ Bad: `https://www.tfrrs.org/` (homepage)
- ❌ Bad: `https://www.tfrrs.org/teams/` (teams page)

### No results imported / Empty database

**Solution**:
1. Check the browser console (F12) for errors
2. Verify the TFRRS URL loads in your browser
3. The meet may not have results posted yet
4. Try a different meet

### Athletes have wrong gender

**Solution**: The scraper defaults to 'M' (male). You can:
1. Manually update gender on the Athletes page
2. Import both men's and women's races separately

## What Gets Imported

For each meet you import:
- ✅ **Athletes**: Name, school, time
- ✅ **Results**: Place, time for each athlete
- ✅ **PRs**: Personal records (auto-updated if faster)
- ✅ **TFRRS Links**: Profile URLs for reference

## Best Practices

1. **Start small**: Import 1-2 key meets first
2. **Import championships**: NCAA/Conference championships have the best athletes
3. **Wait between imports**: Give TFRRS a break (30-60 seconds minimum)
4. **Check Athletes page**: Verify import worked before starting a draft
5. **One meet at a time**: Avoid auto-import if possible

## Recommended Import Strategy

For the **2025 Championships draft**, import in this order:

1. **NCAA DI Championships** (Nov 2024)
   - Has the absolute best runners
   - ~250 top NCAA athletes

2. **Your favorite conference** (e.g., SEC, Big Ten)
   - Adds depth to specific schools
   - Another ~150-200 athletes

3. **Regionals** (optional)
   - For even more depth
   - Adds lesser-known but solid runners

This gives you **400-500 real D1 runners** to draft from!

## For Future Seasons

When the **2025 NCAA Championships** happen (Nov 22, 2025):

1. After the meet, go to https://xc.tfrrs.org/
2. Find the "2025 NCAA DI Championships" page
3. Copy that URL
4. Import using "Custom Meet" option
5. You'll have fresh 2025 championship data!

## Technical Notes

- **Scraping method**: Uses Cheerio to parse TFRRS HTML
- **Rate limiting**: 2-second delays between requests
- **Duplicate handling**: Matches athletes by name + school
- **PR tracking**: Automatically updates when faster times found
- **Local storage**: All data saved in your SQLite database

## Need Help?

- Check the full **TFRRS_IMPORT_GUIDE.md** for detailed documentation
- Browser console (F12) shows detailed error messages
- Test imports with a single small meet first

---

**Ready to draft!** Once you've imported some meets, go to "Create New Draft" and start picking your team! 🏃‍♂️🏃‍♀️
