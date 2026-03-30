
import { createServer } from 'http';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 8082;
const server = createServer((req, res) => {
  const pathname = req.url ?? '/';

  if (pathname === '/first') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`
      <!DOCTYPE html>
      <html>
        <body>
          <h1>First Page</h1>
        </body>
      </html>
    `);
    return;
  }

  if (pathname === '/second') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`
      <!DOCTYPE html>
      <html>
        <body>
          <h1>Second Page</h1>
        </body>
      </html>
    `);
    return;
  }

  if (pathname === '/init-script') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="boot-result"></div>
          <script>
            document.getElementById('boot-result').textContent =
              window.__bootValue ?? 'missing';
          </script>
        </body>
      </html>
    `);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, async () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  let exitCode = 0;

  try {
    await runTests();
    console.log('✅ Page navigation tests passed');
  } catch (error) {
    console.error('Test failed:', error);
    exitCode = 1;
  } finally {
    server.close();
    process.exit(exitCode);
  }
});

function extractJsonResult(content: any): any {
  const text = content[0].text;
  const match = text.match(/```json\n([\s\S]*?)\n```/);
  if (match) {
    return JSON.parse(match[1]);
  }
  throw new Error(`Could not parse JSON from response: ${text}`);
}

function extractPages(content: any): Array<{idx: number; url: string; selected: boolean}> {
  const text = content[0].text;
  return text
    .split('\n')
    .map((line: string) => line.trim())
    .filter((line: string) => /^\d+: /.test(line))
    .map((line: string) => {
      const match = line.match(/^(\d+): (.+?)( \[selected\])?$/);
      if (!match) {
        throw new Error(`Could not parse page line: ${line}`);
      }
      return {
        idx: Number(match[1]),
        url: match[2],
        selected: Boolean(match[3]),
      };
    });
}

async function runTests() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: [
      join(__dirname, '../src/index.js'),
      '--isolated=true',
      '--headless=true',
    ],
  });

  const client = new Client(
    {
      name: 'pages-test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    },
  );

  await client.connect(transport);

  const tools = await client.listTools();
  const toolNames = tools.tools.map(tool => tool.name);

  if (!toolNames.includes('close_page')) {
    throw new Error('close_page tool missing');
  }
  if (!toolNames.includes('navigate_page')) {
    throw new Error('navigate_page tool missing');
  }

  const initialPagesResult = await client.callTool({
    name: 'list_pages',
    arguments: {},
  });
  const initialPages = extractPages(initialPagesResult.content);

  await client.callTool({
    name: 'new_page',
    arguments: {url: `http://localhost:${PORT}/first`},
  });
  await client.callTool({
    name: 'new_page',
    arguments: {url: `http://localhost:${PORT}/second`},
  });

  const beforeCloseResult = await client.callTool({
    name: 'list_pages',
    arguments: {},
  });
  const beforeClosePages = extractPages(beforeCloseResult.content);
  const selectedPageBeforeClose = beforeClosePages.find(page => page.selected);

  if (!selectedPageBeforeClose?.url.includes('/second')) {
    throw new Error(
      `Expected the selected page to be /second before closing, got ${selectedPageBeforeClose?.url}`,
    );
  }

  await client.callTool({
    name: 'close_page',
    arguments: {pageIdx: selectedPageBeforeClose.idx},
  });

  const afterCloseResult = await client.callTool({
    name: 'list_pages',
    arguments: {},
  });
  const afterClosePages = extractPages(afterCloseResult.content);
  const selectedPageAfterClose = afterClosePages.find(page => page.selected);

  if (afterClosePages.length !== beforeClosePages.length - 1) {
    throw new Error(
      `Expected close_page to reduce page count by 1, got ${beforeClosePages.length} -> ${afterClosePages.length}`,
    );
  }

  if (afterClosePages.some(page => page.url.includes('/second'))) {
    throw new Error('The closed /second page still appears in list_pages output.');
  }

  if (!selectedPageAfterClose) {
    throw new Error('Expected a selected page after closing the current page.');
  }

  const selectedHrefResult = await client.callTool({
    name: 'evaluate_script',
    arguments: {function: '() => window.location.href'},
  });
  const selectedHref = extractJsonResult(selectedHrefResult.content);

  if (selectedHref.includes('/second')) {
    throw new Error('Selected page was not updated after close_page.');
  }

  await client.callTool({
    name: 'navigate_page',
    arguments: {
      url: `http://localhost:${PORT}/init-script`,
      initScript: 'window.__bootValue = "init-script-ran";',
    },
  });

  const bootValueResult = await client.callTool({
    name: 'evaluate_script',
    arguments: {
      function: '() => document.getElementById("boot-result")?.textContent',
    },
  });
  const bootValue = extractJsonResult(bootValueResult.content);

  if (bootValue !== 'init-script-ran') {
    throw new Error(
      `Expected initScript to run before page scripts, got "${bootValue}"`,
    );
  }

  const finalPagesResult = await client.callTool({
    name: 'list_pages',
    arguments: {},
  });
  const finalPages = extractPages(finalPagesResult.content);
  if (finalPages.length !== initialPages.length + 1) {
    throw new Error(
      `Expected one extra page to remain open after the test, got ${initialPages.length} -> ${finalPages.length}`,
    );
  }

  await client.close();
}
