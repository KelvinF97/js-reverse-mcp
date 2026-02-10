/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {zod} from '../third_party/index.js';
import {ToolCategory} from './categories.js';
import {defineTool} from './ToolDefinition.js';
import * as fs from 'fs';
import * as path from 'path';

const MEMORY_FILE = '.mcp_memory.json';

interface Memory {
  key: string;
  value: string;
  tags?: string[];
  timestamp: string;
}

function loadMemory(): Memory[] {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const content = fs.readFileSync(MEMORY_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Failed to load memory:', e);
  }
  return [];
}

function saveMemory(memories: Memory[]) {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save memory:', e);
  }
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
    const memories = loadMemory();

    // Update existing or add new
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

    saveMemory(memories);
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
    const memories = loadMemory();

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
    const memories = loadMemory();
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
