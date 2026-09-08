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
  const DEFAULT_FONT  = 'fira-sans';
  const VALID_FONTS   = ['fira-sans', 'source-serif', 'alegreya', 'newsreader', 'montserrat', 'plex-mono'];
  const FONTSIZE_KEY     = 'contextPadFontSize';
  const DEFAULT_FONTSIZE = 16;
  const FONTSIZE_MIN     = 13;
  const FONTSIZE_MAX     = 22;
  const ANNOT_KEY      = 'contextPadAnnotations';
  const DEFAULT_ANNOTS = ['EDIT','WRONG','INCOMPLETE','SUPERFICIAL','OVERSTATED','STALE','MOVE','CUT'];
  var userAnnotations = (function () {
    try {
      var s = JSON.parse(localStorage.getItem(ANNOT_KEY));
      if (Array.isArray(s) && s.length) return s;
    } catch (e) {}
    return DEFAULT_ANNOTS.slice();
  }());
  var VALID_TAGS = {};
  function rebuildValidTags() {
    VALID_TAGS = {};
    userAnnotations.forEach(function (t) { VALID_TAGS[t] = 1; });
  }
  rebuildValidTags();

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

  // ── Annotations ────────────────────────────────────────────────────────────
  var annotBtn        = document.getElementById('annotBtn');
  var annotPicker     = document.getElementById('annotPicker');
  var annotPickerList = document.getElementById('annotPickerList');
  var currentAnnotTarget = null;
  var kbdLabel  = 'Ctrl+⇧A';
  var kbdTitle  = 'Ctrl+Shift+A';
  annotBtn.innerHTML = 'Annotate <span class="btn-shortcut">' + kbdLabel + '</span>';
  annotBtn.title = kbdTitle;

  function saveAnnotations() {
    localStorage.setItem(ANNOT_KEY, JSON.stringify(userAnnotations));
    rebuildValidTags();
  }

  function renderAnnotSettings() {
    var list = document.getElementById('annotList');
    if (!list) return;
    list.innerHTML = '';
    userAnnotations.forEach(function (type, i) {
      var row   = document.createElement('div');
      row.className = 'annot-settings-row';
      var badge = document.createElement('span');
      badge.className = 'annot-tag annot-tag--' + type.toLowerCase();
      badge.textContent = type;
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'annot-delete-btn';
      del.textContent = '×';
      del.setAttribute('aria-label', 'Remove ' + type);
      (function (idx) {
        del.addEventListener('click', function () {
          userAnnotations.splice(idx, 1);
          saveAnnotations();
          renderAnnotSettings();
        });
      }(i));
      row.appendChild(badge);
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  document.getElementById('annotAddBtn').addEventListener('click', function () {
    var input = document.getElementById('annotAddInput');
    var val = input.value.trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (!val || userAnnotations.indexOf(val) !== -1) { input.value = ''; return; }
    userAnnotations.push(val);
    saveAnnotations();
    renderAnnotSettings();
    input.value = '';
  });

  document.getElementById('annotAddInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { document.getElementById('annotAddBtn').click(); }
  });

  function insertAnnotation(type, targetArea) {
    var tag   = '[' + type + ': ]';
    var start = targetArea.selectionStart;
    var end   = targetArea.selectionEnd;
    var val   = targetArea.value;
    targetArea.value = val.slice(0, start) + tag + val.slice(end);
    var pos = start + tag.length - 1;
    targetArea.setSelectionRange(pos, pos);
    targetArea.focus();
    targetArea.dispatchEvent(new Event('input'));
  }

  function buildAnnotPickerList(targetArea) {
    annotPickerList.innerHTML = '';
    userAnnotations.forEach(function (type) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'annot-picker-btn annot-tag annot-tag--' + type.toLowerCase();
      btn.textContent = type;
      btn.addEventListener('click', function () {
        insertAnnotation(type, targetArea);
        closeAnnotPicker();
      });
      annotPickerList.appendChild(btn);
    });
  }

  function openAnnotPicker(anchorEl, targetArea) {
    currentAnnotTarget = targetArea;
    buildAnnotPickerList(targetArea);
    annotPicker.removeAttribute('hidden');
    var rect    = anchorEl.getBoundingClientRect();
    var pickerH = annotPicker.offsetHeight;
    var top = (window.innerHeight - rect.bottom > pickerH + 8)
              ? rect.bottom + 4 : rect.top - pickerH - 4;
    annotPicker.style.left = Math.max(4, rect.left) + 'px';
    annotPicker.style.top  = top + 'px';
    var firstBtn = annotPickerList.querySelector('.annot-picker-btn');
    if (firstBtn) firstBtn.focus();
  }

  function closeAnnotPicker() {
    annotPicker.setAttribute('hidden', '');
    if (currentAnnotTarget) { currentAnnotTarget.focus(); }
    currentAnnotTarget = null;
  }

  annotPicker.addEventListener('keydown', function (e) {
    var btns = Array.from(annotPickerList.querySelectorAll('.annot-picker-btn'));
    var idx  = btns.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      (btns[idx + 1] || btns[0]).focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      (btns[idx - 1] || btns[btns.length - 1]).focus();
    }
  });

  annotBtn.addEventListener('click', function () {
    if (!annotPicker.hidden) { closeAnnotPicker(); return; }
    openAnnotPicker(annotBtn, notesArea);
  });

  document.addEventListener('click', function (e) {
    var mdPickerEl    = document.getElementById('mdPicker');
    var mdBtnEl       = document.getElementById('mdBtn');
    var readerAnnotEl = document.getElementById('readerAnnotBtn');
    var readerMdEl    = document.getElementById('readerMdBtn');
    if (!annotPicker.hidden && !annotPicker.contains(e.target) &&
        e.target !== annotBtn && e.target !== readerAnnotEl) {
      closeAnnotPicker();
    }
    if (mdPickerEl && !mdPickerEl.hidden && !mdPickerEl.contains(e.target) &&
        e.target !== mdBtnEl && e.target !== readerMdEl) {
      closeMdPicker();
    }
  });

  document.addEventListener('keydown', function (e) {
    var active       = document.activeElement;
    var readerAnnotEl = document.getElementById('readerAnnotBtn');
    var readerMdEl    = document.getElementById('readerMdBtn');
    var mdBtnEl       = document.getElementById('mdBtn');
    var mdPickerEl    = document.getElementById('mdPicker');

    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      if (active === notesArea) {
        if (!annotPicker.hidden) { closeAnnotPicker(); return; }
        openAnnotPicker(annotBtn, notesArea);
      } else if (active === mdEditor) {
        if (!annotPicker.hidden) { closeAnnotPicker(); return; }
        openAnnotPicker(readerAnnotEl, mdEditor);
      }
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      if (active === notesArea) {
        if (mdPickerEl && !mdPickerEl.hidden) { closeMdPicker(); return; }
        openMdPicker(mdBtnEl, notesArea);
      } else if (active === mdEditor) {
        if (mdPickerEl && !mdPickerEl.hidden) { closeMdPicker(); return; }
        openMdPicker(readerMdEl, mdEditor);
      }
    }
    if (e.key === 'Escape') {
      if (!annotPicker.hidden) closeAnnotPicker();
      if (mdPickerEl && !mdPickerEl.hidden) closeMdPicker();
    }
  });

  openSettingsBtn.addEventListener('click', renderAnnotSettings);

  // ── Markdown Inserter ──────────────────────────────────────────────────────
  var mdBtn        = document.getElementById('mdBtn');
  var mdPicker     = document.getElementById('mdPicker');
  var mdPickerList = document.getElementById('mdPickerList');
  mdBtn.innerHTML = 'Markdown <span class="btn-shortcut">Ctrl+⇧D</span>';
  mdBtn.title = 'Ctrl+Shift+D';

  var MD_ITEMS = [
    { group:'Inline', label:'Bold',          hint:'**...**',       wrap:['**','**'], ph:'bold text' },
    { group:'Inline', label:'Italic',         hint:'*...*',         wrap:['*','*'],   ph:'italic text' },
    { group:'Inline', label:'Inline code',    hint:'`...`',         wrap:['`','`'],   ph:'code' },
    { group:'Inline', label:'Strikethrough',  hint:'~~...~~',       wrap:['~~','~~'], ph:'text' },
    { group:'Inline', label:'Link',           hint:'[text](url)',   type:'link' },
    { group:'Inline', label:'Image',          hint:'![alt](url)',   type:'image' },
    { group:'Block',  label:'Heading 1',      hint:'# ',           prefix:'# ' },
    { group:'Block',  label:'Heading 2',      hint:'## ',          prefix:'## ' },
    { group:'Block',  label:'Heading 3',      hint:'### ',         prefix:'### ' },
    { group:'Block',  label:'Bullet list',    hint:'- ',           prefix:'- ' },
    { group:'Block',  label:'Numbered list',  hint:'1. ',          prefix:'1. ' },
    { group:'Block',  label:'Blockquote',     hint:'> ',           prefix:'> ' },
    { group:'Block',  label:'Code block',     hint:'``` ```',      type:'codeblock' },
    { group:'Block',  label:'Divider',        hint:'---',          type:'divider' }
  ];

  function insertMarkdown(item, targetArea) {
    var start    = targetArea.selectionStart;
    var end      = targetArea.selectionEnd;
    var val      = targetArea.value;
    var selected = val.slice(start, end);

    if (item.wrap) {
      var inner = selected || item.ph;
      targetArea.value = val.slice(0, start) + item.wrap[0] + inner + item.wrap[1] + val.slice(end);
      targetArea.setSelectionRange(start + item.wrap[0].length, start + item.wrap[0].length + inner.length);

    } else if (item.prefix) {
      var lineStart = val.lastIndexOf('\n', start - 1) + 1;
      targetArea.value = val.slice(0, lineStart) + item.prefix + val.slice(lineStart);
      targetArea.setSelectionRange(start + item.prefix.length, start + item.prefix.length);

    } else if (item.type === 'link') {
      var lText = selected || 'link text';
      var lMd   = '[' + lText + '](url)';
      targetArea.value = val.slice(0, start) + lMd + val.slice(end);
      var urlS = start + lText.length + 3;
      targetArea.setSelectionRange(urlS, urlS + 3);

    } else if (item.type === 'image') {
      var aText = selected || 'alt text';
      var iMd   = '![' + aText + '](url)';
      targetArea.value = val.slice(0, start) + iMd + val.slice(end);
      var iUrlS = start + aText.length + 4;
      targetArea.setSelectionRange(iUrlS, iUrlS + 3);

    } else if (item.type === 'codeblock') {
      var cbInner = selected || '';
      var cbText  = '```\n' + cbInner + '\n```';
      targetArea.value = val.slice(0, start) + cbText + val.slice(end);
      targetArea.setSelectionRange(start + 4, start + 4 + cbInner.length);

    } else if (item.type === 'divider') {
      var divText = '\n\n---\n\n';
      targetArea.value = val.slice(0, start) + divText + val.slice(end);
      targetArea.setSelectionRange(start + divText.length, start + divText.length);
    }

    targetArea.focus();
    targetArea.dispatchEvent(new Event('input'));
  }

  function buildMdPickerList(targetArea) {
    mdPickerList.innerHTML = '';
    var currentGroup = null;
    MD_ITEMS.forEach(function (item) {
      if (item.group !== currentGroup) {
        currentGroup = item.group;
        var g = document.createElement('p');
        g.className = 'md-picker-group';
        g.textContent = item.group;
        mdPickerList.appendChild(g);
      }
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'md-picker-btn';
      btn.innerHTML = '<span class="md-picker-label">' + item.label + '</span>' +
                      '<span class="md-picker-hint">' + item.hint + '</span>';
      btn.addEventListener('click', function () {
        insertMarkdown(item, targetArea);
        closeMdPicker();
      });
      mdPickerList.appendChild(btn);
    });
  }

  function openMdPicker(anchorEl, targetArea) {
    closeAnnotPicker();
    currentAnnotTarget = targetArea;
    buildMdPickerList(targetArea);
    mdPicker.removeAttribute('hidden');
    var rect    = anchorEl.getBoundingClientRect();
    var pickerH = mdPicker.offsetHeight;
    var top = (window.innerHeight - rect.bottom > pickerH + 8)
              ? rect.bottom + 4 : rect.top - pickerH - 4;
    mdPicker.style.left = Math.max(4, rect.left) + 'px';
    mdPicker.style.top  = top + 'px';
    var firstBtn = mdPickerList.querySelector('.md-picker-btn');
    if (firstBtn) firstBtn.focus();
  }

  function closeMdPicker() {
    mdPicker.setAttribute('hidden', '');
    if (currentAnnotTarget) { currentAnnotTarget.focus(); }
    currentAnnotTarget = null;
  }

  mdPicker.addEventListener('keydown', function (e) {
    var btns = Array.from(mdPickerList.querySelectorAll('.md-picker-btn'));
    var idx  = btns.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      (btns[idx + 1] || btns[0]).focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      (btns[idx - 1] || btns[btns.length - 1]).focus();
    }
  });

  mdBtn.addEventListener('click', function () {
    if (!mdPicker.hidden) { closeMdPicker(); return; }
    openMdPicker(mdBtn, notesArea);
  });

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

  // ── Save Helper ────────────────────────────────────────────────────────────
  function saveTextFile(text, suggestedName, onDone) {
    if (window.showSaveFilePicker) {
      window.showSaveFilePicker({
        suggestedName: suggestedName,
        types: [{ description: 'Markdown / text', accept: { 'text/plain': ['.md', '.txt'] } }]
      }).then(function (fh) {
        return fh.createWritable().then(function (w) {
          return w.write(text).then(function () { return w.close(); });
        });
      }).then(function () {
        if (onDone) onDone('saved');
      }).catch(function (err) {
        if (err.name !== 'AbortError' && onDone) onDone('error');
      });
    } else {
      var blob = new Blob([text], { type: 'text/plain' });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement('a');
      a.href = url; a.download = suggestedName;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      if (onDone) onDone('downloaded');
    }
  }

  // ── Notes ──────────────────────────────────────────────────────────────────
  var copyBtn     = document.getElementById('copyAll');
  var saveBtn     = document.getElementById('saveNotes');
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

  saveBtn.addEventListener('click', function () {
    var text = notesArea.value;
    if (!text.trim()) { notesStatus.textContent = 'Nothing to save yet.'; return; }
    saveTextFile(text, 'notes.md', function (result) {
      notesStatus.textContent = result === 'saved' ? 'Saved.' : result === 'downloaded' ? 'Downloaded.' : 'Save failed.';
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
      .replace(/`([^`]+)`/g,     '<code>$1</code>')
      .replace(/\[([A-Z]+):\s*([^\]]*)\]/g, function (match, type, content) {
        if (!VALID_TAGS[type]) return match;
        return '<mark class="annot-tag annot-tag--' + type.toLowerCase() +
               '" data-tag-type="' + type + '">[' + type + ': ' + content + ']</mark>';
      });
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

  function buildTagsSidebar(contentEl, tagsSidebarEl, tagsContentEl) {
    var allTags = Array.from(contentEl.querySelectorAll('.annot-tag'));
    allTags.forEach(function (el, i) { el.id = 'annot-' + i; });
    tagsContentEl.innerHTML = '';

    if (!allTags.length) { tagsSidebarEl.hidden = true; return; }

    var order = [];
    var groups = {};
    allTags.forEach(function (el) {
      var type = el.dataset.tagType;
      if (!groups[type]) { groups[type] = []; order.push(type); }
      groups[type].push(el);
    });

    order.forEach(function (type) {
      var label = document.createElement('p');
      label.className = 'tags-group-label';
      label.textContent = type + ' · ' + groups[type].length;
      tagsContentEl.appendChild(label);

      groups[type].forEach(function (el) {
        var a = document.createElement('a');
        a.href = '#' + el.id;
        a.className = 'tags-entry annot-tag annot-tag--' + type.toLowerCase();
        var preview = el.textContent;
        a.textContent = preview.length > 44 ? preview.slice(0, 41) + '…' : preview;
        tagsContentEl.appendChild(a);
      });
    });

    tagsSidebarEl.hidden = false;
  }

  // ── MD Reader ──────────────────────────────────────────────────────────────
  var fileInput        = document.getElementById('mdFileInput');
  var readerLayout     = document.getElementById('readerLayout');
  var mdContent        = document.getElementById('mdContent');
  var mdEditor         = document.getElementById('mdEditor');
  var tocEl            = document.getElementById('toc');
  var tagsSidebarEl    = document.getElementById('tagsSidebar');
  var tagsContentEl    = document.getElementById('tagsContent');
  var docTitle         = document.getElementById('docTitle');
  var docPath          = document.getElementById('docPath');
  var readerTokenCount = document.getElementById('readerTokenCount');
  var readerEditBtn    = document.getElementById('readerEditBtn');
  var readerAnnotBtn   = document.getElementById('readerAnnotBtn');
  readerAnnotBtn.innerHTML = 'Annotate <span class="btn-shortcut">' + kbdLabel + '</span>';
  readerAnnotBtn.title = kbdTitle;
  var readerMdBtn      = document.getElementById('readerMdBtn');
  readerMdBtn.innerHTML = 'Markdown <span class="btn-shortcut">Ctrl+⇧D</span>';
  readerMdBtn.title = 'Ctrl+Shift+D';
  var readerSaveBtn    = document.getElementById('readerSaveBtn');

  var currentMdSource   = '';
  var currentMdFilename = 'document.md';
  var readerEditMode    = false;

  function exitEditMode() {
    mdEditor.setAttribute('hidden', '');
    mdContent.removeAttribute('hidden');
    readerEditBtn.textContent = 'Edit';
    readerAnnotBtn.setAttribute('hidden', '');
    readerMdBtn.setAttribute('hidden', '');
    readerEditMode = false;
  }

  function renderView(source) {
    mdContent.innerHTML = renderMarkdown(source);
    buildToc(mdContent, tocEl);
    buildTagsSidebar(mdContent, tagsSidebarEl, tagsContentEl);
    var tokenStr = estimateTokens(source);
    readerTokenCount.textContent = tokenStr || '';
    readerTokenCount.style.display = tokenStr ? '' : 'none';
  }

  readerEditBtn.addEventListener('click', function () {
    if (!readerEditMode) {
      mdEditor.value = currentMdSource;
      mdContent.setAttribute('hidden', '');
      mdEditor.removeAttribute('hidden');
      readerEditBtn.textContent = 'View';
      readerAnnotBtn.removeAttribute('hidden');
      readerMdBtn.removeAttribute('hidden');
      readerEditMode = true;
    } else {
      currentMdSource = mdEditor.value;
      exitEditMode();
      renderView(currentMdSource);
    }
  });

  readerAnnotBtn.addEventListener('click', function () {
    if (!annotPicker.hidden) { closeAnnotPicker(); return; }
    openAnnotPicker(readerAnnotBtn, mdEditor);
  });

  readerMdBtn.addEventListener('click', function () {
    if (!mdPicker.hidden) { closeMdPicker(); return; }
    openMdPicker(readerMdBtn, mdEditor);
  });

  readerSaveBtn.addEventListener('click', function () {
    var text = readerEditMode ? mdEditor.value : currentMdSource;
    if (!text.trim()) return;
    var name = currentMdFilename;
    if (!/\.(md|txt)$/i.test(name)) name += '.md';
    saveTextFile(text, name, function (result) {
      if (result === 'error') docPath.textContent = 'Save failed.';
    });
  });

  function displayMd(text, filename) {
    currentMdSource   = text;
    currentMdFilename = filename;
    if (readerEditMode) exitEditMode();
    docTitle.textContent = filename;
    docPath.textContent  = filename;
    renderView(text);
    readerLayout.removeAttribute('hidden');
    readerEditBtn.removeAttribute('hidden');
    readerSaveBtn.removeAttribute('hidden');
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

  // ── MCP Bridge ─────────────────────────────────────────────────────────────
  // Optional: only connects when Context Pad is served locally by
  // mcp-server/ (see README). No-ops on GitHub Pages / file:// — an AI agent
  // can then read_note the Notes tab and show_doc into the Reader tab live.
  var agentDocsHint = document.getElementById('agentDocsHint');
  var saveDocsToggle = document.getElementById('saveDocsToggle');
  var saveDocsDir     = document.getElementById('saveDocsDir');

  if (location.protocol === 'http:' || location.protocol === 'https:') {
    try {
      var wsProto = location.protocol === 'https:' ? 'wss://' : 'ws://';
      var bridge  = new WebSocket(wsProto + location.host + '/ws');

      bridge.addEventListener('open', function () {
        bridge.send(JSON.stringify({ type: 'notes', content: notesArea.value }));
      });

      bridge.addEventListener('message', function (e) {
        var msg;
        try { msg = JSON.parse(e.data); } catch (err) { return; }
        if (msg.type === 'show_doc') {
          displayMd(msg.content, msg.title || 'From agent');
          docPath.textContent = 'Pushed from an AI agent via MCP';
          switchTab('reader');
        } else if (msg.type === 'config') {
          agentDocsHint.textContent = 'Docs an agent pushes via show_doc are saved here.';
          saveDocsToggle.disabled = false;
          saveDocsDir.disabled = false;
          saveDocsToggle.checked = !!msg.saveDocs;
          saveDocsDir.value = msg.saveDir || '';
        }
      });

      notesArea.addEventListener('input', function () {
        if (bridge.readyState === WebSocket.OPEN) {
          bridge.send(JSON.stringify({ type: 'notes', content: notesArea.value }));
        }
      });

      function sendAgentDocsConfig() {
        if (bridge.readyState === WebSocket.OPEN) {
          bridge.send(JSON.stringify({
            type: 'config',
            saveDocs: saveDocsToggle.checked,
            saveDir: saveDocsDir.value
          }));
        }
      }

      saveDocsToggle.addEventListener('change', sendAgentDocsConfig);
      saveDocsDir.addEventListener('change', sendAgentDocsConfig);
    } catch (e) {
      // No local MCP bridge available — Notes and Reader still work normally.
    }
  }

})();
