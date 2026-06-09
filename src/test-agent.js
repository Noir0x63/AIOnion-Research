import dotenv from 'dotenv';
import { createTorFetch } from './utils/tor-client.js';
import { VeniceLlmService } from './services/llm.js';
import { createSearchAhmiaTool } from './tools/search-ahmia.js';
import { createSearchTordexTool } from './tools/search-tordex.js';
import { createFetchOnionTool } from './tools/fetch-onion.js';
import { TorAgentEngine } from './agent.js';

dotenv.config();

async function runTestAgent() {
  const apiKey = process.env.VENICE_API_KEY;
  const model = process.env.VENICE_MODEL || 'deepseek-v4-flash';
  const proxyUrl = process.env.TOR_PROXY_URL || 'socks5h://127.0.0.1:9150';

  console.log('[Test Run] Initializing Agent...');
  
  const torFetch = createTorFetch({ proxyUrl });
  const llmService = new VeniceLlmService({
    apiKey,
    model,
    fetchInstance: fetch
  });

  const searchTool = createSearchAhmiaTool({ torFetch });
  const tordexTool = createSearchTordexTool({ torFetch });
  const fetchTool = createFetchOnionTool({ torFetch });

  const agent = new TorAgentEngine({
    llmService,
    tools: [searchTool, tordexTool, fetchTool],
    maxIterations: 3 // Small limit for test run
  });

  const query = 'Encuentra directorios o índices de sitios onion en Ahmia';
  console.log(`[Test Run] Sending query: "${query}"`);

  try {
    const result = await agent.run(query);
    console.log('\n==================================================');
    console.log('              TEST RUN RESULT                     ');
    console.log('==================================================');
    console.log(result);
    console.log('==================================================\n');
  } catch (error) {
    console.error(`\n[Test Run Error]: ${error.message}`);
  }
}

runTestAgent();
