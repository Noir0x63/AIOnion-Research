import dotenv from 'dotenv';
import { createTorFetch } from './utils/tor-client.js';

dotenv.config();

async function runTest() {
  const proxyUrl = process.env.TOR_PROXY_URL || 'socks5h://127.0.0.1:9150';
  console.log(`[Tor Verification] Using proxy URL: ${proxyUrl}`);
  console.log('[Tor Verification] Attempting to connect to check.torproject.org...');

  try {
    const torFetch = createTorFetch({ proxyUrl });
    const response = await torFetch('https://check.torproject.org/api/ip');
    
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('\n[Tor Verification] SUCCESS!');
    console.log(`Your Tor IP: ${data.IsTor ? '✓ (Tor Exit Node)' : '✗ (NOT Tor)'} - ${data.IP}`);
    
    if (data.IsTor) {
      console.log('Your connection is successfully routed through the Tor network.');
    } else {
      console.warn('WARNING: Connected, but check.torproject.org reports this IP is NOT a Tor exit node.');
    }
  } catch (error) {
    console.error('\n[Tor Verification] FAILED.');
    console.error(`Error details: ${error.message}`);
    console.error('\nSuggestions:');
    console.error('1. Make sure Tor Browser is running and connected.');
    console.error('2. Verify the port in your .env file matches Tor Browser (usually 9150) or Tor Service (usually 9050).');
  }
}

runTest();
