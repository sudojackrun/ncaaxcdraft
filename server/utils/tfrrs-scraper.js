import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// TFRRS URLs for NCAA D1 Cross Country
const TFRRS_BASE = 'https://www.tfrrs.org';
const XC_BASE = 'https://xc.tfrrs.org';

// Add delay between requests to be respectful
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Scrape NCAA D1 meet results from TFRRS
 * @param {string} meetUrl - TFRRS meet URL (e.g., https://tfrrs.org/results/xc/25334/NCAA_DI_Championships)
 * @returns {Object} Meet data with results
 */
export async function scrapeMeetResults(meetUrl) {
  try {
    const response = await fetch(meetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch meet: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const results = [];

    // TFRRS results table structure
    $('table.results tbody tr').each((i, row) => {
      const $row = $(row);
      const place = $row.find('td:nth-child(1)').text().trim();
      const name = $row.find('td:nth-child(2) a').text().trim();
      const athleteUrl = $row.find('td:nth-child(2) a').attr('href');
      const year = $row.find('td:nth-child(3)').text().trim();
      const school = $row.find('td:nth-child(4) a').text().trim();
      const time = $row.find('td:nth-child(5)').text().trim();

      if (name && time) {
        results.push({
          place: parseInt(place) || null,
          name,
          athleteUrl: athleteUrl ? TFRRS_BASE + athleteUrl : null,
          year,
          school,
          time,
          timeSeconds: convertTimeToSeconds(time)
        });
      }
    });

    return {
      meetUrl,
      results,
      scrapedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error scraping meet results:', error);
    throw error;
  }
}

/**
 * Scrape athlete profile and season results from TFRRS
 * @param {string} athleteUrl - TFRRS athlete profile URL
 * @returns {Object} Athlete data
 */
export async function scrapeAthleteProfile(athleteUrl) {
  try {
    await delay(1000); // Be respectful with rate limiting

    const response = await fetch(athleteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch athlete: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const name = $('h3.panel-title-custom').first().text().trim();
    const school = $('.panel-heading-normal-text a').first().text().trim();

    // Extract PRs from the athlete page
    const prs = {};
    $('.best-marks tr').each((i, row) => {
      const $row = $(row);
      const event = $row.find('td:nth-child(1)').text().trim();
      const mark = $row.find('td:nth-child(2)').text().trim();
      if (event && mark) {
        prs[event] = mark;
      }
    });

    // Get season results
    const seasonResults = [];
    $('.season-results tbody tr').each((i, row) => {
      const $row = $(row);
      const date = $row.find('td:nth-child(1)').text().trim();
      const meet = $row.find('td:nth-child(2)').text().trim();
      const result = $row.find('td:nth-child(3)').text().trim();

      if (meet && result) {
        seasonResults.push({ date, meet, result });
      }
    });

    return {
      name,
      school,
      prs,
      seasonResults,
      profileUrl: athleteUrl,
      scrapedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error scraping athlete profile:', error);
    throw error;
  }
}

/**
 * Get NCAA D1 rankings list URL for a specific year
 * @param {number} year - Year (e.g., 2024)
 * @param {string} gender - 'm' or 'f'
 * @returns {string} Rankings URL
 */
export function getRankingsUrl(year, gender = 'm') {
  // TFRRS list IDs change each year - these would need to be updated
  // For 2024: list ID 4515
  return `${TFRRS_BASE}/lists/4515/${year}_NCAA_Division_I_Rankings?gender=${gender}`;
}

/**
 * Convert time string (MM:SS.ss or HH:MM:SS) to seconds
 * @param {string} timeStr - Time string
 * @returns {number} Total seconds
 */
function convertTimeToSeconds(timeStr) {
  if (!timeStr) return null;

  const parts = timeStr.split(':').map(p => parseFloat(p));

  if (parts.length === 2) {
    // MM:SS format
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // HH:MM:SS format
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return null;
}

/**
 * Convert seconds to time string (MM:SS)
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time
 */
export function formatTime(seconds) {
  if (!seconds) return '';

  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  return `${mins}:${secs.padStart(5, '0')}`;
}

/**
 * Predefined TFRRS meet URLs for 2024-2025 season
 */
export const TFRRS_MEETS_2024 = {
  ncaa_di_championships: 'https://tfrrs.org/results/xc/25334/NCAA_DI_Championships',
  northeast_regional: 'https://tfrrs.org/results/xc/25031/NCAA_Division_I_Northeast_Region_Cross_Country_Championships',
  midatlantic_regional: 'https://www.tfrrs.org/results/xc/25323/NCAA_Division_I_Mid-Atlantic_Region_Cross_Country_Championships',
  mountain_regional: 'https://www.tfrrs.org/results/xc/25030/NCAA_Division_I_Mountain_Region_Cross_Country_Championships',
  west_regional: 'https://www.tfrrs.org/results/xc/25035/NCAA_Division_I_West_Region_Cross_Country_Championships',
  south_regional: 'https://indiana.tfrrs.org/results/xc/25320/NCAA_Division_I_South_Region_Cross_Country_Championships',
  great_lakes_regional: 'https://www.tfrrs.org/results/xc/25027/NCAA_Division_I_Great_Lakes_Region_Cross_Country_Championships',
};

export default {
  scrapeMeetResults,
  scrapeAthleteProfile,
  getRankingsUrl,
  formatTime,
  TFRRS_MEETS_2024
};
