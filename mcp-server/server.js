#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
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

// ── Agent-docs config (whether/where show_doc pushes get saved) ────────────
const CONTEXT_PAD_DIR = path.join(os.homedir(), '.context-pad');
const CONFIG_PATH = path.join(CONTEXT_PAD_DIR, 'config.json');
const DEFAULT_SAVE_DIR = path.join(CONTEXT_PAD_DIR, 'docs');

function expandHome(p) {
  if (p.startsWith('~')) return path.join(os.homedir(), p.slice(1));
  return p;
}

function loadConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return {
      saveDocs: raw.saveDocs !== false,
      saveDir: typeof raw.saveDir === 'string' && raw.saveDir.trim() ? raw.saveDir : DEFAULT_SAVE_DIR
    };
  } catch {
    return { saveDocs: true, saveDir: DEFAULT_SAVE_DIR };
  }
}

function persistConfig() {
  try {
    fs.mkdirSync(CONTEXT_PAD_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('[context-pad-mcp] Could not persist config:', err.message);
  }
}

let config = loadConfig();

function slugify(title) {
  const slug = (title || 'doc')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'doc';
}

function timestampedFilename(title) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${date}-${time}-${slugify(title)}.md`;
}

let currentNotes = '';
const clients = new Set();

// ── Static file server + WS upgrade ─────────────────────────────────────────
const httpServer = http.createServer((req, res) => {
  const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.join(REPO_ROOT, urlPath);

  // Don't serve anything outside the repo root (path traversal guard)
  const relative = path.relative(REPO_ROOT, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
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

function configMessage() {
  return { type: 'config', saveDocs: config.saveDocs, saveDir: config.saveDir };
}

wss.on('connection', (ws) => {
  clients.add(ws);
  // Send the last known notes + current agent-docs config so a freshly
  // opened tab is in sync
  ws.send(JSON.stringify({ type: 'notes', content: currentNotes }));
  ws.send(JSON.stringify(configMessage()));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type === 'notes' && typeof msg.content === 'string') {
      currentNotes = msg.content;
    } else if (msg.type === 'config') {
      config = {
        saveDocs: !!msg.saveDocs,
        saveDir: typeof msg.saveDir === 'string' && msg.saveDir.trim() ? expandHome(msg.saveDir.trim()) : DEFAULT_SAVE_DIR
      };
      persistConfig();
      broadcast(configMessage()); // keep any other open tabs in sync
    }
  });

  ws.on('close', () => clients.delete(ws));
});

function openBrowser(url) {
  const [cmd, args] =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] :
    process.platform === 'darwin' ? ['open', [url]] :
    ['xdg-open', [url]];
  const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
  child.on('error', (err) => {
    console.error(`[context-pad-mcp] Could not auto-open browser: ${err.message}`);
  });
  child.unref();
}

httpServer.listen(PORT, '127.0.0.1', () => {
  console.error(`[context-pad-mcp] Serving Context Pad on http://localhost:${PORT}`);
  openBrowser(`http://localhost:${PORT}`);
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
      'URL — if zero tabs are connected, tell the user to open it first. Unless the ' +
      'user has turned it off in Settings, the document is also saved to disk.',
    inputSchema: {
      content: z.string().describe('The markdown content to display'),
      title: z.string().optional().describe('A short title for the document')
    }
  },
  async ({ content, title }) => {
    const sent = broadcast({ type: 'show_doc', content, title: title || 'From agent' });
    const lines = [];

    if (sent === 0) {
      lines.push(`No Context Pad tab is currently connected at http://localhost:${PORT}. Ask the user to open it, then try again.`);
    } else {
      lines.push(`Pushed to ${sent} connected Context Pad tab(s).`);
    }

    if (config.saveDocs) {
      try {
        fs.mkdirSync(config.saveDir, { recursive: true });
        const filePath = path.join(config.saveDir, timestampedFilename(title));
        fs.writeFileSync(filePath, content);
        lines.push(`Saved to ${filePath}.`);
      } catch (err) {
        lines.push(`Could not save to disk (${config.saveDir}): ${err.message}`);
      }
    }

    return { content: [{ type: 'text', text: lines.join(' ') }] };
  }
);

const transport = new StdioServerTransport();
await mcp.connect(transport);
