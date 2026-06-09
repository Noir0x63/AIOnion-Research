import * as cheerio from 'cheerio';

/**
 * Factory to create the Fetch Onion Page Tool.
 * Implements Dependency Injection of the Tor-routed fetch client.
 * 
 * @param {Object} params
 * @param {Function} params.torFetch The configured Tor fetch client
 * @returns {Object} The tool definition and executor
 */
export function createFetchOnionTool({ torFetch }) {
  if (!torFetch) {
    throw new Error('createFetchOnionTool: torFetch client is required.');
  }

  /**
   * Cleans HTML content to extract readable text for LLM consumption.
   * Pure function.
   * 
   * @param {string} html 
   * @returns {string} Clean text content
   */
  function cleanHtml(html) {
    const $ = cheerio.load(html);

    // Remove noise elements
    $('script, style, iframe, noscript, svg, nav, footer, header').remove();

    // Get plain text and normalize whitespace
    return $('body')
      .text()
      .replace(/\s+/g, ' ')
      .trim();
  }

  return {
    name: 'fetch_onion_page',
    description: 'Retrieves the text content of any .onion or web page over Tor. Useful to inspect search result details.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The absolute URL (e.g. http://3g2upl4pq6kufc4m.onion/) to fetch.'
        }
      },
      required: ['url']
    },

    /**
     * Executes the page retrieval.
     */
    async execute({ url }) {
      if (!url) {
        return 'Error: URL parameter is required.';
      }

      // Guard Clause: Tor v2 addresses (16 characters) are deprecated and disabled
      const onionMatch = url.match(/([a-z2-7]+)\.onion/i);
      if (onionMatch) {
        const address = onionMatch[1];
        if (address.length === 16) {
          return `Error: The onion address "${url}" is a Tor v2 address (16 characters). Tor v2 was deprecated in late 2021 and is completely disabled. Modern Tor relays and proxies reject these connections. Do NOT attempt to query v2 onion sites. Only v3 onion sites (56 characters) are active. Please look for alternative v3 sites or report that this address is obsolete.`;
        }
      }

      try {
        console.log(`[Tor Agent] Fetching page content: ${url}`);
        const response = await torFetch(url);

        if (!response.ok) {
          return `Error: Failed to fetch page. Status: ${response.status}`;
        }

        const html = await response.text();
        const cleanedText = cleanHtml(html);

        // Limit response length to prevent overloading LLM context
        const maxLength = 6000;
        if (cleanedText.length > maxLength) {
          return cleanedText.substring(0, maxLength) + '\n\n[Content Truncated due to length limits]';
        }

        return cleanedText || 'Error: Page contains no readable text content.';
      } catch (error) {
        return `Error fetching page: ${error.message}`;
      }
    }
  };
}
