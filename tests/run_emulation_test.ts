
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createServer } from 'http';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 1. Start a simple HTTP server
const PORT = 8081;
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body>Mobile Test</body>
    </html>
  `);
});

server.listen(PORT, async () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  try {
    await runTests();
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
});

async function runTests() {
  console.log('Starting MCP server for Emulation Test...');

  // 1. Connect to the MCP server
  const transport = new StdioClientTransport({
    command: 'node',
    args: [
      join(__dirname, '../build/src/index.js'),
      '--isolated=true',
      '--headless=true'
    ]
  });

  const client = new Client({
    name: "test-client",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  await client.connect(transport);
  console.log('Connected to MCP server');

  // 2. List tools
  const tools = await client.listTools();
  const toolNames = tools.tools.map(t => t.name);
  if (!toolNames.includes('emulate_device')) throw new Error('emulate_device tool missing');

  // 3. Create a new page
  console.log('Creating new page...');
  await client.callTool({
    name: 'new_page',
    arguments: { url: `http://localhost:${PORT}` }
  });

  // Helper to extract JSON from markdown response
  function extractJsonResult(content: any): any {
    const text = content[0].text;
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error(`Could not parse JSON from response: ${text}`);
  }

  // 4. Test Emulate Device (iPhone 12)
  console.log('Testing emulate_device (iPhone 12)...');
  await client.callTool({
    name: 'emulate_device',
    arguments: { deviceName: 'iPhone 12' }
  });

  // Check User Agent
  let result = await client.callTool({
    name: 'evaluate_script',
    arguments: { function: '() => navigator.userAgent' }
  });
  let userAgent = extractJsonResult(result.content);
  console.log('User Agent:', userAgent);
  if (!userAgent.includes('iPhone')) {
    throw new Error(`Emulation failed. User agent should contain "iPhone", got "${userAgent}"`);
  }

  // Check Screen Width
  result = await client.callTool({
    name: 'evaluate_script',
    arguments: { function: '() => window.innerWidth' }
  });
  let width = extractJsonResult(result.content);
  console.log('Window Width:', width);
  if (width !== 390) {
    throw new Error(`Emulation failed. Expected iPhone 12 width 390, got ${width}`);
  }

  console.log('✅ iPhone 12 Emulation passed');

  // 5. Test Custom User Agent
  console.log('Testing set_user_agent...');
  const customUA = 'MyCustomBot/1.0';
  await client.callTool({
    name: 'set_user_agent',
    arguments: { userAgent: customUA }
  });

  result = await client.callTool({
    name: 'evaluate_script',
    arguments: { function: '() => navigator.userAgent' }
  });
  userAgent = extractJsonResult(result.content);
  if (userAgent !== customUA) {
    throw new Error(`Set User Agent failed. Expected "${customUA}", got "${userAgent}"`);
  }
  console.log('✅ Set User Agent passed');

  await client.close();
}
