/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {logger} from '../logger.js';
import {parseKey} from '../utils/keyboard.js';
import {zod} from '../third_party/index.js';
import {ToolCategory} from './categories.js';
import {defineTool, timeoutSchema} from './ToolDefinition.js';

export const clickTool = defineTool({
  name: 'click_element',
  description:
    'Clicks an element matching the given CSS selector. Simulates a real user click (mousedown, mouseup, click events).',
  annotations: {
    category: ToolCategory.INTERACTION,
    readOnlyHint: false,
  },
  schema: {
    selector: zod
      .string()
      .describe(
        'CSS selector of the element to click (e.g., "#login-btn", ".submit-button")',
      ),
    button: zod
      .enum(['left', 'right', 'middle'])
      .optional()
      .describe('Mouse button to use. Defaults to "left".'),
    clickCount: zod
      .number()
      .optional()
      .describe('Number of clicks. Defaults to 1.'),
    delay: zod
      .number()
      .optional()
      .describe(
        'Time to wait between mousedown and mouseup in milliseconds. Defaults to 0.',
      ),
  },
  handler: async (req, _response, context) => {
    const {selector, button, clickCount, delay} = req.params;
    const page = context.getSelectedPage();
    const element = await page.waitForSelector(selector, {timeout: 5000});
    if (!element) {
      throw new Error(`Could not find element matching selector: ${selector}`);
    }

    await context.waitForEventsAfterAction(async () => {
      await element.click({button, clickCount, delay});
    });
  },
});

export const typeTool = defineTool({
  name: 'type_text',
  description:
    'Types text into an element matching the selector. Simulates real keyboard input with optional delay between keystrokes.',
  annotations: {
    category: ToolCategory.INTERACTION,
    readOnlyHint: false,
  },
  schema: {
    selector: zod
      .string()
      .describe('CSS selector of the element to type into'),
    text: zod.string().describe('The text to type'),
    delay: zod
      .number()
      .optional()
      .describe(
        'Delay between key presses in milliseconds. Defaults to 0 (fastest).',
      ),
  },
  handler: async (req, _response, context) => {
    const {selector, text, delay} = req.params;
    const page = context.getSelectedPage();
    const element = await page.waitForSelector(selector, {timeout: 5000});
    if (!element) {
      throw new Error(`Could not find element matching selector: ${selector}`);
    }

    await element.type(text, {delay});
  },
});

export const hoverTool = defineTool({
  name: 'hover_element',
  description: 'Hovers the mouse over an element matching the selector.',
  annotations: {
    category: ToolCategory.INTERACTION,
    readOnlyHint: false,
  },
  schema: {
    selector: zod
      .string()
      .describe('CSS selector of the element to hover over'),
  },
  handler: async (req, _response, context) => {
    const {selector} = req.params;
    const page = context.getSelectedPage();
    const element = await page.waitForSelector(selector, {timeout: 5000});
    if (!element) {
      throw new Error(`Could not find element matching selector: ${selector}`);
    }

    await element.hover();
  },
});

export const scrollTool = defineTool({
  name: 'scroll_to',
  description: 'Scrolls to an element or specific coordinates.',
  annotations: {
    category: ToolCategory.INTERACTION,
    readOnlyHint: false,
  },
  schema: {
    selector: zod
      .string()
      .optional()
      .describe('CSS selector of the element to scroll into view'),
    x: zod
      .number()
      .optional()
      .describe('X coordinate to scroll to (if selector is not provided)'),
    y: zod
      .number()
      .optional()
      .describe('Y coordinate to scroll to (if selector is not provided)'),
  },
  handler: async (req, _response, context) => {
    const {selector, x, y} = req.params;
    const page = context.getSelectedPage();

    if (selector) {
      const element = await page.waitForSelector(selector, {timeout: 5000});
      if (!element) {
        throw new Error(
          `Could not find element matching selector: ${selector}`,
        );
      }
      await element.scrollIntoView();
    } else if (x !== undefined || y !== undefined) {
      await page.evaluate(
        (scrollX, scrollY) => {
          window.scrollTo(scrollX ?? window.scrollX, scrollY ?? window.scrollY);
        },
        x,
        y,
      );
    } else {
      throw new Error('Must provide either a selector or coordinates (x/y)');
    }
  },
});

