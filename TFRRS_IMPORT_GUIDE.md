# TFRRS Data Import Guide

This guide explains how to import real NCAA Division I cross country data from TFRRS.org into your draft app.

## What is TFRRS?

TFRRS (Track & Field Results Reporting System) at [tfrrs.org](https://www.tfrrs.org/) is the official results database for college track and field and cross country in the United States. It contains:

- Complete meet results for all NCAA divisions
- Athlete profiles with season bests and PRs
- Historical performance data
- Rankings and qualifying lists

## Quick Start: Import 2024 NCAA Championships

The easiest way to get started is to import the 2024 NCAA Division I Championship results:

1. **Install dependencies** (if you haven't already):
   ```bash
   cd /Users/jack/cross-country-draft
   npm install --workspace=server
   ```

2. **Start the app**:
   ```bash
   npm run dev
   ```

3. **Navigate to Import Data**:
   - Open http://localhost:3000
   - Click "Import Data" in the navigation menu

4. **Import NCAA Championships**:
   - Find "Ncaa Di Championships" in the list
   - Click "Import Results"
   - Wait 1-2 minutes for the import to complete

5. **Start drafting**:
   - Go to "Athletes" to see all imported runners
   - Create a draft and start picking!

## What Gets Imported

When you import a meet from TFRRS, the system automatically:

### Athletes
- ✅ Name
- ✅ School/University
- ✅ Race time
- ✅ Personal record (if time is faster than existing PR)
- ✅ TFRRS profile URL

### Meet Results
- ✅ Meet name and date
- ✅ Finish place for each athlete
- ✅ Time for each athlete
- ✅ Complete results ranking

### Automatic Updates
- PRs are automatically updated if an athlete runs a faster time
- Duplicate athletes (same name and school) are not re-created
- Meet results link to existing athletes in your database

## Available 2024 Meets

The app comes pre-configured with these major 2024 meets:

| Meet | Description |
|------|-------------|
| **NCAA DI Championships** | National championship meet (Nov 23, 2024) |
| **Northeast Regional** | Regional qualifying meet |
| **Mid-Atlantic Regional** | Regional qualifying meet |
| **Mountain Regional** | Regional qualifying meet |
| **West Regional** | Regional qualifying meet |
| **South Regional** | Regional qualifying meet |
| **Great Lakes Regional** | Regional qualifying meet |

## Importing Custom Meets

You can import ANY NCAA D1 cross country meet from TFRRS:

### Step 1: Find the Meet URL

1. Go to [xc.tfrrs.org](https://xc.tfrrs.org/)
2. Search for your desired meet
3. Copy the meet URL from your browser
   - Example: `https://tfrrs.org/results/xc/25256/SEC_Cross_Country_Championships`

### Step 2: Import the Meet

1. In the app, click "Import Data"
2. Scroll to "Import Custom Meet"
3. Paste the TFRRS URL
4. (Optional) Enter a custom meet name and date
5. Click "Import Meet"

### Popular Conference Championships

Here are URLs for major 2024 conference championships:

- **SEC**: `https://www.tfrrs.org/results/xc/25256/SEC_Cross_Country_Championships`
- **Big Ten**: `https://www.tfrrs.org/results/xc/25240/Big_Ten_Cross_Country_Championships`
- **ACC**: `https://www.tfrrs.org/results/xc/25195/ACC_Cross_Country_Championships`
- **Pac-12**: `https://www.tfrrs.org/results/xc/25252/Pac_12_Cross_Country_Championships`

## For 2025 Championships

The 2025 NCAA Cross Country Championships will be held on **Saturday, November 22, 2025**.

To import 2025 data when it becomes available:

1. After the championships conclude, visit [xc.tfrrs.org](https://xc.tfrrs.org/)
2. Find the 2025 NCAA DI Championships meet page
3. Copy the URL
4. Import using the "Custom Meet" option in your app

## Troubleshooting

### Import Fails or Times Out

**Problem**: TFRRS blocks automated requests if you import too frequently.

**Solution**:
- Wait 5-10 minutes before trying again
- Import one meet at a time
- TFRRS uses rate limiting to prevent server overload

### Athletes Have Wrong Gender

**Problem**: The scraper defaults athletes to 'M' (male) gender.

**Solution**:
- You can manually update athlete gender in the Athletes page
- Future versions may auto-detect based on race type

### Some Athletes Missing

**Problem**: Not all athletes from a meet are imported.

**Solution**:
- The scraper only imports athletes with complete data (name, school, time)
- DNS (Did Not Start) and DNF (Did Not Finish) athletes are typically excluded
- Check the import results summary to see how many athletes were imported

### Duplicate Athletes

**Problem**: Same athlete appears multiple times.

**Solution**:
- The system matches athletes by name AND school
- If a runner transferred schools, they may appear twice
- Manually delete duplicates from the Athletes page if needed

## Technical Details

### How Scraping Works

1. **HTTP Request**: The app sends a request to the TFRRS meet URL
2. **HTML Parsing**: Uses Cheerio to parse the results table
3. **Data Extraction**: Extracts athlete names, schools, places, and times
4. **Database Import**: Saves athletes and results to your SQLite database
5. **PR Updates**: Compares times and updates personal records

### Rate Limiting

TFRRS doesn't have a public API, so we use web scraping. The app includes:
- 1-second delay between requests
- User-Agent headers to identify requests
- Respectful scraping practices

### Data Privacy

- All scraped data is public information from TFRRS
- Data is stored locally in your SQLite database
- No data is sent to external servers
- Athlete TFRRS profile URLs are preserved for reference

## Best Practices

1. **Import Strategically**: Import the meets most relevant to your draft
2. **Start with Championships**: Import NCAA Championships first for top athletes
3. **Conference Meets**: Import conference championships for deeper athlete pools
4. **Check Before Drafting**: Navigate to Athletes to verify import was successful
5. **One at a Time**: Import meets one at a time to avoid rate limiting

## Future Enhancements

Potential improvements for the TFRRS import feature:

- [ ] Auto-detect athlete gender from race divisions
- [ ] Import athlete biographical data (grade, hometown)
- [ ] Scheduled imports for upcoming meets
- [ ] Import women's and men's races separately
- [ ] Historical season tracking (import multiple seasons)
- [ ] Export athlete data to CSV

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify the TFRRS URL is correct and accessible
3. Wait a few minutes if rate-limited
4. File an issue on GitHub with meet URL and error message

## Resources

- **TFRRS Homepage**: https://www.tfrrs.org/
- **Cross Country Results**: https://xc.tfrrs.org/
- **NCAA XC Rankings**: https://www.ncaa.com/sports/cross-country-men/d1
- **USTFCCCA Rankings**: https://www.ustfccca.org/team-rankings-polls-central

---

Happy drafting! 🏃‍♂️🏃‍♀️
