Tired of talking to AIs via a single line input space ?

![alt text](https://kenoleon.github.io/context-pad/tinyspace.png)

# Context Pad

Draft and read long-form text locally, then paste it into any AI chat.
No server, no install, no dependencies. Open `index.html` directly in
any browser.

## The workflow

Chat inputs are built for short messages, not for drafting a system
prompt, writing up a bug report, or assembling a wall of context before
you paste it in. Context Pad is the scratchpad in between:

1. **Write** in the Notes tab — a real textarea, not a one-line box.
2. **Check the size** — live token/word count tells you if it'll fit
   before you paste.
3. **Copy all** and hand it to whichever AI you're talking to.

The MD Reader tab is the other half of the loop: open a `.md` file — a
spec, an exported chat, a README — read it formatted, annotate it, edit
it, and save it back to disk, all without leaving the browser.

![Drafting a prompt in Context Pad, with live token count before copying it out](https://kenoleon.github.io/context-pad/screen_workflow.png)

## Try it 

[Context Pad](https://kenoleon.github.io/context-pad/)



## Screenshots


![Context Pad — Notes tab with Markdown inserter picker open](https://kenoleon.github.io/context-pad/screen_pad.png)


![Context Pad — MD Reader with annotation tag highlighting and Annotations sidebar](https://kenoleon.github.io/context-pad/screen_read.png)




## Features

### Notes pad
Where you draft. Auto-saves to browser storage as you type, so notes
survive between sessions — but the point is getting text out, not
storing it.
- **Copy all** to clipboard
- **Save** — download notes as a `.txt` file (uses File System Access API
  in Chrome/Edge, blob download fallback in Safari/Firefox)
- Live **token and word count** so you know it'll fit before you paste
- **Annotate** `Ctrl+Shift+A` — opens a picker to insert an inline
  annotation tag (`[EDIT: ]`, `[WRONG: ]`, etc.) at the cursor; tags
  are configurable in Settings
- **Markdown** `Ctrl+Shift+D` — opens a picker with 14 CommonMark
  shortcuts (Bold, Italic, Inline code, Strikethrough, Link, Image,
  H1–H3, Bullet list, Numbered list, Blockquote, Code block, Divider);
  wraps selected text or inserts with a placeholder
- Clear with confirmation
- Spell check via browser (toggle in Settings)

### MD Reader
Open any local `.md` file and render it as formatted text — then edit
and annotate without leaving the tab.
- Heading, list, bold, italic, inline code, blockquote, fenced code
  block, strikethrough support
- Collapsible **Jump to section** TOC sidebar
- Token and word count shown on load
- **Edit mode** — toggle between rendered view and a raw Markdown
  textarea; edit, then **Save** directly back to the original file
  (File System Access API in Chrome/Edge, blob download fallback)
- **Annotate** `Ctrl+Shift+A` and **Markdown** `Ctrl+Shift+D` pickers
  available in edit mode, same as Notes
- **Annotation tag highlighting** — tags like `[WRONG: reason]` or
  `[EDIT: note]` are syntax-highlighted inline in the rendered view,
  each type with its own colour
- **Annotations sidebar** — lists every tag in the document grouped by
  type; click any entry to jump to it
- Nothing is uploaded — file is read locally via FileReader API

### Annotation tags
Inline markers you insert into text to flag issues or changes needed.
Syntax: `[TYPE: your note here]` — e.g. `[WRONG: timeline is off]`.

Default tag types: `EDIT`, `WRONG`, `INCOMPLETE`, `SUPERFICIAL`,
`OVERSTATED`, `STALE`, `MOVE`, `CUT`.

Tags are highlighted in the MD Reader and listed in the Annotations
sidebar. They are plain text, so they survive copy-paste into any AI
chat or text editor.

### Theme picker
Four colour themes: **Light**, **Paper**, **Semi-dark** (default), **Dark**.
Choice persists across sessions.

### Settings (⚙)
- **Content width** — slider from 400 to 1400 px controls whitespace on the sides
- **Font** — choose from Fira Sans (default), Source Serif 4, Alegreya, Newsreader, Montserrat, or IBM Plex Mono
- **Spell check** — toggle browser spell-check on the notes textarea
- **Table of Contents** — show/hide the TOC sidebar in the MD reader
- **Annotations** — add or remove annotation tag types; changes take
  effect immediately in the picker and in the next MD Reader render

## MCP (optional)

Want an AI agent to read your notes and push formatted docs into the
Reader tab directly — no copy-paste, no save-then-open? See
[`mcp-server/`](mcp-server/) for a small local companion server
(`read_note`, `show_doc`) you can register with Claude Code. Opt-in only —
the plain static app above works exactly the same with or without it.

## Spell check notes

Spell check in the notes pad relies on the browser and OS:
- Works well in Chrome and Edge on Windows with language set to English
- Toggling the setting in ⚙ re-applies the `spellcheck` attribute, which can wake up a sluggish browser checker
- If underlines are not appearing, right-click the textarea → Check Spelling (Chrome) or enable spell check in browser settings
- Grammar checking is not available without a third-party API — the browser only flags spelling

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell, tab panels, settings dialog |
| `theme.css` | Colour themes and all layout styles |
| `app.js` | All behaviour: topbar, tabs, theme, width, notes, MD reader, settings |
| `README.md` | This file |
| `mcp-server/` | Optional local MCP server — see [`mcp-server/README.md`](mcp-server/README.md) |

## Storage keys (localStorage)

| Key | What it stores |
|---|---|
| `contextPadTheme` | Active theme name |
| `contextPadTab` | Last active tab |
| `contextPadNotes` | Notes textarea content |
| `contextPadWidth` | Content width preset |
| `contextPadSpellcheck` | Spell check on/off |
| `contextPadFont` | Selected font |
| `contextPadFontSize` | Selected font size |
| `contextPadTocVisible` | TOC sidebar shown/hidden in MD reader |
| `contextPadAnnotations` | User-configured annotation tag types |
