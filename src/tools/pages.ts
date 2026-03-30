/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {zod} from '../third_party/index.js';

import {ToolCategory} from './categories.js';
import {CLOSE_PAGE_ERROR, defineTool, timeoutSchema} from './ToolDefinition.js';

// Default navigation timeout in milliseconds (10 seconds)
const DEFAULT_NAV_TIMEOUT = 10000;

export const listPages = defineTool({
  name: 'list_pages',
  description: `Get a list of pages open in the browser.`,
  annotations: {
    category: ToolCategory.NAVIGATION,
    readOnlyHint: true,
  },
  schema: {},
  handler: async (_request, response) => {
    response.setIncludePages(true);
  },
});

export const selectPage = defineTool({
  name: 'select_page',
  description: `Select a page as a context for future tool calls.`,
  annotations: {
    category: ToolCategory.NAVIGATION,
    readOnlyHint: true,
  },
  schema: {
    pageIdx: zod
      .number()
      .describe(
        'The index of the page to select. Call list_pages to list pages.',
      ),
  },
  handler: async (request, response, context) => {
    const page = context.getPageByIdx(request.params.pageIdx);
    await page.bringToFront();
    context.selectPage(page);
    response.setIncludePages(true);
  },
});

export const newPage = defineTool({
  name: 'new_page',
  description: `Creates a new page and navigates to the specified URL. Waits for DOMContentLoaded event (not full page load). Default timeout is 10 seconds.`,
  annotations: {
    category: ToolCategory.NAVIGATION,
    readOnlyHint: false,
  },
  schema: {
    url: zod.string().describe('URL to load in a new page.'),
    ...timeoutSchema,
  },
  handler: async (request, response, context) => {
    const page = await context.newPage();

    await context.waitForEventsAfterAction(async () => {
      await page.goto(request.params.url, {
        timeout: request.params.timeout ?? DEFAULT_NAV_TIMEOUT,
        waitUntil: 'domcontentloaded',
      });
    });

    response.setIncludePages(true);
  },
});

export const closePage = defineTool({
  name: 'close_page',
  description: `Closes a page by its index. The last open page cannot be closed.`,
  annotations: {
    category: ToolCategory.NAVIGATION,
    readOnlyHint: false,
  },
  schema: {
    pageIdx: zod
      .number()
      .describe(
        'The index of the page to close. Call list_pages to list pages.',
      ),
  },
  handler: async (request, response, context) => {
    try {
      await context.closePage(request.params.pageIdx);
    } catch (err) {
      if (err.message === CLOSE_PAGE_ERROR) {
        response.appendResponseLine(err.message);
      } else {
        throw err;
      }
    }
    response.setIncludePages(true);
  },
});

export const navigatePage = defineTool({
  name: 'navigate_page',
  description: `Navigates the currently selected page to a URL, or performs back/forward/reload navigation. Waits for DOMContentLoaded event (not full page load). Default timeout is 10 seconds. Use initScript to inject JavaScript before page scripts run (useful for anti-debugging bypass).`,
  annotations: {
    category: ToolCategory.NAVIGATION,
    readOnlyHint: false,
  },
  schema: {
    type: zod
      .enum(['url', 'back', 'forward', 'reload'])
      .optional()
      .describe(
        'Navigate the page by URL, back or forward in history, or reload.',
      ),
    url: zod.string().optional().describe('Target URL (only type=url)'),
    ignoreCache: zod
      .boolean()
      .optional()
      .describe('Whether to ignore cache on reload.'),
    initScript: zod
      .string()
      .optional()
      .describe(
        'JavaScript to execute on each new document BEFORE any page scripts run. ' +
          'Useful for anti-debugging bypass (e.g., override debugger statement), ' +
          'hook native functions before they are called, or modify navigator.webdriver. ' +
          'The script is automatically removed after navigation completes.',
      ),
    ...timeoutSchema,
  },
  handler: async (request, response, context) => {
    const page = context.getSelectedPage();
    const options = {
      timeout: request.params.timeout ?? DEFAULT_NAV_TIMEOUT,
    };

    if (!request.params.type && !request.params.url) {
      throw new Error('Either URL or a type is required.');
    }

    if (!request.params.type) {
      request.params.type = 'url';
    }

    let initScriptId: string | undefined;
    if (request.params.initScript) {
      const {identifier} = await page.evaluateOnNewDocument(
        request.params.initScript,
      );
      initScriptId = identifier;
    }

    try {
      await context.waitForEventsAfterAction(async () => {
        switch (request.params.type) {
          case 'url':
            if (!request.params.url) {
              throw new Error('A URL is required for navigation of type=url.');
            }
            try {
              await page.goto(request.params.url, {
                ...options,
                waitUntil: 'domcontentloaded',
              });
              response.appendResponseLine(
                `Successfully navigated to ${request.params.url}.`,
              );
            } catch (error) {
              response.appendResponseLine(
                `Unable to navigate in the selected page: ${error.message}.`,
              );
            }
            break;
          case 'back':
            try {
              await page.goBack({
                ...options,
                waitUntil: 'domcontentloaded',
              });
              response.appendResponseLine(
                `Successfully navigated back to ${page.url()}.`,
              );
            } catch (error) {
              response.appendResponseLine(
                `Unable to navigate back in the selected page: ${error.message}.`,
              );
            }
            break;
          case 'forward':
            try {
              await page.goForward({
                ...options,
                waitUntil: 'domcontentloaded',
              });
              response.appendResponseLine(
                `Successfully navigated forward to ${page.url()}.`,
              );
            } catch (error) {
              response.appendResponseLine(
                `Unable to navigate forward in the selected page: ${error.message}.`,
              );
            }
            break;
          case 'reload':
            try {
              await page.reload({
                ...options,
                waitUntil: 'domcontentloaded',
                ignoreCache: request.params.ignoreCache,
              });
              response.appendResponseLine(`Successfully reloaded the page.`);
            } catch (error) {
              response.appendResponseLine(
                `Unable to reload the selected page: ${error.message}.`,
              );
            }
            break;
        }
      });
    } finally {
      if (initScriptId) {
        await page
          .removeScriptToEvaluateOnNewDocument(initScriptId)
          .catch(() => {});
      }
    }

    if (initScriptId) {
      response.appendResponseLine('initScript was injected before page load.');
    }

    response.setIncludePages(true);
  },
});
