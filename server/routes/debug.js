import express from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const router = express.Router();

/**
 * Debug endpoint to inspect TFRRS page structure
 */
router.post('/inspect-tfrrs', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }

    console.log('Fetching page:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `HTTP ${response.status}`,
        message: response.statusText
      });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Collect diagnostic info
    const info = {
      url,
      status: 'success',
      pageTitle: $('title').text(),
      headers: [],
      tables: [],
      divs: []
    };

    // Find all headers
    $('h1, h2, h3, h4').each((i, el) => {
      const text = $(el).text().trim();
      if (text) {
        info.headers.push({
          tag: el.name,
          text: text.substring(0, 100)
        });
      }
    });

    // Find all tables
    $('table').each((i, table) => {
      const $table = $(table);
      const headers = [];
      const sampleRows = [];

      // Get headers
      $table.find('thead th, th').each((j, th) => {
        headers.push($(th).text().trim());
      });

      // Get first 3 data rows
      $table.find('tbody tr, tr').slice(0, 3).each((j, row) => {
        const cells = [];
        $(row).find('td').each((k, td) => {
          cells.push($(td).text().trim().substring(0, 50));
        });
        if (cells.length > 0) {
          sampleRows.push(cells);
        }
      });

      const rowCount = $table.find('tbody tr, tr').length;

      info.tables.push({
        index: i,
        headers: headers.length > 0 ? headers : ['No headers found'],
        rowCount,
        sampleRows: sampleRows.length > 0 ? sampleRows : [['No data rows found']]
      });
    });

    // Check for divs with class/id that might contain results
    $('div[class*="result"], div[id*="result"], div[class*="table"]').each((i, div) => {
      info.divs.push({
        class: $(div).attr('class'),
        id: $(div).attr('id'),
        text: $(div).text().trim().substring(0, 100)
      });
    });

    res.json(info);

  } catch (error) {
    console.error('Error inspecting page:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

export default router;
