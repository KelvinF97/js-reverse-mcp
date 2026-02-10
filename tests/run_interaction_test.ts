
import { spawn } from 'child_process';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 1. Start a simple HTTP server to serve the fixture
const PORT = 8080;
const server = createServer(async (req, res) => {
  try {
    const content = await readFile(join(__dirname, 'fixtures', 'interaction.html'));
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
  } catch (err) {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, async () => {
  console.log(`Test server running at http://localhost:${PORT}`);

  try {
    await runTests();
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
});

async function runTests() {
  console.log('Starting MCP server...');

  // 2. Connect to the MCP server
  const transport = new StdioClientTransport({
    command: 'node',
    args: [
      join(__dirname, '../build/src/index.js'),
      '--isolated=true',  // Use isolated profile
      '--headless=true'   // Run headless for tests
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

  // 3. List tools to verify our new tools are present
  const tools = await client.listTools();
  const toolNames = tools.tools.map(t => t.name);
  console.log('Available tools:', toolNames);

  if (!toolNames.includes('click_element')) throw new Error('click_element tool missing');
  if (!toolNames.includes('type_text')) throw new Error('type_text tool missing');
  if (!toolNames.includes('hover_element')) throw new Error('hover_element tool missing');

  // 4. Create a new page
  console.log('Creating new page...');
  await client.callTool({
    name: 'new_page',
    arguments: { url: `http://localhost:${PORT}` }
  });

  // Helper to extract JSON from markdown response
  function extractJsonResult(content: any): string {
    const text = content[0].text;
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error(`Could not parse JSON from response: ${text}`);
  }

  // 5. Test Click
  console.log('Testing click_element...');
  await client.callTool({
    name: 'click_element',
    arguments: { selector: '#click-btn' }
  });

  // Verify click result
  let result = await client.callTool({
    name: 'evaluate_script',
    arguments: { function: '() => document.getElementById("click-result").textContent' }
  });

  let textContent = extractJsonResult(result.content);
  if (textContent !== 'Clicked!') {
    throw new Error(`Click test failed. Expected "Clicked!", got "${textContent}"`);
  }
  console.log('✅ Click test passed');

  // 6. Test Type
  console.log('Testing type_text...');
  await client.callTool({
    name: 'type_text',
    arguments: { selector: '#type-input', text: 'Hello MCP' }
  });

  // Verify type result
  result = await client.callTool({
    name: 'evaluate_script',
    arguments: { function: '() => document.getElementById("type-result").textContent' }
  });
  textContent = extractJsonResult(result.content);
  if (textContent !== 'Typed: Hello MCP') {
    throw new Error(`Type test failed. Expected "Typed: Hello MCP", got "${textContent}"`);
  }
  console.log('✅ Type test passed');

  // 7. Test Hover
  console.log('Testing hover_element...');
  await client.callTool({
    name: 'hover_element',
    arguments: { selector: '#hover-box' }
  });

  // Verify hover result
  result = await client.callTool({
    name: 'evaluate_script',
    arguments: { function: '() => document.getElementById("hover-result").textContent' }
  });
  textContent = extractJsonResult(result.content);
  if (textContent !== 'Hovered!') {
    throw new Error(`Hover test failed. Expected "Hovered!", got "${textContent}"`);
  }
  console.log('✅ Hover test passed');

  // Cleanup
  await client.close();
}
