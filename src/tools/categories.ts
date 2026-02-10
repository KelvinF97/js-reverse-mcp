/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ToolCategory {
  NAVIGATION = 'navigation',
  NETWORK = 'network',
  DEBUGGING = 'debugging',
  INTERACTION = 'interaction',
  REVERSE_ENGINEERING = 'reverse_engineering',
}

export const labels = {
  [ToolCategory.NAVIGATION]: 'Navigation automation',
  [ToolCategory.NETWORK]: 'Network',
  [ToolCategory.DEBUGGING]: 'Debugging',
  [ToolCategory.INTERACTION]: 'Interaction',
  [ToolCategory.REVERSE_ENGINEERING]: 'JS Reverse Engineering',
};
