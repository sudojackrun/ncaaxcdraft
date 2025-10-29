import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Scrape TFRRS - WORKING VERSION based on actual page structure
 */
export async function scrapeMeetResults(meetUrl, targetGender = null) {
  try {
    await delay(2000);

    const response = await fetch(meetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    console.log('Parsing TFRRS results...');
    console.log(`Target gender: ${targetGender || 'any'}`);

    // Extract meet metadata
    let meetName = 'Unknown Meet';
    let meetDate = null;

    // Strategy 1: Try to get meet name from h1
    const h1Text = $('h1').first().text().trim();
    if (h1Text && h1Text.length > 0) {
      meetName = h1Text;
    }

    // Strategy 2: Try page title
    if (meetName === 'Unknown Meet') {
      const titleText = $('title').text().trim();
      if (titleText) {
        // Remove " - TFRRS" suffix if present
        meetName = titleText.replace(/\s*-\s*TFRRS\s*$/i, '').trim();
      }
    }

    // Strategy 3: Look for .panel-heading-normal-text
    if (meetName === 'Unknown Meet') {
      const panelHeading = $('.panel-heading-normal-text').first().text().trim();
      if (panelHeading) {
        meetName = panelHeading;
      }
    }

    console.log(`Extracted meet name: "${meetName}"`);

    // Extract meet date - try multiple strategies
    // Strategy 1: Look in common date containers
    const dateContainers = ['.meet-date', '.date', '.panel-heading-normal-text', 'h2', 'h3', '.breadcrumb'];

    for (const selector of dateContainers) {
      if (meetDate) break;

      $(selector).each((i, elem) => {
        if (meetDate) return false;

        const text = $(elem).text().trim();

        // Try different date patterns
        // Pattern 1: "Nov 23, 2024" or "November 23, 2024"
        let dateMatch = text.match(/\b([A-Z][a-z]+\.?\s+\d{1,2},?\s+\d{4})\b/i);

        // Pattern 2: "11/23/2024" or "11-23-2024"
        if (!dateMatch) {
          dateMatch = text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/);
        }

        // Pattern 3: "2024-11-23" (ISO format)
        if (!dateMatch) {
          dateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
        }

        if (dateMatch) {
          meetDate = dateMatch[1];
          console.log(`Found date "${meetDate}" in ${selector}`);
          return false; // break
        }
      });
    }

    // Strategy 2: Parse from URL if it contains date info
    if (!meetDate) {
      // Some TFRRS URLs have dates in them
      const urlDateMatch = meetUrl.match(/(\d{4})[_\-\/](\d{2})[_\-\/](\d{2})/);
      if (urlDateMatch) {
        meetDate = `${urlDateMatch[1]}-${urlDateMatch[2]}-${urlDateMatch[3]}`;
        console.log(`Extracted date from URL: ${meetDate}`);
      }
    }

    console.log(`Final extracted date: ${meetDate || 'not found'}`);

    const results = [];
    let raceDistance = '5K';

    // Find all tables
    const tables = $('table').toArray();
    console.log(`Found ${tables.length} tables on page`);

    // Find the correct table based on:
    // 1. Must have NAME column (individual results, not team results)
    // 2. If targetGender specified, check preceding header

    for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
      const $table = $(tables[tableIndex]);

      // Get headers
      const headers = [];
      $table.find('thead th, th').each((i, th) => {
        headers.push($(th).text().trim());
      });

      console.log(`Table ${tableIndex} headers:`, headers);

      // Check if this is an individual results table
      const hasName = headers.some(h => h.toUpperCase() === 'NAME');
      const hasTime = headers.some(h => h.toUpperCase() === 'TIME');

      if (!hasName || !hasTime) {
        console.log(`Table ${tableIndex} skipped (team results or wrong format)`);
        continue;
      }

      // This is an individual results table!
      // Find the nearest preceding header to determine gender

      let precedingHeader = '';

      // Strategy 1: Look for h3 immediately before this table
      let $current = $table.prev();
      let searchDepth = 0;
      while ($current.length > 0 && searchDepth < 10) {
        if ($current.is('h3') || $current.hasClass('custom-table-title')) {
          const text = $current.text().trim().toLowerCase();
          if (text.includes('individual') || text.includes('results')) {
            precedingHeader = text;
            break;
          }
        }
        $current = $current.prev();
        searchDepth++;
      }

      // Strategy 2: Check parent's previous siblings
      if (!precedingHeader) {
        const $parent = $table.parent();
        $parent.prevAll('h3, .custom-table-title, h2').each((i, header) => {
          const text = $(header).text().trim().toLowerCase();
          if (text.includes('individual') || text.includes('results')) {
            precedingHeader = text;
            return false; // break on first match
          }
        });
      }

      // Strategy 3: Find closest h3 before this table in the whole document
      if (!precedingHeader) {
        const allH3s = $('h3, h2').toArray();
        const tableIndex_inDoc = tables.indexOf($table[0]);

        for (let i = allH3s.length - 1; i >= 0; i--) {
          const h3Text = $(allH3s[i]).text().trim().toLowerCase();
          const h3Index = $('*').toArray().indexOf(allH3s[i]);
          const currentTableElementIndex = $('*').toArray().indexOf($table[0]);

          if (h3Index < currentTableElementIndex && (h3Text.includes('individual') || h3Text.includes('results'))) {
            precedingHeader = h3Text;
            break;
          }
        }
      }

      console.log(`Table ${tableIndex} preceding header: "${precedingHeader}"`);

      // Determine gender and distance from header (table-specific)
      let tableGender = null;
      let tableDistance = '5K'; // Default for this table

      const headerLower = precedingHeader.toLowerCase();

      // Detect gender
      if (headerLower.includes('women')) {
        tableGender = 'F';
      } else if (headerLower.includes('men') && !headerLower.includes('women')) {
        tableGender = 'M';
      }

      // Detect distance (independent of gender)
      if (headerLower.includes('10k') || headerLower.includes('10,000') || headerLower.includes('10000')) {
        tableDistance = '10K';
      } else if (headerLower.includes('8k') || headerLower.includes('8,000') || headerLower.includes('8000')) {
        tableDistance = '8K';
      } else if (headerLower.includes('6k') || headerLower.includes('6,000') || headerLower.includes('6000')) {
        tableDistance = '6K';
      } else if (headerLower.includes('5k') || headerLower.includes('5,000') || headerLower.includes('5000')) {
        tableDistance = '5K';
      }

      console.log(`Table ${tableIndex} detected gender: ${tableGender}, distance: ${tableDistance}`);

      // If we have a target gender but couldn't detect table gender, skip this table
      if (targetGender && !tableGender) {
        console.log(`Table ${tableIndex} skipped (couldn't detect gender, target is ${targetGender})`);
        continue;
      }

      // If we have a target gender, skip if this doesn't match
      if (targetGender && tableGender && tableGender !== targetGender) {
        console.log(`Table ${tableIndex} skipped (wrong gender: ${tableGender} !== ${targetGender})`);
        continue;
      }

      // If no target gender specified but we detected one, use it
      if (!targetGender && tableGender) {
        console.log(`Using detected gender: ${tableGender}`);
      }

      // Parse this table!
      console.log(`Parsing table ${tableIndex} as ${tableGender || 'unknown gender'} ${tableDistance} results`);

      // Update global raceDistance for this table
      raceDistance = tableDistance;

      // Find column indices
      const plCol = headers.findIndex(h => h.toUpperCase() === 'PL' || h.toUpperCase() === 'PLACE');
      const nameCol = headers.findIndex(h => h.toUpperCase() === 'NAME');
      const yearCol = headers.findIndex(h => h.toUpperCase() === 'YEAR' || h.toUpperCase() === 'YR');
      const teamCol = headers.findIndex(h => h.toUpperCase() === 'TEAM' || h.toUpperCase() === 'SCHOOL');
      const timeCol = headers.findIndex(h => h.toUpperCase() === 'TIME' && !h.toLowerCase().includes('total'));

      console.log(`Column indices: PL=${plCol}, NAME=${nameCol}, YEAR=${yearCol}, TEAM=${teamCol}, TIME=${timeCol}`);

      if (nameCol === -1 || timeCol === -1) {
        console.log('Missing required columns, skipping table');
        continue;
      }

      // Parse rows
      $table.find('tbody tr, tr').each((i, row) => {
        const $row = $(row);
        const cells = $row.find('td');

        if (cells.length < 5) return;

        const place = plCol >= 0 ? cells.eq(plCol).text().trim() : '';
        const name = cells.eq(nameCol).text().trim();
        const year = yearCol >= 0 ? cells.eq(yearCol).text().trim() : '';
        const team = teamCol >= 0 ? cells.eq(teamCol).text().trim() : '';
        const time = cells.eq(timeCol).text().trim();

        // Validate
        if (!name || !time || !team) return;
        if (name === 'NAME') return; // Skip header row

        // Parse time
        const timeSeconds = convertTimeToSeconds(time);
        if (!timeSeconds || timeSeconds < 600) return; // Skip invalid or too-short times

        // Parse year/grade - store as college year text (FR, SO, JR, SR)
        let gradeText = null;
        if (year) {
          if (year.includes('FR')) { gradeText = 'FR'; }
          else if (year.includes('SO')) { gradeText = 'SO'; }
          else if (year.includes('JR')) { gradeText = 'JR'; }
          else if (year.includes('SR')) { gradeText = 'SR'; }
        }

        results.push({
          place: parseInt(place) || results.length + 1,
          name,
          grade: gradeText,
          school: team,
          time,
          timeSeconds,
          raceDistance: tableDistance,  // Use table-specific distance
          gender: tableGender
        });
      });

      // If we found results and have a target gender, we're done
      if (results.length > 0 && targetGender) {
        console.log(`Found ${results.length} results for ${targetGender} in table ${tableIndex}`);
        break;
      }
    }

    if (results.length === 0) {
      throw new Error('No individual athlete results found. Check the meet URL and format.');
    }

    console.log(`Total parsed: ${results.length} athletes (${raceDistance})`);
    console.log(`Meet: ${meetName}`);
    console.log(`Date: ${meetDate || 'not found'}`);

    return {
      meetUrl,
      meetName,
      meetDate,
      results,
      raceDistance,
      scrapedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error scraping meet:', error.message);
    throw error;
  }
}

function convertTimeToSeconds(timeStr) {
  if (!timeStr) return null;

  timeStr = timeStr.trim().replace(/[^\d:.]/g, '');
  const parts = timeStr.split(':');

  try {
    if (parts.length === 2) {
      // MM:SS.ss
      const mins = parseInt(parts[0]);
      const secs = parseFloat(parts[1]);
      if (isNaN(mins) || isNaN(secs)) return null;
      return mins * 60 + secs;
    } else if (parts.length === 3) {
      // HH:MM:SS
      const hrs = parseInt(parts[0]);
      const mins = parseInt(parts[1]);
      const secs = parseFloat(parts[2]);
      if (isNaN(hrs) || isNaN(mins) || isNaN(secs)) return null;
      return hrs * 3600 + mins * 60 + secs;
    }
  } catch (e) {
    return null;
  }

  return null;
}

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
