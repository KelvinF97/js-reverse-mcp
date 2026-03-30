/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {zod} from '../third_party/index.js';
import {ToolCategory} from './categories.js';
import {defineTool} from './ToolDefinition.js';

function getMemoryFilePath(): string {
  return path.join(os.homedir(), '.cache', 'js-reverse-mcp', 'memory.json');
}

interface Memory {
  key: string;
  value: string;
  tags?: string[];
  timestamp: string;
}

async function loadMemory(): Promise<Memory[]> {
  try {
    const content = await fs.readFile(getMemoryFilePath(), 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function saveMemory(memories: Memory[]): Promise<void> {
  const filePath = getMemoryFilePath();
  await fs.mkdir(path.dirname(filePath), {recursive: true});
  await fs.writeFile(filePath, JSON.stringify(memories, null, 2), 'utf-8');
}

export const rememberInsight = defineTool({
  name: 'remember_insight',
  description: 'Saves a key insight or fact into persistent memory (e.g., location of encryption function, API endpoints).',
  annotations: {
    category: ToolCategory.REVERSE_ENGINEERING,
    readOnlyHint: false,
  },
  schema: {
    key: zod.string().describe('Unique key or title for this insight (e.g., "xhs_sign_func").'),
    value: zod.string().describe('The content to remember (e.g., "Found in app.js line 123, function name is getSign").'),
    tags: zod.array(zod.string()).optional().describe('Optional tags for categorization.'),
  },
  handler: async (req, response) => {
    const {key, value, tags} = req.params;
    const memories = await loadMemory();

    const index = memories.findIndex(m => m.key === key);
    const newMemory: Memory = {
      key,
      value,
      tags,
      timestamp: new Date().toISOString(),
    };

    if (index >= 0) {
      memories[index] = newMemory;
      response.appendResponseLine(`Updated memory: ${key}`);
    } else {
      memories.push(newMemory);
      response.appendResponseLine(`Saved new memory: ${key}`);
    }

    await saveMemory(memories);
  },
});

export const recallInsight = defineTool({
  name: 'recall_insight',
  description: 'Retrieves an insight from memory by key or searches by keyword.',
  annotations: {
    category: ToolCategory.REVERSE_ENGINEERING,
    readOnlyHint: true,
  },
  schema: {
    query: zod.string().describe('Key to look up, or keyword to search in values.'),
  },
  handler: async (req, response) => {
    const {query} = req.params;
    const memories = await loadMemory();

    // Exact match
    const exact = memories.find(m => m.key === query);
    if (exact) {
      response.appendResponseLine(`Found exact match for key "${query}":`);
      response.appendResponseLine(JSON.stringify(exact, null, 2));
      return;
    }

    // Fuzzy search
    const matches = memories.filter(m =>
      m.key.includes(query) || m.value.includes(query) || m.tags?.some(t => t.includes(query))
    );

    if (matches.length > 0) {
      response.appendResponseLine(`Found ${matches.length} matches for "${query}":`);
      matches.forEach(m => {
        response.appendResponseLine(`- [${m.key}] ${m.value} (Tags: ${m.tags?.join(', ')})`);
      });
    } else {
      response.appendResponseLine(`No memories found matching "${query}".`);
    }
  },
});

export const listInsights = defineTool({
  name: 'list_insights',
  description: 'Lists all saved insights.',
  annotations: {
    category: ToolCategory.REVERSE_ENGINEERING,
    readOnlyHint: true,
  },
  schema: {},
  handler: async (_req, response) => {
    const memories = await loadMemory();
    if (memories.length === 0) {
      response.appendResponseLine('Memory is empty.');
      return;
    }

    response.appendResponseLine(`Total memories: ${memories.length}`);
    memories.forEach(m => {
      response.appendResponseLine(`- ${m.key}: ${m.value.substring(0, 50)}${m.value.length > 50 ? '...' : ''}`);
    });
  },
});
