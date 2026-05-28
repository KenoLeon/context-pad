(function () {
  'use strict';

  // ── Config ─────────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'notes',  label: 'Notes'     },
    { id: 'reader', label: 'MD Reader' }
  ];
  const THEME_KEY      = 'contextPadTheme';
  const NOTES_KEY      = 'contextPadNotes';
  const TAB_KEY        = 'contextPadTab';
  const WIDTH_KEY      = 'contextPadWidth';
  const SPELLCHECK_KEY = 'contextPadSpellcheck';
  const TOC_KEY        = 'contextPadTocVisible';
  const FONT_KEY       = 'contextPadFont';
  const DEFAULT_THEME  = 'semi-dark';
  const DEFAULT_WIDTH_PX = 1100;
  const WIDTH_MIN = 400;
  const WIDTH_MAX = 1400;
  const DEFAULT_FONT  = 'sans';
  const VALID_FONTS   = ['sans', 'serif', 'mono', 'typewriter', 'script'];
  const FONTSIZE_KEY     = 'contextPadFontSize';
  const DEFAULT_FONTSIZE = 16;
  const FONTSIZE_MIN     = 13;
  const FONTSIZE_MAX     = 22;

  // ── Build Topbar ───────────────────────────────────────────────────────────
  const tabButtonsHtml = TABS.map(t =>
    `<button type="button" class="topnav-tab" id="tab-${t.id}" role="tab"
       aria-controls="panel-${t.id}" aria-selected="false">${t.label}</button>`
  ).join('');

  const bar = document.createElement('header');
  bar.className = 'topbar';
  bar.innerHTML = `
    <div class="topbar-inner">
      <div class="brand-wrap">
        <span class="brand">Context Pad</span>
        <span class="brand-sub">Your scratchpad.</span>
      </div>
      <nav class="topnav" role="tablist" aria-label="Primary navigation">
        ${tabButtonsHtml}
      </nav>
      <div class="topbar-controls">
        <div class="theme-picker" role="group" aria-label="Theme chooser">
          <button type="button" data-theme-value="light"     aria-label="Light theme"     title="Light theme"    ><span aria-hidden="true"></span></button>
          <button type="button" data-theme-value="paper"     aria-label="Paper theme"     title="Paper theme"    ><span aria-hidden="true"></span></button>
          <button type="button" data-theme-value="semi-dark" aria-label="Semi-dark theme" title="Semi-dark theme"><span aria-hidden="true"></span></button>
          <button type="button" data-theme-value="dark"      aria-label="Dark theme"      title="Dark theme"     ><span aria-hidden="true"></span></button>
        </div>
        <button type="button" id="openSettings" class="settings-btn" aria-label="Open settings" title="Settings">&#9881;</button>
      </div>
    </div>
  `;
  document.body.prepend(bar);

  // ── Theme ──────────────────────────────────────────────────────────────────
  const themeButtons = Array.from(bar.querySelectorAll('[data-theme-value]'));

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    themeButtons.forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-theme-value') === theme ? 'true' : 'false');
    });
  }

  var VALID_THEMES = ['light', 'paper', 'semi-dark', 'dark'];
  var storedTheme = localStorage.getItem(THEME_KEY);
  setTheme(VALID_THEMES.includes(storedTheme) ? storedTheme : DEFAULT_THEME);

  themeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setTheme(btn.getAttribute('data-theme-value'));
    });
  });

  // ── Tabs ───────────────────────────────────────────────────────────────────
  var panels = {};
  TABS.forEach(function (t) {
    panels[t.id] = document.getElementById('panel-' + t.id);
  });

  function switchTab(id) {
    TABS.forEach(function (t) {
      var btn   = document.getElementById('tab-' + t.id);
      var panel = panels[t.id];
      var active = t.id === id;
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', '');
      }
    });
    localStorage.setItem(TAB_KEY, id);
  }

  TABS.forEach(function (t) {
    document.getElementById('tab-' + t.id).addEventListener('click', function () {
      switchTab(t.id);
    });
  });

  // Restore last active tab, fall back to first
  switchTab(localStorage.getItem(TAB_KEY) || TABS[0].id);

  // ── Content Width (slider) ─────────────────────────────────────────────────
  var widthSlider = document.getElementById('widthSlider');
  var widthVal    = document.getElementById('widthVal');

  widthSlider.min  = WIDTH_MIN;
  widthSlider.max  = WIDTH_MAX;
  widthSlider.step = 10;

  function setWidth(px) {
    px = Math.max(WIDTH_MIN, Math.min(WIDTH_MAX, parseInt(px, 10) || DEFAULT_WIDTH_PX));
    document.documentElement.style.setProperty('--page-max-w', px + 'px');
    localStorage.setItem(WIDTH_KEY, px);
    widthSlider.value = px;
    widthVal.textContent = px + ' px';
  }

  var storedWidth = parseInt(localStorage.getItem(WIDTH_KEY), 10);
  setWidth(isNaN(storedWidth) ? DEFAULT_WIDTH_PX : storedWidth);

  widthSlider.addEventListener('input', function () {
    setWidth(widthSlider.value);
  });

  // ── Font ──────────────────────────────────────────────────────────
  function setFont(font) {
    document.body.setAttribute('data-font', font);
    localStorage.setItem(FONT_KEY, font);
    document.querySelectorAll('[name="bodyFont"]').forEach(function (r) {
      r.checked = r.value === font;
    });
  }

  var storedFont = localStorage.getItem(FONT_KEY);
  setFont(VALID_FONTS.includes(storedFont) ? storedFont : DEFAULT_FONT);

  document.addEventListener('change', function (e) {
    if (e.target.name === 'bodyFont') { setFont(e.target.value); }
  });

  // ── Font Size ───────────────────────────────────────────────────
  var fontSizeSlider = document.getElementById('fontSizeSlider');
  var fontSizeVal    = document.getElementById('fontSizeVal');

  function setFontSize(px) {
    px = Math.max(FONTSIZE_MIN, Math.min(FONTSIZE_MAX, parseInt(px, 10) || DEFAULT_FONTSIZE));
    document.documentElement.style.setProperty('--content-font-size', px + 'px');
    localStorage.setItem(FONTSIZE_KEY, px);
    fontSizeSlider.value = px;
    fontSizeVal.textContent = px + ' px';
  }

  var storedFontSize = parseInt(localStorage.getItem(FONTSIZE_KEY), 10);
  setFontSize(isNaN(storedFontSize) ? DEFAULT_FONTSIZE : storedFontSize);

  fontSizeSlider.addEventListener('input', function () {
    setFontSize(fontSizeSlider.value);
  });

  // ── Settings Modal ─────────────────────────────────────────────────────────
  var modal            = document.getElementById('settingsModal');
  var openSettingsBtn  = document.getElementById('openSettings');
  var closeSettingsBtn = document.getElementById('closeSettings');

  openSettingsBtn.addEventListener('click', function () { modal.showModal(); });
  closeSettingsBtn.addEventListener('click', function () { modal.close(); });
  modal.addEventListener('click', function (e) { if (e.target === modal) { modal.close(); } });

  // ── Spell Check ────────────────────────────────────────────────────────────
  var notesArea        = document.getElementById('quickNotes');
  var spellcheckToggle = document.getElementById('spellcheckToggle');

  function applySpellcheck(enabled) {
    notesArea.setAttribute('spellcheck', enabled ? 'true' : 'false');
    spellcheckToggle.checked = enabled;
    localStorage.setItem(SPELLCHECK_KEY, enabled ? 'true' : 'false');
    // Blur/focus cycle wakes up the browser spell checker
    if (enabled && document.activeElement === notesArea) {
      notesArea.blur();
      notesArea.focus();
    }
  }

  var spellcheckEnabled = localStorage.getItem(SPELLCHECK_KEY) !== 'false';
  applySpellcheck(spellcheckEnabled);

  spellcheckToggle.addEventListener('change', function () {
    applySpellcheck(spellcheckToggle.checked);
  });

  // ── TOC Setting ────────────────────────────────────────────────────────────
  var tocSettingToggle = document.getElementById('tocSettingToggle');
  var tocShown = localStorage.getItem(TOC_KEY) === 'true';

  function applyTocSetting(show) {
    tocShown = show;
    localStorage.setItem(TOC_KEY, show ? 'true' : 'false');
    tocSettingToggle.checked = show;
    var layout = document.getElementById('readerLayout');
    if (layout) { layout.classList.toggle('toc-collapsed', !show); }
  }

  applyTocSetting(tocShown);

  tocSettingToggle.addEventListener('change', function () {
    applyTocSetting(tocSettingToggle.checked);
  });

  // ── Token / Word Count ─────────────────────────────────────────────────────
  var tokenCountEl = document.getElementById('tokenCount');

  function estimateTokens(text) {
    if (!text || !text.trim()) return null;
    var words  = text.trim().split(/\s+/).filter(Boolean).length;
    var tokens = Math.round(text.length / 4);
    return '~' + tokens + '\u202ftokens\u2002\u00b7\u2002' + words + '\u202fwords';
  }

  function updateNotesCount() {
    var result = estimateTokens(notesArea.value);
    if (result) {
      tokenCountEl.textContent = result;
      tokenCountEl.style.display = '';
    } else {
      tokenCountEl.style.display = 'none';
    }
  }

  // ── Notes ──────────────────────────────────────────────────────────────────
  var copyBtn     = document.getElementById('copyAll');
  var clearBtn    = document.getElementById('clearAll');
  var notesStatus = document.getElementById('notesStatus');

  // Restore saved notes
  notesArea.value = localStorage.getItem(NOTES_KEY) || '';
  updateNotesCount();

  var saveTimer;
  notesArea.addEventListener('input', function () {
    clearTimeout(saveTimer);
    updateNotesCount();
    saveTimer = setTimeout(function () {
      localStorage.setItem(NOTES_KEY, notesArea.value);
      notesStatus.textContent = 'Saved.';
    }, 800);
  });

  copyBtn.addEventListener('click', function () {
    if (!notesArea.value.trim()) {
      notesStatus.textContent = 'Nothing to copy yet.';
      return;
    }
    navigator.clipboard.writeText(notesArea.value).then(function () {
      notesStatus.textContent = 'Copied to clipboard.';
    }, function () {
      notesStatus.textContent = 'Copy failed — try Ctrl+C.';
    });
  });

  clearBtn.addEventListener('click', function () {
    if (!notesArea.value.trim()) {
      notesStatus.textContent = 'Already empty.';
      return;
    }
    notesArea.value = '';
    localStorage.removeItem(NOTES_KEY);
    notesArea.focus();
    notesStatus.textContent = 'Cleared.';
    updateNotesCount();
  });

  // ── Markdown Parser ────────────────────────────────────────────────────────
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;');
  }

  function inlineFormat(text) {
    return text
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g,  '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,     '<em>$1</em>')
      .replace(/`([^`]+)`/g,     '<code>$1</code>');
  }

  function renderMarkdown(markdown) {
    var lines   = markdown.split('\n');
    var html    = '';
    var inUl    = false;
    var inOl    = false;
    var inCode  = false;
    var codeBuf = [];

    function closeLists() {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
    }

    for (var i = 0; i < lines.length; i++) {
      var rawLine = lines[i];
      var line    = rawLine.trimEnd();
      var trimmed = line.trim();

      // Fenced code block
      if (/^```/.test(trimmed)) {
        if (!inCode) {
          closeLists();
          inCode  = true;
          codeBuf = [];
        } else {
          html   += '<pre><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>';
          inCode  = false;
          codeBuf = [];
        }
        continue;
      }
      if (inCode) {
        codeBuf.push(rawLine);
        continue;
      }

      if (!trimmed) { closeLists(); continue; }

      if (/^---\s*$/.test(trimmed)) { closeLists(); html += '<hr />'; continue; }

      if (/^#{4}\s+/.test(trimmed)) {
        closeLists();
        html += '<h4>' + inlineFormat(escapeHtml(trimmed.replace(/^#{4}\s+/, ''))) + '</h4>';
        continue;
      }
      if (/^###\s+/.test(trimmed)) {
        closeLists();
        html += '<h3>' + inlineFormat(escapeHtml(trimmed.replace(/^###\s+/, ''))) + '</h3>';
        continue;
      }
      if (/^##\s+/.test(trimmed)) {
        closeLists();
        html += '<h2>' + inlineFormat(escapeHtml(trimmed.replace(/^##\s+/, ''))) + '</h2>';
        continue;
      }
      if (/^#\s+/.test(trimmed)) {
        closeLists();
        html += '<h1>' + inlineFormat(escapeHtml(trimmed.replace(/^#\s+/, ''))) + '</h1>';
        continue;
      }

      var olMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
      if (olMatch) {
        if (!inOl) { closeLists(); html += '<ol>'; inOl = true; }
        html += '<li>' + inlineFormat(escapeHtml(olMatch[2])) + '</li>';
        continue;
      }

      if (/^-\s+/.test(trimmed)) {
        if (!inUl) { closeLists(); html += '<ul>'; inUl = true; }
        html += '<li>' + inlineFormat(escapeHtml(trimmed.replace(/^-\s+/, ''))) + '</li>';
        continue;
      }

      // Blockquote
      if (/^>\s+/.test(trimmed)) {
        closeLists();
        html += '<blockquote><p>' + inlineFormat(escapeHtml(trimmed.replace(/^>\s+/, ''))) + '</p></blockquote>';
        continue;
      }

      closeLists();
      html += '<p>' + inlineFormat(escapeHtml(trimmed)) + '</p>';
    }

    closeLists();
    return html;
  }

  function buildToc(contentEl, tocEl) {
    tocEl.innerHTML = '';
    var headings = Array.from(contentEl.querySelectorAll('h2, h3'));
    headings.forEach(function (h, i) {
      var id = 'toc-' + i;
      h.id = id;
      var li = document.createElement('li');
      var a  = document.createElement('a');
      a.href = '#' + id;
      a.textContent = h.textContent || 'Section';
      li.appendChild(a);
      tocEl.appendChild(li);
    });
    return headings.length;
  }

  // ── MD Reader ──────────────────────────────────────────────────────────────
  var fileInput        = document.getElementById('mdFileInput');
  var readerLayout     = document.getElementById('readerLayout');
  var mdContent        = document.getElementById('mdContent');
  var tocEl            = document.getElementById('toc');
  var docTitle         = document.getElementById('docTitle');
  var docPath          = document.getElementById('docPath');
  var readerTokenCount = document.getElementById('readerTokenCount');

  function displayMd(text, filename) {
    docTitle.textContent = filename;
    docPath.textContent  = filename;
    mdContent.innerHTML  = renderMarkdown(text);
    buildToc(mdContent, tocEl);
    readerLayout.removeAttribute('hidden');

    var tokenStr = estimateTokens(text);
    readerTokenCount.textContent = tokenStr || '';
    readerTokenCount.style.display = tokenStr ? '' : 'none';

    // Respect current TOC setting instead of resetting it
    readerLayout.classList.toggle('toc-collapsed', !tocShown);
  }

  fileInput.addEventListener('change', function () {
    var file = fileInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload  = function (e) { displayMd(e.target.result, file.name); };
    reader.onerror = function ()  { docTitle.textContent = 'Could not read file.'; };
    reader.readAsText(file, 'utf-8');
  });

  document.getElementById('loadReadme').addEventListener('click', function (e) {
    e.preventDefault();
    fetch('./README.md')
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.text();
      })
      .then(function (text) { displayMd(text, 'README.md'); })
      .catch(function () { docTitle.textContent = 'Could not load README.md.'; });
  });

})();
