/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {zod} from '../third_party/index.js';

import {ToolCategory} from './categories.js';
import {defineTool} from './ToolDefinition.js';
import type {Context} from './ToolDefinition.js';

interface DevicePreset {
  userAgent: string;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
    isMobile: boolean;
    hasTouch: boolean;
  };
}

const devicePresets: Record<string, DevicePreset> = {
  'iPhone 12': {
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    viewport: {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    },
  },
  'iPhone 12 Pro': {
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    viewport: {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    },
  },
  'Pixel 5': {
    userAgent:
      'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    viewport: {
      width: 393,
      height: 851,
      deviceScaleFactor: 2.75,
      isMobile: true,
      hasTouch: true,
    },
  },
  iPad: {
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 14_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    viewport: {
      width: 810,
      height: 1080,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
  },
  'iPad Pro': {
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 14_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    viewport: {
      width: 1024,
      height: 1366,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
  },
  'Galaxy S5': {
    userAgent:
      'Mozilla/5.0 (Linux; Android 6.0.1; SM-G900P Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    viewport: {
      width: 360,
      height: 640,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    },
  },
};

const commonDevices = Object.keys(devicePresets);

async function getPageSession(context: Pick<Context, 'getSelectedPage'>) {
  const page = context.getSelectedPage();
  const session = await page.context().newCDPSession(page);
  return {page, session};
}

export const emulateDevice = defineTool({
  name: 'emulate_device',
  description:
    `Emulates a specific mobile or tablet device by overriding viewport, touch support, and user agent. Common devices: ${commonDevices.join(', ')}.`,
  annotations: {
    category: ToolCategory.INTERACTION,
    readOnlyHint: false,
  },
  schema: {
    deviceName: zod
      .string()
      .describe(
        'The device preset name. Exact match required (e.g., "iPhone 12").',
      ),
  },
  handler: async (req, response, context) => {
    const preset = devicePresets[req.params.deviceName];
    if (!preset) {
      throw new Error(
        `Device "${req.params.deviceName}" not found. Available devices include: ${commonDevices.join(', ')}.`,
      );
    }

    const {page, session} = await getPageSession(context);

    await page.setViewportSize({
      width: preset.viewport.width,
      height: preset.viewport.height,
    });

    await session.send('Emulation.setDeviceMetricsOverride', {
      width: preset.viewport.width,
      height: preset.viewport.height,
      deviceScaleFactor: preset.viewport.deviceScaleFactor,
      mobile: preset.viewport.isMobile,
      screenWidth: preset.viewport.width,
      screenHeight: preset.viewport.height,
    });
    await session.send('Emulation.setTouchEmulationEnabled', {
      enabled: preset.viewport.hasTouch,
      maxTouchPoints: preset.viewport.hasTouch ? 5 : 0,
    });
    await session.send('Emulation.setUserAgentOverride', {
      userAgent: preset.userAgent,
    });

    response.appendResponseLine(
      `Device emulation enabled: ${req.params.deviceName}`,
    );
  },
});

export const setUserAgent = defineTool({
  name: 'set_user_agent',
  description:
    'Overrides the user agent string for the current page via CDP emulation.',
  annotations: {
    category: ToolCategory.INTERACTION,
    readOnlyHint: false,
  },
  schema: {
    userAgent: zod.string().describe('The user agent string to use.'),
  },
  handler: async (req, response, context) => {
    const {session} = await getPageSession(context);
    await session.send('Emulation.setUserAgentOverride', {
      userAgent: req.params.userAgent,
    });
    response.appendResponseLine('User agent override applied.');
  },
});

export const setGeolocation = defineTool({
  name: 'set_geolocation',
  description:
    'Overrides geolocation for the current browser context and grants geolocation permission for the current page origin.',
  annotations: {
    category: ToolCategory.INTERACTION,
    readOnlyHint: false,
  },
  schema: {
    latitude: zod.number().describe('Latitude'),
    longitude: zod.number().describe('Longitude'),
    accuracy: zod
      .number()
      .optional()
      .describe('Accuracy in meters. Defaults to 100.'),
  },
  handler: async (req, response, context) => {
    const {latitude, longitude, accuracy = 100} = req.params;
    const page = context.getSelectedPage();
    const currentUrl = page.url();
    const origin = currentUrl.startsWith('http')
      ? new URL(currentUrl).origin
      : undefined;

    if (origin) {
      await page.context().grantPermissions(['geolocation'], {origin});
    }

    await page.context().setGeolocation({latitude, longitude, accuracy});

    response.appendResponseLine(
      `Geolocation override applied: ${latitude}, ${longitude}`,
    );
  },
});
