import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Improved TFRRS scraper with multiple format support
 */
export async function scrapeMeetResults(meetUrl) {
  try {
    await delay(2000); // Longer delay to avoid rate limiting

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

    console.log('Parsing TFRRS meet results...');

    const results = [];

    // Try multiple table selectors (TFRRS uses different formats)
    const tableSelectors = [
      'table.tablesaw',
      'table.results',
      'table',
      '.custom-table',
      '#results-table'
    ];

    let $table = null;
    for (const selector of tableSelectors) {
      $table = $(selector).first();
      if ($table.length > 0) {
        console.log(`Found results table with selector: ${selector}`);
        break;
      }
    }

    if (!$table || $table.length === 0) {
      throw new Error('Could not find results table on page');
    }

    // Parse table rows
    $table.find('tbody tr, tr').each((i, row) => {
      const $row = $(row);
      const cells = $row.find('td');

      if (cells.length < 4) return; // Skip header rows

      // Try to extract data from different column positions
      let place, name, year, school, time, athleteUrl;

      // Common format: Place | Name | Year | Team | Time
      const $nameCell = cells.eq(1).find('a').first();
      if ($nameCell.length > 0) {
        place = cells.eq(0).text().trim();
        name = $nameCell.text().trim();
        athleteUrl = $nameCell.attr('href');
        year = cells.eq(2).text().trim();
        school = cells.eq(3).find('a').text().trim() || cells.eq(3).text().trim();
        time = cells.eq(4).text().trim() || cells.eq(5).text().trim();
      } else {
        // Alternative format without links
        place = cells.eq(0).text().trim();
        name = cells.eq(1).text().trim();
        year = cells.eq(2).text().trim();
        school = cells.eq(3).text().trim();
        time = cells.eq(4).text().trim();
      }

      // Validate we have minimum required data
      if (!name || !time || !school) return;

      // Clean up time (remove extra info like '(PR)' or pace)
      time = time.split('(')[0].trim().split(' ')[0];

      // Skip DNS, DNF, DQ entries
      if (['DNS', 'DNF', 'DQ', 'NT', '--'].includes(time)) return;

      const timeSeconds = convertTimeToSeconds(time);
      if (!timeSeconds || timeSeconds === 0) return;

      results.push({
        place: parseInt(place) || results.length + 1,
        name,
        athleteUrl: athleteUrl ? `https://www.tfrrs.org${athleteUrl}` : null,
        year,
        school,
        time,
        timeSeconds
      });
    });

    console.log(`Parsed ${results.length} results from meet`);

    if (results.length === 0) {
      throw new Error('No valid results found in table');
    }

    return {
      meetUrl,
      results,
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
 * 2024-2025 Season Meet URLs - Updated with working format
 */
export const CURRENT_SEASON_MEETS = {
  // 2024 NCAA Championships (November 23, 2024)
  ncaa_di_champs_men: {
    url: 'https://www.tfrrs.org/results/xc/25334/NCAA_DI_Championships',
    name: '2024 NCAA DI Championships - Men',
    date: '2024-11-23',
    gender: 'M'
  },
  ncaa_di_champs_women: {
    url: 'https://www.tfrrs.org/results/xc/25334/NCAA_DI_Championships',
    name: '2024 NCAA DI Championships - Women',
    date: '2024-11-23',
    gender: 'F'
  },

  // Regional Championships
  northeast_regional: {
    url: 'https://www.tfrrs.org/results/xc/25031/NCAA_Division_I_Northeast_Region_Cross_Country_Championships',
    name: '2024 NCAA DI Northeast Regional',
    date: '2024-11-15',
    gender: 'M'
  },
  midatlantic_regional: {
    url: 'https://www.tfrrs.org/results/xc/25323/NCAA_Division_I_Mid-Atlantic_Region_Cross_Country_Championships',
    name: '2024 NCAA DI Mid-Atlantic Regional',
    date: '2024-11-15',
    gender: 'M'
  },

  // Major Conference Championships
  sec_champs: {
    url: 'https://www.tfrrs.org/results/xc/25256/SEC_Cross_Country_Championships',
    name: '2024 SEC Championships',
    date: '2024-10-25',
    gender: 'M'
  },
  big_ten_champs: {
    url: 'https://www.tfrrs.org/results/xc/25240/Big_Ten_Cross_Country_Championships',
    name: '2024 Big Ten Championships',
    date: '2024-10-27',
    gender: 'M'
  },
  acc_champs: {
    url: 'https://www.tfrrs.org/results/xc/25195/ACC_Cross_Country_Championships',
    name: '2024 ACC Championships',
    date: '2024-10-25',
    gender: 'M'
  },
  pac12_champs: {
    url: 'https://www.tfrrs.org/results/xc/25252/Pac_12_Cross_Country_Championships',
    name: '2024 Pac-12 Championships',
    date: '2024-10-25',
    gender: 'M'
  },
  big12_champs: {
    url: 'https://www.tfrrs.org/results/xc/25237/Big_12_Cross_Country_Championships',
    name: '2024 Big 12 Championships',
    date: '2024-10-25',
    gender: 'M'
  }
};

/**
 * Validate TFRRS URL format
 */
export function validateTFRRSUrl(url) {
  try {
    const urlObj = new URL(url);

    // Must be from tfrrs.org domain
    if (!urlObj.hostname.includes('tfrrs.org')) {
      return {
        valid: false,
        error: 'URL must be from tfrrs.org domain'
      };
    }

    // Must be a results page
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
