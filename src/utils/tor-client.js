import fetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';

/**
 * Factory to create a fetch client routed through Tor SOCKS5 proxy.
 * Implements Dependency Injection for proxy configuration.
 * 
 * @param {Object} config
 * @param {string} config.proxyUrl The SOCKS5 proxy URL (e.g. socks5h://127.0.0.1:9150)
 * @returns {Function} A configured fetch-like function
 */
export function createTorFetch({ proxyUrl }) {
  if (!proxyUrl) {
    throw new Error('Tor HTTP Client: proxyUrl is required.');
  }

  const agent = new SocksProxyAgent(proxyUrl);

  /**
   * Performs an HTTP request routed through Tor SOCKS5.
   * Uses guard clauses and clean error handling.
   * 
   * @param {string} url 
   * @param {Object} options 
   * @returns {Promise<Response>}
   */
  return async function torFetch(url, options = {}) {
    if (!url) {
      throw new Error('Tor Fetch: URL parameter is missing.');
    }

    const mergedOptions = {
      ...options,
      agent,
      // Default timeouts to avoid hanging indefinitely on slow .onion sites
      timeout: options.timeout ?? 30000,
    };

    try {
      const response = await fetch(url, mergedOptions);
      return response;
    } catch (error) {
      throw new Error(`Tor Fetch Error calling (${url}): ${error.message}`);
    }
  };
}
