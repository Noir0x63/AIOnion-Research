import * as cheerio from 'cheerio';

/**
 * Factory to create the TorDex Search Tool.
 * Implements Dependency Injection.
 * 
 * @param {Object} params
 * @param {Function} params.torFetch The configured Tor fetch client
 * @returns {Object} The tool definition and executor
 */
export function createSearchTordexTool({ torFetch }) {
  if (!torFetch) {
    throw new Error('createSearchTordexTool: torFetch client is required.');
  }

  const ONION_URL = 'http://tordexu73joywapk2txdr54jed4imqledpcvcuf75qsas2gwdgksvnyd.onion/';

  /**
   * Internal parser for TorDex's search results page.
   * Pure function.
   * 
   * @param {string} html 
   * @returns {Array<Object>}
   */
  function parseResults(html) {
    const $ = cheerio.load(html);
    const results = [];

    // TorDex results are typically listed in table rows (tr) or division containers.
    // We try to capture anchors pointing to .onion sites along with their adjacent text.
    $('tr, div.result, li').each((_, element) => {
      const links = $(element).find('a');
      links.each((__, link) => {
        const href = $(link).attr('href');
        const title = $(link).text().trim();
        
        // Ensure it's a valid link and looks like an onion site
        if (href && (href.includes('.onion') || href.startsWith('/'))) {
          const description = $(element).text().replace(title, '').replace(/\s+/g, ' ').trim();
          results.push({
            title: title || 'Onion Site',
            href,
            description: description.substring(0, 150)
          });
        }
      });
    });

    // Deduplicate results by href
    const uniqueResults = [];
    const seen = new Set();
    for (const res of results) {
      if (!seen.has(res.href)) {
        seen.add(res.href);
        uniqueResults.push(res);
      }
    }

    return uniqueResults.slice(0, 10);
  }

  return {
    name: 'search_tordex',
    description: 'Searches TorDex (an uncensored dark web search engine) for .onion sites matching a query.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search terms or keywords to query in TorDex.'
        }
      },
      required: ['query']
    },

    /**
     * Executes the search on TorDex.
     */
    async execute({ query }) {
      if (!query || query.trim() === '') {
        return 'Error: Search query cannot be empty.';
      }

      const encodedQuery = encodeURIComponent(query);
      // TorDex typically accepts queries via search?q= or /?q=
      const searchUrl = `${ONION_URL}?q=${encodedQuery}`;

      try {
        console.log(`[Tor Agent] Searching TorDex Onion Site: ${searchUrl}`);
        const response = await torFetch(searchUrl, { timeout: 20000 });

        if (!response.ok) {
          throw new Error(`TorDex responded with status ${response.status}`);
        }

        const html = await response.text();
        const results = parseResults(html);

        if (results.length === 0) {
          return 'No results found on TorDex.';
        }

        return JSON.stringify(results, null, 2);
      } catch (error) {
        return `Error: TorDex search failed: ${error.message}. Note that TorDex is often offline or has high latency.`;
      }
    }
  };
}
