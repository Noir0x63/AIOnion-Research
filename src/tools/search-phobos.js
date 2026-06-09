import * as cheerio from 'cheerio';

/**
 * Factory to create the Phobos Search Tool.
 * Implements Dependency Injection of the Tor-routed fetch client.
 * 
 * @param {Object} params
 * @param {Function} params.torFetch The configured Tor fetch client
 * @returns {Object} The tool definition and executor
 */
export function createSearchPhobosTool({ torFetch }) {
  if (!torFetch) {
    throw new Error('createSearchPhobosTool: torFetch client is required.');
  }

  const ONION_BASE_URL = 'http://phobosxrrqfpt2n4cqqzxr3uj5ch44de4pp2akksu4amw6uszmgf2qad.onion/';

  /**
   * Internal parser for Phobos's HTML search results.
   * Resilient parsing targeting .onion links and sibling descriptions.
   * 
   * @param {string} html 
   * @returns {Array<Object>}
   */
  function parseResults(html) {
    const $ = cheerio.load(html);
    const results = [];

    // Phobos typically renders results inside divs, let's grab .onion links
    $('a').each((_, element) => {
      const href = $(element).attr('href');
      const title = $(element).text().trim();

      if (href && href.includes('.onion') && title && title.length > 2 && !title.toLowerCase().includes('phobos')) {
        // Fetch text from parent container
        const parentText = $(element).parent().text() || '';
        const description = parentText.replace(title, '').replace(href, '').replace(/\s+/g, ' ').trim();

        results.push({
          title,
          href,
          description: description.slice(0, 150)
        });
      }
    });

    // Deduplicate results
    const uniqueResults = [];
    const seenUrls = new Set();
    for (const r of results) {
      if (!seenUrls.has(r.href)) {
        seenUrls.add(r.href);
        uniqueResults.push(r);
      }
    }

    return uniqueResults;
  }

  return {
    name: 'search_phobos',
    description: 'Searches the Tor network using the Phobos search engine. Phobos is a fast, unmoderated onion search engine. Returns a list of titles, URLs, and snippets.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search keywords or phrase.'
        }
      },
      required: ['query']
    },

    /**
     * Executes the search.
     */
    async execute({ query }) {
      if (!query || query.trim() === '') {
        return 'Error: Search query cannot be empty.';
      }

      const encodedQuery = encodeURIComponent(query);
      const searchUrl = `${ONION_BASE_URL}?q=${encodedQuery}`;

      try {
        console.log(`[Tor Agent] Searching Phobos: ${searchUrl}`);
        const response = await torFetch(searchUrl, { timeout: 20000 });

        if (!response.ok) {
          throw new Error(`Search failed with status ${response.status}`);
        }

        const html = await response.text();
        const results = parseResults(html);

        if (results.length === 0) {
          return 'No results found on Phobos Search.';
        }

        return JSON.stringify(results.slice(0, 10), null, 2);
      } catch (error) {
        console.warn(`[Tor Agent] Phobos search failed: ${error.message}`);
        return `Error: Phobos search failed: ${error.message}`;
      }
    }
  };
}
