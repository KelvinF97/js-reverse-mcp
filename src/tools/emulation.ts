/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {zod, KnownDevices} from '../third_party/index.js';
import {ToolCategory} from './categories.js';
import {defineTool} from './ToolDefinition.js';

// Get a list of common device names for the description
const commonDevices = [
  'iPhone 12',
  'iPhone 12 Pro',
  'Pixel 5',
  'iPad',
  'iPad Pro',
  'Galaxy S5',
];

export const emulateDevice = defineTool({
  name: 'emulate_device',
  description: `Emulates a specific device (viewport, user agent, touch support).
  Useful for testing mobile-specific logic or bypassing desktop-only protections.
  Common devices: ${commonDevices.join(', ')}.`,
  annotations: {
    category: ToolCategory.INTERACTION, // Reuse INTERACTION category or create a new one
    readOnlyHint: false,
  },
  schema: {
    deviceName: zod.string().describe(`The name of the device to emulate. exact match required (e.g., "iPhone 12").`),
  },
  handler: async (req, _response, context) => {
    const {deviceName} = req.params;
    const page = context.getSelectedPage();

    // Find device configuration
    const device = KnownDevices[deviceName as keyof typeof KnownDevices];

    if (!device) {
      throw new Error(`Device "${deviceName}" not found. Available devices include: ${commonDevices.join(', ')}...`);
    }

    await page.emulate(device);

    // Try to resize the browser window to match device dimensions
    try {
      const client = await page.createCDPSession();
      // Browser.getWindowForTarget and Browser.setWindowBounds are CDP commands
      // windowId is returned by Browser.getWindowForTarget
      const { windowId } = await client.send('Browser.getWindowForTarget');

      await client.send('Browser.setWindowBounds', {
        windowId,
        bounds: {
          width: device.viewport.width,
          height: device.viewport.height + 85, // Add approximate height for browser chrome/toolbar
          windowState: 'normal'
        }
      });
    } catch (e) {
      // Ignore window resize errors (e.g. in headless mode or if not supported)
    }
  },
});

export const setUserAgent = defineTool({
  name: 'set_user_agent',
  description: 'Sets the User-Agent string for the current page.',
  annotations: {
    category: ToolCategory.INTERACTION,
    readOnlyHint: false,
  },
  schema: {
    userAgent: zod.string().describe('The User-Agent string to use.'),
  },
  handler: async (req, _response, context) => {
    const {userAgent} = req.params;
    const page = context.getSelectedPage();
    await page.setUserAgent(userAgent);
  },
});

export const setGeolocation = defineTool({
  name: 'set_geolocation',
  description: 'Overrides the Geolocation of the page.',
  annotations: {
    category: ToolCategory.INTERACTION,
    readOnlyHint: false,
  },
  schema: {
    latitude: zod.number().describe('Latitude'),
    longitude: zod.number().describe('Longitude'),
    accuracy: zod.number().optional().describe('Accuracy in meters. Defaults to 100.'),
  },
  handler: async (req, _response, context) => {
    const {latitude, longitude, accuracy = 100} = req.params;
    const page = context.getSelectedPage();

    // Grant permissions first
    const contextBrowser = page.browser().defaultBrowserContext();
    await contextBrowser.overridePermissions(page.url(), ['geolocation']);

    await page.setGeolocation({latitude, longitude, accuracy});
  },
});
