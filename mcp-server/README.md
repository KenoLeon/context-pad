# context-pad-mcp

Optional companion server for [Context Pad](../README.md). Lets an MCP-aware
AI agent (Claude Code, Claude Desktop, etc.) read your notes and push
formatted documents into the Reader tab — live, no copy-paste, no
save-then-open.

This is a deliberate departure from the rest of the project: Context Pad
itself stays a zero-install static page. This server is a separate, optional
thing you run locally only if you want the live MCP bridge.

## What it does

- Serves Context Pad at `http://localhost:4173` (instead of opening
  `index.html` directly) and holds a WebSocket connection to any tab open
  there.
- Exposes two MCP tools over stdio:
  - **`read_note`** — returns whatever is currently in the Notes tab.
  - **`show_doc(content, title?)`** — pushes markdown into the Reader tab of
    any connected tab and switches it there automatically.

If no Context Pad tab is open when an agent calls `show_doc`, the tool tells
the agent that, instead of silently doing nothing.

## Setup

```bash
cd mcp-server
npm install
```

Then register it with Claude Code (once, from anywhere — `-s user` makes it
available in every project, matching the point of this: your agent can read
your scratchpad regardless of which repo you're in):

```bash
claude mcp add context-pad -s user -- node /absolute/path/to/context-pad/mcp-server/server.js
```

Claude Code will start the server itself when needed. To run it manually
instead (e.g. to just browse to the live-synced page without an agent
attached):

```bash
npm start
# open http://localhost:4173
```

Port defaults to `4173`; override with `CONTEXT_PAD_PORT=5000 npm start`.

## Notes

- Works only with a Context Pad tab open at the server's URL — the hosted
  GitHub Pages version and a bare double-clicked `index.html` both continue
  to work exactly as before, with no bridge (the browser silently skips
  connecting when there's nothing to connect to).
- `read_note` reflects the last content any connected tab sent — single-user,
  local use is the assumed case, not multi-tab sync.
