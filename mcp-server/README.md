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
- By default, every `show_doc` is also saved as a timestamped `.md` file in
  `~/.context-pad/docs/` — so pushed docs survive a page refresh instead of
  only existing live in the browser. Toggle this off, or change the folder,
  from Settings → Agent docs (only shown/enabled while a tab is connected).
  Config persists in `~/.context-pad/config.json`.

If no Context Pad tab is open when an agent calls `show_doc`, the tool tells
the agent that, instead of silently doing nothing.

## Requirements

- Node.js 18 or later (required by `@modelcontextprotocol/sdk`).
- [Claude Code](https://github.com/anthropics/claude-code) CLI, or another
  MCP-aware client such as Claude Desktop.

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

Claude Code spawns the server the moment a session connects to it — the
HTTP+WS bridge (`http://localhost:4173`) is already live as soon as *any*
Claude Code session with `context-pad` registered is running, before you've
asked it anything. You don't need to `npm start` it yourself while working
in Claude Code. Only run it manually if you want the page live with no
agent session open at all:

```bash
npm start
# open http://localhost:4173
```

Port defaults to `4173`; override with `CONTEXT_PAD_PORT=5000 npm start`.

**Important:** the server's registration only takes effect for sessions
started *after* you run `claude mcp add` — an already-running session (e.g.
one you had open while registering) won't see it. Start a new session (new
terminal, `claude`) to pick it up.

### Claude Desktop

Add an entry to Claude Desktop's config file (Settings → Developer → Edit
Config, or directly at `~/Library/Application Support/Claude/claude_desktop_config.json`
on macOS):

```json
{
  "mcpServers": {
    "context-pad": {
      "command": "node",
      "args": ["/absolute/path/to/context-pad/mcp-server/server.js"]
    }
  }
}
```

Restart Claude Desktop to pick it up. Unlike Claude Code, Claude Desktop
keeps the server running as long as the app is open, not per-session.

### Uninstalling

```bash
claude mcp remove context-pad -s user
```

## Try it

1. Have any Claude Code session with `context-pad` registered running, then
   open `http://localhost:4173` in a browser.
2. Ask it: *"Make a dummy .md file and show it in my context pad."* The
   Reader tab should switch to it automatically.
3. Type a couple sentences into the Notes tab in that browser tab.
4. Ask the same session: *"Read my context pad notes and save them to a
   file."*

If it doesn't reach for the tool from natural phrasing, name it directly —
*"use the context-pad show_doc tool"* / *"...read_note tool"* — that always
works.

## Notes

- Works only with a Context Pad tab open at the server's URL — the hosted
  GitHub Pages version and a bare double-clicked `index.html` both continue
  to work exactly as before, with no bridge (the browser silently skips
  connecting when there's nothing to connect to).
- `read_note` reflects the last content any connected tab sent — single-user,
  local use is the assumed case, not multi-tab sync.
- **The server only runs while a Claude Code session that spawned it is
  alive** — it's a child process of that session, not a standalone daemon.
  Close every Claude Code session and `localhost:4173` goes dark until a new
  one starts. If you want it reachable all the time regardless of whether an
  agent session is open, that needs turning the HTTP/WS half into an actual
  background service (e.g. a `launchd` agent on macOS) decoupled from the
  per-session MCP spawn — not built yet, worth doing only if this limitation
  actually gets in the way day to day.
- If `claude mcp add` fails with `command not found: claude`, the CLI likely
  only exists bundled inside the VS Code extension
  (`~/.vscode/extensions/anthropic.claude-code-*/resources/native-binary/claude`)
  and isn't on your shell `PATH`. Fix: `npm install -g @anthropic-ai/claude-code`
  (if that hits an `EACCES` permissions error, your global npm prefix isn't
  user-writable — run `npm config set prefix ~/.npm-global` and add
  `~/.npm-global/bin` to your `PATH` first).
