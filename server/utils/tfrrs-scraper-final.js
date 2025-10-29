import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Scrape individual athlete results from TFRRS - FIXED VERSION
 * Handles multi-race pages and correct column parsing
 */
export async function scrapeMeetResults(meetUrl, targetGender = null) {
  try {
    await delay(2000);

    const response = await fetch(meetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    console.log('Parsing TFRRS individual results...');
    console.log(`Target gender: ${targetGender || 'any'}`);

    const results = [];
    let raceDistance = '5K';
    let detectedGender = null;

    // TFRRS pages often have multiple races (Men's and Women's)
    // We need to find the correct section based on gender

    // Look for division/section headers that indicate Men vs Women
    let $targetSection = null;

    if (targetGender) {
      // Find section headers
      $('h3, h2, .custom-table-title, div[class*="header"]').each((i, header) => {
        const headerText = $(header).text().toLowerCase();
        const isMatch = targetGender === 'M'
          ? (headerText.includes('men') && !headerText.includes('women'))
          : headerText.includes('women');

        if (isMatch) {
          console.log(`Found ${targetGender === 'M' ? 'men\'s' : 'women\'s'} section: ${$(header).text()}`);
          // Get the next table after this header
          $targetSection = $(header).nextAll('table').first();

          // Also check for distance in header
          if (headerText.includes('10k') || headerText.includes('10,000') || headerText.includes('10000')) {
            raceDistance = '10K';
          } else if (headerText.includes('8k') || headerText.includes('8,000') || headerText.includes('8000')) {
            raceDistance = '8K';
          } else if (headerText.includes('6k') || headerText.includes('6,000') || headerText.includes('6000')) {
            raceDistance = '6K';
          }

          return false; // break
        }
      });
    }

    // If no section found, use the largest table
    if (!$targetSection || $targetSection.length === 0) {
      console.log('No specific section found, using largest table');
      let maxRows = 0;
      $('table').each((i, table) => {
        const rowCount = $(table).find('tbody tr, tr').length;
        if (rowCount > maxRows) {
          maxRows = rowCount;
          $targetSection = $(table);
        }
      });
    }

    if (!$targetSection || $targetSection.length === 0) {
      throw new Error('Could not find results table on page');
    }

    console.log('Found results table');

    // Analyze table headers to find column positions
    const headers = [];
    $targetSection.find('thead th, th').each((i, th) => {
      headers.push($(th).text().trim().toLowerCase());
    });

    console.log('Table headers:', headers);

    // Find column indices
    const placeCol = headers.findIndex(h => h.includes('pl') || h.includes('place'));
    const nameCol = headers.findIndex(h => h.includes('name') || h.includes('athlete'));
    const yearCol = headers.findIndex(h => h.includes('yr') || h.includes('year') || h === 'class');
    const teamCol = headers.findIndex(h => h.includes('team') || h.includes('school'));

    // TIME column - NOT pace! Look for "time" or "finish"
    const timeCol = headers.findIndex(h =>
      (h.includes('time') || h.includes('finish')) &&
      !h.includes('pace') &&
      !h.includes('gun')
    );

    console.log('Column indices:', { placeCol, nameCol, yearCol, teamCol, timeCol });

    if (timeCol === -1) {
      console.warn('Could not find Time column. Available columns:', headers);
      throw new Error('Could not find Time column in results table. Please check the meet page format.');
    }

    // Parse results
    $targetSection.find('tbody tr, tr').each((i, row) => {
      const $row = $(row);
      const cells = $row.find('td');

      if (cells.length < 4) return;

      // Get data from specific columns
      const place = placeCol >= 0 ? cells.eq(placeCol).text().trim() : cells.eq(0).text().trim();
      const $nameCell = nameCol >= 0 ? cells.eq(nameCol) : cells.eq(1);
      const year = yearCol >= 0 ? cells.eq(yearCol).text().trim() : cells.eq(2).text().trim();
      const school = teamCol >= 0 ? cells.eq(teamCol).text().trim() : cells.eq(3).text().trim();
      const time = timeCol >= 0 ? cells.eq(timeCol).text().trim() : '';

      // Get athlete name and URL
      const $nameLink = $nameCell.find('a[href*="/athletes/"]').first();
      if ($nameLink.length === 0) return; // Not an athlete row

      const name = $nameLink.text().trim();
      const athleteUrl = $nameLink.attr('href');

      // Validate data
      if (!name || !time || !school) return;
      if (name === name.toUpperCase() && name.length < 10) return; // Skip team names
      if (name.split(' ').length < 2) return; // Need first + last name

      // Clean time - remove extra info
      let cleanTime = time.split('(')[0].trim().split(' ')[0];

      // Skip invalid times
      if (['DNS', 'DNF', 'DQ', 'NT', '--'].includes(cleanTime)) return;

      // Parse time - should be MM:SS.s format for XC
      const timeSeconds = convertTimeToSeconds(cleanTime);
      if (!timeSeconds || timeSeconds === 0) return;

      // Sanity check: XC times should be 13-40 minutes (780-2400 seconds)
      // If time is < 10 minutes, it's probably pace or wrong data
      if (timeSeconds < 600) {
        console.warn(`Skipping suspicious time for ${name}: ${cleanTime} (${timeSeconds}s - too fast for XC)`);
        return;
      }

      // Parse year to grade
      let grade = null;
      let yearDisplay = year;
      if (year) {
        const yearUpper = year.toUpperCase();
        if (yearUpper.includes('FR') || yearUpper === '1') {
          grade = 9;
          yearDisplay = 'FR';
        } else if (yearUpper.includes('SO') || yearUpper === '2') {
          grade = 10;
          yearDisplay = 'SO';
        } else if (yearUpper.includes('JR') || yearUpper === '3') {
          grade = 11;
          yearDisplay = 'JR';
        } else if (yearUpper.includes('SR') || yearUpper === '4') {
          grade = 12;
          yearDisplay = 'SR';
        }
      }

      results.push({
        place: parseInt(place) || results.length + 1,
        name,
        athleteUrl: athleteUrl ? `https://www.tfrrs.org${athleteUrl}` : null,
        year: yearDisplay,
        grade,
        school,
        time: cleanTime,
        timeSeconds,
        raceDistance
      });
    });

    console.log(`Parsed ${results.length} individual athlete results (${raceDistance})`);

    if (results.length === 0) {
      throw new Error('No individual athlete results found. Check the meet URL and format.');
    }

    if (results.length < 10) {
      throw new Error(`Only found ${results.length} results. This may not be the correct race or table.`);
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
 * Convert time string to seconds
 */
function convertTimeToSeconds(timeStr) {
  if (!timeStr) return null;

  timeStr = timeStr.trim().replace(/[^\d:.]/g, '');
  const parts = timeStr.split(':');

  try {
    if (parts.length === 2) {
      // MM:SS.ss format (XC standard)
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
    } else if (parts.length === 1 && parts[0].includes('.')) {
      // SS.ss format (very short, probably pace)
      return null;
    }
  } catch (e) {
    return null;
  }

  return null;
}

/**
 * Updated season meets with explicit gender targeting
 */
export const CURRENT_SEASON_MEETS = {
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
  sec_champs_men: {
    url: 'https://www.tfrrs.org/results/xc/25256/SEC_Cross_Country_Championships',
    name: '2024 SEC Championships - Men 8K',
    date: '2024-10-25',
    gender: 'M',
    distance: '8K'
  },
  sec_champs_women: {
    url: 'https://www.tfrrs.org/results/xc/25256/SEC_Cross_Country_Championships',
    name: '2024 SEC Championships - Women 6K',
    date: '2024-10-25',
    gender: 'F',
    distance: '6K'
  }
};

export function validateTFRRSUrl(url) {
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes('tfrrs.org')) {
      return { valid: false, error: 'URL must be from tfrrs.org domain' };
    }
    if (!urlObj.pathname.includes('/results/xc/')) {
      return { valid: false, error: 'URL must be a cross country results page (/results/xc/)' };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

export default {
  scrapeMeetResults,
  validateTFRRSUrl,
  CURRENT_SEASON_MEETS
};
