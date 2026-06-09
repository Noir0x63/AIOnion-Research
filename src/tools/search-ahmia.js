import * as cheerio from 'cheerio';

/**
 * Factory to create the Ahmia Search Tool.
 * Implements Dependency Injection of the Tor-routed fetch client.
 * 
 * @param {Object} params
 * @param {Function} params.torFetch The configured Tor fetch client
 * @returns {Object} The tool definition and executor
 */
export function createSearchAhmiaTool({ torFetch }) {
  if (!torFetch) {
    throw new Error('createSearchAhmiaTool: torFetch client is required.');
  }

  const ONION_BASE_URL = 'http://juhanurmihxlp77nkq76byazcldy2hlmovfu2epvl5ankdibsot4csyd.onion/';
  const CLEARNET_BASE_URL = 'https://ahmia.fi/';

  /**
   * Fetches the home page of Ahmia to retrieve the dynamic anti-bot honeypot parameters.
   * 
   * @param {string} baseUrl 
   * @returns {Promise<Object|null>}
   */
  async function fetchHoneypotParams(baseUrl) {
    try {
      const response = await torFetch(baseUrl, { timeout: 15000 });
      if (!response.ok) {
        return null;
      }
      const html = await response.text();
      const $ = cheerio.load(html);
      const hiddenInput = $('#searchForm input[type="hidden"]');
      const name = hiddenInput.attr('name');
      const value = hiddenInput.attr('value');
      
      if (name && value) {
        return { name, value };
      }
    } catch (error) {
      console.warn(`[Tor Agent] Warning: Failed to retrieve anti-bot honeypot from ${baseUrl}: ${error.message}`);
    }
    return null;
  }

  /**
   * Internal parser for Ahmia's search results page.
   * Pure function.
   * 
   * @param {string} html 
   * @returns {Array<Object>}
   */
  function parseResults(html) {
    const $ = cheerio.load(html);
    const results = [];

    $('.result').each((_, element) => {
      const titleLinkObj = $(element).find('a').first();
      const title = titleLinkObj.text().trim();
      const href = titleLinkObj.attr('href');
      const description = $(element).find('p').text().trim();

      if (title && href) {
        results.push({ title, href, description });
      }
    });

    return results;
  }

  return {
    name: 'search_ahmia',
    description: 'Searches the Tor network for .onion sites matching a query. Returns a list of titles, URLs, and snippets.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search terms or keywords to query in the dark web.'
        },
        useClearnetFallback: {
          type: 'boolean',
          description: 'If true, queries the clearnet version of Ahmia over Tor if the .onion site is unreachable.'
        }
      },
      required: ['query']
    },

    /**
     * Executes the search.
     * Uses guard clauses and clean error handling.
     */
    async execute({ query, useClearnetFallback = true }) {
      if (!query || query.trim() === '') {
        return 'Error: Search query cannot be empty.';
      }

      const encodedQuery = encodeURIComponent(query);

      try {
        console.log(`[Tor Agent] Getting anti-bot token from Onion home...`);
        const honeypot = await fetchHoneypotParams(ONION_BASE_URL);
        
        let onionSearchUrl = `${ONION_BASE_URL}search/?q=${encodedQuery}`;
        if (honeypot) {
          onionSearchUrl += `&${honeypot.name}=${honeypot.value}`;
          console.log(`[Tor Agent] Appended honeypot token: ${honeypot.name}=${honeypot.value}`);
        }

        console.log(`[Tor Agent] Searching Ahmia Onion Site: ${onionSearchUrl}`);
        const response = await torFetch(onionSearchUrl);

        if (!response.ok) {
          throw new Error(`Onion Search failed with status ${response.status}`);
        }

        const html = await response.text();
        const results = parseResults(html);

        if (results.length === 0) {
          return 'No results found on Ahmia Onion.';
        }

        return JSON.stringify(results, null, 2);
      } catch (onionError) {
        console.warn(`[Tor Agent] Onion search failed: ${onionError.message}`);
        
        if (!useClearnetFallback) {
          return `Error: Onion search failed: ${onionError.message}`;
        }

        try {
          console.log(`[Tor Agent] Getting anti-bot token from Clearnet home...`);
          const honeypot = await fetchHoneypotParams(CLEARNET_BASE_URL);

          let clearnetSearchUrl = `${CLEARNET_BASE_URL}search/?q=${encodedQuery}`;
          if (honeypot) {
            clearnetSearchUrl += `&${honeypot.name}=${honeypot.value}`;
            console.log(`[Tor Agent] Appended honeypot token: ${honeypot.name}=${honeypot.value}`);
          }

          console.log(`[Tor Agent] Falling back to Ahmia Clearnet over Tor: ${clearnetSearchUrl}`);
          const response = await torFetch(clearnetSearchUrl);

          if (!response.ok) {
            throw new Error(`Clearnet Search failed with status ${response.status}`);
          }

          const html = await response.text();
          const results = parseResults(html);

          if (results.length === 0) {
            return 'No results found on Ahmia (clearnet fallback).';
          }

          return JSON.stringify(results, null, 2);
        } catch (clearnetError) {
          return `Error: Both Tor Onion and Clearnet search queries failed. Onion: ${onionError.message}. Clearnet: ${clearnetError.message}`;
        }
      }
    }
  };
}
