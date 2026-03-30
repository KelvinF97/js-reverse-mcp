import { createServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 1. Start a simple HTTP server to serve the fixture
const PORT = 8080;
const server = createServer((_req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Interaction Test</title>
      </head>
      <body>
        <h1>Interaction Test Page</h1>

        <button id="click-btn">Click Me</button>
        <div id="click-result">Not Clicked</div>

        <input type="text" id="type-input" placeholder="Type here...">
        <div id="type-result">Nothing typed</div>

        <div id="hover-box" style="width: 100px; height: 100px; background-color: lightgray;">Hover Me</div>
        <div id="hover-result">Not Hovered</div>

        <div style="height: 2000px;">Spacer</div>
        <div id="scroll-target">I am at the bottom</div>

        <script>
          document.getElementById('click-btn').addEventListener('click', () => {
            document.getElementById('click-result').textContent = 'Clicked!';
          });

          document.getElementById('type-input').addEventListener('input', event => {
            document.getElementById('type-result').textContent = 'Typed: ' + event.target.value;
          });

          document.getElementById('hover-box').addEventListener('mouseenter', () => {
            document.getElementById('hover-result').textContent = 'Hovered!';
          });
        </script>
      </body>
    </html>
  `);
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
      join(__dirname, '../src/index.js'),
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
    const text = content
      .filter((item: {type?: string}) => item.type === 'text')
      .map((item: {text: string}) => item.text)
      .join('\n');
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
