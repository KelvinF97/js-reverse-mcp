
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to extract JSON from markdown response
function extractJsonResult(content: any): any {
  // If content is already an object/array, return it
  if (typeof content !== 'string' && !Array.isArray(content)) return content;

  const text = Array.isArray(content) ? content[0].text : content;

  // Try to find JSON block
  const match = text.match(/```json\n([\s\S]*?)\n```/);
  if (match) {
    return JSON.parse(match[1]);
  }

  // Try to parse direct text
  try {
    return JSON.parse(text);
  } catch (e) {
    return text; // Return raw text if not JSON
  }
}

async function main() {
  console.log('🚀 Starting JS Reverse MCP for XHS Analysis...');

  // 1. Launch MCP Server
  const transport = new StdioClientTransport({
    command: 'node',
    args: [
      join(__dirname, '../build/src/index.js'),
      '--isolated=true', // Use isolated profile to avoid conflicts
      '--headless=false', // Show browser window!
      '--chrome-arg=--window-size=390,930' // Force window size
    ]
  });

  const client = new Client({
    name: "xhs-analyzer",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  await client.connect(transport);
  console.log('✅ Connected to MCP server');

  try {
    // 2. Open a blank page first (so we can set UA before loading the real site)
    console.log('📄 Creating blank page...');
    await client.callTool({
      name: 'new_page',
      arguments: { url: 'about:blank' }
    });

    // 3. Emulate iPhone 12
    console.log('📱 Emulating iPhone 12...');
    await client.callTool({
      name: 'emulate_device',
      arguments: { deviceName: 'iPhone 12' }
    });

    // 4. Navigate to Xiaohongshu
    console.log('🌐 Opening Xiaohongshu...');
    await client.callTool({
      name: 'navigate_page',
      arguments: { url: 'https://www.xiaohongshu.com/explore' }
    });

    console.log('⏳ Waiting 10 seconds for page load and requests...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 4. List Network Requests
    console.log('🔍 Analyzing network requests...');
    const result = await client.callTool({
      name: 'list_network_requests',
      arguments: {
        pageSize: 100,
        resourceTypes: ['xhr', 'fetch']
      }
    });

    // The result from list_network_requests is usually a text list.
    // We need to parse it to find request IDs.
    // Format is like: "reqid=123 GET https://..."
    const textContent = result.content[0].text;
    const requestLines = textContent.split('\n').filter(line => line.startsWith('reqid='));

    console.log(`Found ${requestLines.length} requests.`);

    for (const line of requestLines) {
      // Parse reqid and url
      const match = line.match(/reqid=(\d+) (\w+) (https?:\/\/[^\s]+)/);
      if (!match) continue;

      const [_, reqidStr, method, url] = match;
      const reqid = parseInt(reqidStr);

      // Filter interesting URLs
      if (url.includes('api') || url.includes('sns')) {
        console.log(`\nChecking request: ${method} ${url}`);

        // Get details (Headers)
        const details = await client.callTool({
          name: 'get_network_request',
          arguments: { reqid }
        });

        const detailsText = details.content[0].text;

        // Check for signature headers
        if (detailsText.includes('x-s:') || detailsText.includes('x-t:')) {
          console.log('🚨 FOUND SIGNED REQUEST! 🚨');
          console.log(`URL: ${url}`);
          console.log('Headers found in response:');

          const lines = detailsText.split('\n');
          const headers = lines.filter(l => l.trim().startsWith('- x-'));
          headers.forEach(h => console.log(`  ${h.trim()}`));

          // Optional: Get initiator
          // const initiator = await client.callTool({
          //   name: 'get_request_initiator',
          //   arguments: { requestId: reqid }
          // });
          // console.log('Initiator:', initiator);
        }
      }
    }

    console.log('\nAnalysis complete. Press Ctrl+C to exit (browser will close).');
    // Keep alive to let user inspect
    await new Promise(() => {});

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