export const pressKey = defineTool({
  name: 'press_key',
  description:
    'Press a key or key combination. Use for keyboard shortcuts, Enter to submit forms, Escape to close dialogs, navigation keys, etc.',
  annotations: {
    category: ToolCategory.INTERACTION,
    readOnlyHint: false,
  },
  schema: {
    key: zod
      .string()
      .describe(
        'A key or combination (e.g., "Enter", "Escape", "Tab", "Control+A", "Control+C", "Control+Shift+R"). Modifiers: Control, Shift, Alt, Meta.',
      ),
  },
  handler: async (req, response, context) => {
    const page = context.getSelectedPage();
    const tokens = parseKey(req.params.key);
    const [key, ...modifiers] = tokens;

    await context.waitForEventsAfterAction(async () => {
      for (const modifier of modifiers) {
        await page.keyboard.down(modifier);
      }
      await page.keyboard.press(key);
      for (const modifier of modifiers.toReversed()) {
        await page.keyboard.up(modifier);
      }
    });

    response.appendResponseLine(
      `Successfully pressed key: ${req.params.key}`,
    );
  },
});

export const fillField = defineTool({
  name: 'fill',
  description:
    'Clears and fills a form element (input, textarea, or select) with a value. Unlike type_text which simulates keystrokes, fill directly sets the value — faster and works with select dropdowns.',
  annotations: {
    category: ToolCategory.INTERACTION,
    readOnlyHint: false,
  },
  schema: {
    selector: zod
      .string()
      .describe(
        'CSS selector of the form element (input, textarea, or select)',
      ),
    value: zod.string().describe('The value to fill in'),
  },
  handler: async (req, response, context) => {
    const {selector, value} = req.params;
    const page = context.getSelectedPage();
    const element = await page.waitForSelector(selector, {timeout: 5000});
    if (!element) {
      throw new Error(`Could not find element matching selector: ${selector}`);
    }

    await context.waitForEventsAfterAction(async () => {
      const tagName = await element.evaluate(el =>
        el.tagName.toLowerCase(),
      );

      if (tagName === 'select') {
        await page.select(selector, value);
      } else {
        await element.evaluate(el => {
          (el as HTMLInputElement).value = '';
        });
        await element.type(value);
      }
    });

    response.appendResponseLine(`Successfully filled "${selector}" with value.`);
  },
});

export const handleDialog = defineTool({
  name: 'handle_dialog',
  description:
    'Handles a browser dialog (alert, confirm, prompt, beforeunload). Use this when a dialog is blocking page interaction.',
  annotations: {
    category: ToolCategory.INTERACTION,
    readOnlyHint: false,
  },
  schema: {
    action: zod
      .enum(['accept', 'dismiss'])
      .describe('Whether to accept or dismiss the dialog'),
    promptText: zod
      .string()
      .optional()
      .describe('Text to enter into a prompt dialog before accepting.'),
  },
  handler: async (req, response, context) => {
    const dialog = context.getDialog();
    if (!dialog) {
      throw new Error(
        'No open dialog found. A dialog must appear before it can be handled.',
      );
    }

    switch (req.params.action) {
      case 'accept': {
        try {
          await dialog.accept(req.params.promptText);
        } catch (err) {
          logger(err);
        }
        response.appendResponseLine(
          `Accepted the ${dialog.type()} dialog: "${dialog.message()}"`,
        );
        break;
      }
      case 'dismiss': {
        try {
          await dialog.dismiss();
        } catch (err) {
          logger(err);
        }
        response.appendResponseLine(
          `Dismissed the ${dialog.type()} dialog: "${dialog.message()}"`,
        );
        break;
      }
    }

    context.clearDialog();
  },
});

export const waitFor = defineTool({
  name: 'wait_for',
  description:
    'Waits for specified text to appear on the page. Useful for waiting for async content to load, SPA navigation to complete, or dynamic elements to render.',
  annotations: {
    category: ToolCategory.NAVIGATION,
    readOnlyHint: true,
  },
  schema: {
    text: zod.string().describe('Text to wait for on the page'),
    ...timeoutSchema,
  },
  handler: async (req, response, context) => {
    await context.waitForTextOnPage({
      text: req.params.text,
      timeout: req.params.timeout,
    });

    response.appendResponseLine(
      `Element with text "${req.params.text}" found on the page.`,
    );
  },
});
