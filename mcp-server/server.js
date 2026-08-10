#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.CONTEXT_PAD_PORT) || 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.md': 'text/markdown; charset=utf-8'
};

let currentNotes = '';
const clients = new Set();

// ── Static file server + WS upgrade ─────────────────────────────────────────
const httpServer = http.createServer((req, res) => {
  const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.join(REPO_ROOT, urlPath);

  // Don't serve anything outside the repo root (path traversal guard)
  if (!filePath.startsWith(REPO_ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (ws) => {
  clients.add(ws);
  // Send the last known notes so a freshly opened tab is in sync
  ws.send(JSON.stringify({ type: 'notes', content: currentNotes }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type === 'notes' && typeof msg.content === 'string') {
      currentNotes = msg.content;
    }
  });

  ws.on('close', () => clients.delete(ws));
});

function broadcast(message) {
  const payload = JSON.stringify(message);
  let sent = 0;
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
      sent++;
    }
  }
  return sent;
}

httpServer.listen(PORT, () => {
  console.error(`[context-pad-mcp] Serving Context Pad on http://localhost:${PORT}`);
});

// ── MCP tools ────────────────────────────────────────────────────────────────
const mcp = new McpServer({ name: 'context-pad', version: '0.1.0' });

mcp.registerTool(
  'read_note',
  {
    title: 'Read Context Pad note',
    description:
      "Read whatever is currently in the user's Context Pad Notes tab " +
      `(open at http://localhost:${PORT}). Use this when the user refers to ` +
      '"my context pad", "my notes", or "my scratchpad".',
    inputSchema: {}
  },
  async () => {
    if (!currentNotes.trim()) {
      return { content: [{ type: 'text', text: '(Context Pad notes are empty.)' }] };
    }
    return { content: [{ type: 'text', text: currentNotes }] };
  }
);

mcp.registerTool(
  'show_doc',
  {
    title: 'Show a document in Context Pad',
    description:
      'Push a markdown document into the Reader tab of the user\'s open ' +
      `Context Pad tab (http://localhost:${PORT}) so they can read it formatted ` +
      'instead of as raw chat text. Requires a Context Pad tab to be open at that ' +
      'URL — if zero tabs are connected, tell the user to open it first.',
    inputSchema: {
      content: z.string().describe('The markdown content to display'),
      title: z.string().optional().describe('A short title for the document')
    }
  },
  async ({ content, title }) => {
    const sent = broadcast({ type: 'show_doc', content, title: title || 'From agent' });
    if (sent === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No Context Pad tab is currently connected at http://localhost:${PORT}. Ask the user to open it, then try again.`
          }
        ]
      };
    }
    return { content: [{ type: 'text', text: `Pushed to ${sent} connected Context Pad tab(s).` }] };
  }
);

const transport = new StdioServerTransport();
await mcp.connect(transport);
