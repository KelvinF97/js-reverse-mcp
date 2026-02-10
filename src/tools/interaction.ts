/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {zod} from '../third_party/index.js';
import {ToolCategory} from './categories.js';
import {defineTool} from './ToolDefinition.js';

export const clickTool = defineTool({
  name: 'click_element',
  description: 'Clicks an element matching the given selector. This uses Puppeteer\'s native click method, which simulates a real user click (triggering mousedown, mouseup, click events).',
  annotations: {
    category: ToolCategory.INTERACTION,
    readOnlyHint: false,
  },
  schema: {
    selector: zod.string().describe('CSS selector of the element to click (e.g., "#login-btn", ".submit-button")'),
    button: zod.enum(['left', 'right', 'middle']).optional().describe('Mouse button to use. Defaults to "left".'),
    clickCount: zod.number().optional().describe('Number of clicks. Defaults to 1.'),
    delay: zod.number().optional().describe('Time to wait between mousedown and mouseup in milliseconds. Defaults to 0.'),
  },
  handler: async (req, _response, context) => {
    const {selector, button, clickCount, delay} = req.params;
    const page = context.getSelectedPage();
    const element = await page.waitForSelector(selector, {timeout: 5000});
    if (!element) {
      throw new Error(`Could not find element matching selector: ${selector}`);
    }

    await element.click({
      button,
      clickCount,
      delay
    });
  },
});

export const typeTool = defineTool({
  name: 'type_text',
  description: 'Types text into an element matching the selector. Simulates real keyboard input with optional delay between keystrokes.',
  annotations: {
    category: ToolCategory.INTERACTION,
    readOnlyHint: false,
  },
  schema: {
    selector: zod.string().describe('CSS selector of the element to type into'),
    text: zod.string().describe('The text to type'),
    delay: zod.number().optional().describe('Delay between key presses in milliseconds. Defaults to 0 (fastest).'),
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
    selector: zod.string().describe('CSS selector of the element to hover over'),
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
    selector: zod.string().optional().describe('CSS selector of the element to scroll into view'),
    x: zod.number().optional().describe('X coordinate to scroll to (if selector is not provided)'),
    y: zod.number().optional().describe('Y coordinate to scroll to (if selector is not provided)'),
  },
  handler: async (req, _response, context) => {
    const {selector, x, y} = req.params;
    const page = context.getSelectedPage();

    if (selector) {
      const element = await page.waitForSelector(selector, {timeout: 5000});
      if (!element) {
        throw new Error(`Could not find element matching selector: ${selector}`);
      }
      await element.scrollIntoView();
    } else if (x !== undefined || y !== undefined) {
      await page.evaluate((scrollX, scrollY) => {
        window.scrollTo(scrollX ?? window.scrollX, scrollY ?? window.scrollY);
      }, x, y);
    } else {
      throw new Error('Must provide either a selector or coordinates (x/y)');
    }
  },
});
