import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Scrape individual athlete results from TFRRS meet (not team scores)
 */
export async function scrapeMeetResults(meetUrl) {
  try {
    await delay(2000);

    const response = await fetch(meetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    console.log('Parsing TFRRS individual results...');

    const results = [];
    let raceDistance = '5K'; // Default

    // TFRRS has multiple tables - we need the INDIVIDUAL results, not team scores
    // Look for tables with specific headers that indicate individual results
    let $resultsTable = null;

    // Try to find the individual results table by looking for header text
    $('table').each((i, table) => {
      const $table = $(table);
      const headerText = $table.find('thead th, th').text().toLowerCase();

      // Individual results tables have these headers
      // Team results tables just have "Place", "Team", "Score"
      if (headerText.includes('name') ||
          headerText.includes('athlete') ||
          headerText.includes('runner') ||
          (headerText.includes('place') && headerText.includes('time') && headerText.includes('team'))) {

        // Make sure it's not the team scores table
        if (!headerText.includes('total') && !headerText.includes('team score')) {
          $resultsTable = $table;
          console.log('Found individual results table');
          return false; // break
        }
      }
    });

    // Fallback: Look for the largest table (individual results usually have more rows)
    if (!$resultsTable) {
      let maxRows = 0;
      $('table').each((i, table) => {
        const rowCount = $(table).find('tbody tr, tr').length;
        if (rowCount > maxRows) {
          maxRows = rowCount;
          $resultsTable = $(table);
        }
      });
      console.log(`Using largest table with ${maxRows} rows`);
    }

    if (!$resultsTable || $resultsTable.length === 0) {
      throw new Error('Could not find individual results table on page');
    }

    // Try to detect race distance from page title or headers
    const pageTitle = $('h1, h2, .page-title, title').text();
    if (pageTitle.includes('6K') || pageTitle.includes('6000')) {
      raceDistance = '6K';
    } else if (pageTitle.includes('8K') || pageTitle.includes('8000')) {
      raceDistance = '8K';
    } else if (pageTitle.includes('10K') || pageTitle.includes('10000')) {
      raceDistance = '10K';
    }

    // Parse individual athlete results
    $resultsTable.find('tbody tr, tr').each((i, row) => {
      const $row = $(row);
      const cells = $row.find('td');

      // Skip header rows and rows with too few columns
      if (cells.length < 4) return;

      // Check if this is a team row (team rows typically don't have athlete names)
      const firstCellText = cells.eq(0).text().trim();
      const secondCellText = cells.eq(1).text().trim();

      // Skip if first cell is not a number (likely a header)
      if (firstCellText && isNaN(parseInt(firstCellText))) return;

      // Common TFRRS individual format:
      // Column 0: Place
      // Column 1: Name (with link to athlete profile)
      // Column 2: Year/Grade
      // Column 3: Team/School
      // Column 4: Time
      // Sometimes Column 5: Additional info (pace, etc)

      let place, name, year, school, time, athleteUrl, gender;

      // Look for athlete name (usually has a link)
      const $nameLink = cells.eq(1).find('a').first();

      if ($nameLink.length > 0 && $nameLink.attr('href')?.includes('/athletes/')) {
        // This is an athlete link - we're in the right table!
        place = cells.eq(0).text().trim();
        name = $nameLink.text().trim();
        athleteUrl = $nameLink.attr('href');
        year = cells.eq(2).text().trim();

        // School can be in column 3 or 4 depending on format
        const col3 = cells.eq(3).text().trim();
        const col4 = cells.eq(4).text().trim();
        const col5 = cells.eq(5)?.text().trim();

        // Check which column has the time (time format: MM:SS)
        if (col3 && col3.match(/\d+:\d+/)) {
          school = cells.eq(3).find('a').text().trim() || cells.eq(3).text().trim();
          time = col3;
        } else if (col4 && col4.match(/\d+:\d+/)) {
          school = cells.eq(3).find('a').text().trim() || cells.eq(3).text().trim();
          time = col4;
        } else if (col5 && col5.match(/\d+:\d+/)) {
          school = cells.eq(4).find('a').text().trim() || cells.eq(4).text().trim();
          time = col5;
        } else {
          // Can't find time, skip this row
          return;
        }
      } else {
        // No athlete link found - might be team results or different format
        // Skip this row
        return;
      }

      // Validate we have minimum required data
      if (!name || !time || !school) return;

      // Skip if name looks like a team name (usually ALL CAPS or very short)
      if (name === name.toUpperCase() && name.length < 10) return;
      if (name.split(' ').length < 2) return; // Athletes usually have first + last name

      // Clean up time (remove extra info like '(PR)' or pace)
      time = time.split('(')[0].trim().split(' ')[0];

      // Skip DNS, DNF, DQ entries
      if (['DNS', 'DNF', 'DQ', 'NT', '--'].includes(time)) return;

      const timeSeconds = convertTimeToSeconds(time);
      if (!timeSeconds || timeSeconds === 0) return;

      // Try to parse year/grade
      let grade = null;
      if (year) {
        if (year.includes('FR') || year.includes('1')) grade = 9;
        else if (year.includes('SO') || year.includes('2')) grade = 10;
        else if (year.includes('JR') || year.includes('3')) grade = 11;
        else if (year.includes('SR') || year.includes('4')) grade = 12;
      }

      results.push({
        place: parseInt(place) || results.length + 1,
        name,
        athleteUrl: athleteUrl ? `https://www.tfrrs.org${athleteUrl}` : null,
        year,
        grade,
        school,
        time,
        timeSeconds,
        raceDistance
      });
    });

    console.log(`Parsed ${results.length} individual athlete results (${raceDistance})`);

    if (results.length === 0) {
      throw new Error('No individual athlete results found. Page may contain only team scores.');
    }

    // Validate we got athletes, not teams
    if (results.length < 10) {
      throw new Error('Too few results found. This may not be an individual results page.');
    }

    return {
      meetUrl,
      results,
      raceDistance,
      scrapedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error scraping meet:', error.message);
    throw error;
  }
}

/**
 * Convert time string to seconds (handles multiple formats)
 */
function convertTimeToSeconds(timeStr) {
  if (!timeStr) return null;

  // Remove any non-time characters
  timeStr = timeStr.trim().replace(/[^\d:.]/g, '');

  const parts = timeStr.split(':');

  try {
    if (parts.length === 2) {
      // MM:SS.ss format (most common for XC)
      const mins = parseInt(parts[0]);
      const secs = parseFloat(parts[1]);
      if (isNaN(mins) || isNaN(secs)) return null;
      return mins * 60 + secs;
    } else if (parts.length === 3) {
      // HH:MM:SS format
      const hrs = parseInt(parts[0]);
      const mins = parseInt(parts[1]);
      const secs = parseFloat(parts[2]);
      if (isNaN(hrs) || isNaN(mins) || isNaN(secs)) return null;
      return hrs * 3600 + mins * 60 + secs;
    } else if (parts.length === 1) {
      // Just seconds
      const secs = parseFloat(parts[0]);
      if (isNaN(secs)) return null;
      return secs;
    }
  } catch (e) {
    return null;
  }

  return null;
}

/**
 * 2024-2025 Season Meet URLs
 */
export const CURRENT_SEASON_MEETS = {
  // NCAA Championships - November 23, 2024
  ncaa_di_champs_men: {
    url: 'https://www.tfrrs.org/results/xc/25334/NCAA_DI_Championships',
    name: '2024 NCAA DI Championships - Men 10K',
    date: '2024-11-23',
    gender: 'M',
    distance: '10K'
  },
  ncaa_di_champs_women: {
    url: 'https://www.tfrrs.org/results/xc/25334/NCAA_DI_Championships',
    name: '2024 NCAA DI Championships - Women 6K',
    date: '2024-11-23',
    gender: 'F',
    distance: '6K'
  },

  // Conference Championships
  sec_champs_men: {
    url: 'https://www.tfrrs.org/results/xc/25256/SEC_Cross_Country_Championships',
    name: '2024 SEC Championships - Men',
    date: '2024-10-25',
    gender: 'M',
    distance: '8K'
  },
  sec_champs_women: {
    url: 'https://www.tfrrs.org/results/xc/25256/SEC_Cross_Country_Championships',
    name: '2024 SEC Championships - Women',
    date: '2024-10-25',
    gender: 'F',
    distance: '6K'
  },
  big_ten_champs: {
    url: 'https://www.tfrrs.org/results/xc/25240/Big_Ten_Cross_Country_Championships',
    name: '2024 Big Ten Championships',
    date: '2024-10-27',
    gender: 'M',
    distance: '8K'
  },
  acc_champs: {
    url: 'https://www.tfrrs.org/results/xc/25195/ACC_Cross_Country_Championships',
    name: '2024 ACC Championships',
    date: '2024-10-25',
    gender: 'M',
    distance: '8K'
  },
  pac12_champs: {
    url: 'https://www.tfrrs.org/results/xc/25252/Pac_12_Cross_Country_Championships',
    name: '2024 Pac-12 Championships',
    date: '2024-10-25',
    gender: 'M',
    distance: '8K'
  }
};

/**
 * Validate TFRRS URL format
 */
export function validateTFRRSUrl(url) {
  try {
    const urlObj = new URL(url);

    if (!urlObj.hostname.includes('tfrrs.org')) {
      return {
        valid: false,
        error: 'URL must be from tfrrs.org domain'
      };
    }

    if (!urlObj.pathname.includes('/results/xc/')) {
      return {
        valid: false,
        error: 'URL must be a cross country results page (/results/xc/)'
      };
    }

    return { valid: true };

  } catch (e) {
    return {
      valid: false,
      error: 'Invalid URL format'
    };
  }
}

export default {
  scrapeMeetResults,
  validateTFRRSUrl,
  CURRENT_SEASON_MEETS
};
