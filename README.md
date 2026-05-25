
Tired of talking to AIs via a single line input space ?

![alt text](tinyspace.png)

# Context Writer

A lightweight single-page writing and reading tool for working with personal context files.
No server, no install, no dependencies. Open `index.html` directly in any browser.

## Try it 

[Context Pad](https://kenoleon.github.io/context-pad/)

## Features

### Notes pad
Scratchpad with auto-save to browser storage. Notes survive between sessions.
- Copy all to clipboard
- Clear with confirmation
- Live **token and word count** in the toolbar
- Spell check via browser (toggle in Settings)

### MD Reader
Open any local `.md` file and render it as formatted text.
- Heading, list, bold, italic, inline code, blockquote, fenced code block support
- Collapsible **Jump to section** TOC sidebar
- Token and word count shown on load
- Nothing is uploaded — file is read locally via FileReader API

### Theme picker
Four colour themes: **Light**, **Paper**, **Semi-dark** (default), **Dark**.
Choice persists across sessions.

### Settings (⚙)
- **Content width** — Narrow / Medium / Wide / Full controls how much whitespace appears on the sides
- **Spell check** — toggle browser spell-check on the notes textarea

## Spell check notes

Spell check in the notes pad relies on the browser and OS:
- Works well in Chrome and Edge on Windows with language set to English
- Toggling the setting in ⚙ re-applies the `spellcheck` attribute, which can wake up a sluggish browser checker
- If underlines are not appearing, right-click the textarea → Check Spelling (Chrome) or enable spell check in browser settings
- Grammar checking is not available without a third-party API — the browser only flags spelling

## Planned / future tabs

- **Caveman mode** — strip prepositions and filler words to compress context file token count
- **Diff view** — compare two versions of a context file side by side
- **Export** — download notes as `.md` with a timestamped header

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell, tab panels, settings dialog |
| `theme.css` | Colour themes and all layout styles |
| `app.js` | All behaviour: topbar, tabs, theme, width, notes, MD reader, settings |
| `README.md` | This file |

## Storage keys (localStorage)

| Key | What it stores |
|---|---|
| `contextPadTheme` | Active theme name |
| `contextPadTab` | Last active tab |
| `contextPadNotes` | Notes textarea content |
| `contextPadWidth` | Content width preset |
| `contextPadSpellcheck` | Spell check on/off |
