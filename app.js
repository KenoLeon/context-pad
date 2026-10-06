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
    <div class="topbar-row"><div class="topbar-inner">
      <div class="brand-wrap">
        <span class="brand">Context Pad</span>
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
    </div></div>
  `;
  document.body.prepend(bar);

  // Second header row: the per-tab action bar, so actions stay visible while scrolling
  var actionBar = document.getElementById('actionBar');
  bar.appendChild(actionBar);

  // Sticky offsets (sidebar, jump targets) follow the real header height
  function syncHeaderHeight() {
    document.documentElement.style.setProperty('--header-h', bar.offsetHeight + 'px');
  }
  syncHeaderHeight();
  if (window.ResizeObserver) { new ResizeObserver(syncHeaderHeight).observe(bar); }
  window.addEventListener('resize', syncHeaderHeight);

  // ── Icons (inline SVG, stroke = currentColor) ──────────────────────────────
  var ICONS = {
    copy:     '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    save:     '<path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M8 4v5h7V4"/><path d="M8 20v-6h8v6"/>',
    folder:   '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    toNotes:  '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/><path d="M8 14h7M12 11l3 3-3 3"/>',
    tag:      '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.4"/>',
    markdown: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 15V9l3 3 3-3v6"/><path d="M17 9v6M14.5 12.5 17 15l2.5-2.5"/>',
    trash:    '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
    sidebar:  '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
    plus:     '<path d="M12 5v14M5 12h14"/>',
    chevron:  '<path d="M6 9l6 6 6-6"/>'
  };

  function iconSvg(name) {
    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ' +
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
  }

  // Wraps the button's current contents in .btn-label and prepends its icon.
  // Run after any innerHTML assignment to the button.
  function applyIcon(btn) {
    var name = btn.getAttribute('data-icon');
    if (!name || !ICONS[name]) return;
    var label = btn.innerHTML.trim();
    // Labels can be hidden on narrow screens; keep an accessible name
    if (label && !btn.getAttribute('aria-label')) btn.setAttribute('aria-label', btn.textContent.trim());
    btn.innerHTML = iconSvg(name) + (label ? '<span class="btn-label">' + label + '</span>' : '');
  }

  // ── Toolbar status + unavailable actions ───────────────────────────────────
  // Transient message that fades out on its own
  function flashStatus(el, msg) {
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(el._fadeTimer);
    el._fadeTimer = setTimeout(function () { el.classList.remove('is-visible'); }, 2600);
  }

  // Buttons stay visible when unavailable; clicking one explains why instead
  function setUnavailable(btn, off, reason) {
    if (btn.dataset.title === undefined) btn.dataset.title = btn.title || '';
    btn.setAttribute('aria-disabled', off ? 'true' : 'false');
    btn.dataset.reason = off ? reason : '';
    btn.title = off ? reason : btn.dataset.title;
  }

  actionBar.addEventListener('click', function (e) {
    var btn = e.target.closest('[aria-disabled="true"]');
    if (!btn) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    var status = btn.closest('.actionbar-inner').querySelector('.tb-status');
    if (status && btn.dataset.reason) flashStatus(status, btn.dataset.reason);
  }, true);

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
      actionBar.querySelector('[data-for="' + t.id + '"]').hidden = !active;
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

  // Replace a range in a textarea through the browser's editing pipeline so
  // the change lands on the native undo stack (assigning .value wipes it).
  function replaceText(ta, start, end, text) {
    ta.focus();
    ta.setSelectionRange(start, end);
    var ok = false;
    try {
      ok = document.execCommand(text ? 'insertText' : 'delete', false, text);
    } catch (e) {}
    if (!ok) {
      ta.setRangeText(text, start, end, 'end');
      ta.dispatchEvent(new Event('input'));
    }
  }

  function insertAnnotation(type, targetArea) {
    var tag   = '[' + type + ': ]';
    var start = targetArea.selectionStart;
    replaceText(targetArea, start, targetArea.selectionEnd, tag);
    var pos = start + tag.length - 1;
    targetArea.setSelectionRange(pos, pos);
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
        !annotBtn.contains(e.target) && !readerAnnotEl.contains(e.target)) {
      closeAnnotPicker();
    }
    if (mdPickerEl && !mdPickerEl.hidden && !mdPickerEl.contains(e.target) &&
        !mdBtnEl.contains(e.target) && !readerMdEl.contains(e.target)) {
      closeMdPicker();
    }
  });

  // Reader textareas: the Source editor or an open block editor
  function isReaderEditor(el) {
    return !!el && (el === mdEditor || (el.classList && el.classList.contains('md-block-editor')));
  }

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
      } else if (isReaderEditor(active)) {
        if (!annotPicker.hidden) { closeAnnotPicker(); return; }
        openAnnotPicker(readerAnnotEl, active);
      }
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      if (active === notesArea) {
        if (mdPickerEl && !mdPickerEl.hidden) { closeMdPicker(); return; }
        openMdPicker(mdBtnEl, notesArea);
      } else if (isReaderEditor(active)) {
        if (mdPickerEl && !mdPickerEl.hidden) { closeMdPicker(); return; }
        openMdPicker(readerMdEl, active);
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
      replaceText(targetArea, start, end, item.wrap[0] + inner + item.wrap[1]);
      targetArea.setSelectionRange(start + item.wrap[0].length, start + item.wrap[0].length + inner.length);

    } else if (item.prefix) {
      var lineStart = val.lastIndexOf('\n', start - 1) + 1;
      replaceText(targetArea, lineStart, lineStart, item.prefix);
      targetArea.setSelectionRange(start + item.prefix.length, start + item.prefix.length);

    } else if (item.type === 'link') {
      var lText = selected || 'link text';
      replaceText(targetArea, start, end, '[' + lText + '](url)');
      var urlS = start + lText.length + 3;
      targetArea.setSelectionRange(urlS, urlS + 3);

    } else if (item.type === 'image') {
      var aText = selected || 'alt text';
      replaceText(targetArea, start, end, '![' + aText + '](url)');
      var iUrlS = start + aText.length + 4;
      targetArea.setSelectionRange(iUrlS, iUrlS + 3);

    } else if (item.type === 'codeblock') {
      var cbInner = selected || '';
      replaceText(targetArea, start, end, '```\n' + cbInner + '\n```');
      targetArea.setSelectionRange(start + 4, start + 4 + cbInner.length);

    } else if (item.type === 'divider') {
      var divText = '\n\n---\n\n';
      replaceText(targetArea, start, end, divText);
      targetArea.setSelectionRange(start + divText.length, start + divText.length);
    }
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
    var outlineBtn = document.getElementById('outlineBtn');
    if (outlineBtn) { outlineBtn.setAttribute('aria-pressed', show ? 'true' : 'false'); }
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

  // Quiet save indicator: a dot by the token count that briefly glows
  var notesSavedDot = document.getElementById('notesSavedDot');
  function pulseSaved() {
    notesSavedDot.classList.remove('is-pulsing');
    void notesSavedDot.offsetWidth;   // restart the animation
    notesSavedDot.classList.add('is-pulsing');
  }

  // The notes box grows with its content instead of scrolling inside itself
  function growNotes() {
    if (notesArea.hidden) return;
    var scrollY = window.scrollY;       // collapsing to 'auto' can jump the page
    notesArea.style.height = 'auto';
    notesArea.style.height = notesArea.scrollHeight + 2 + 'px';
    window.scrollTo(0, scrollY);
    // Typing at the end: keep the new line in view below the sticky header
    if (document.activeElement === notesArea && notesArea.selectionEnd === notesArea.value.length) {
      var overshoot = notesArea.getBoundingClientRect().bottom - window.innerHeight + 24;
      if (overshoot > 0) window.scrollBy(0, overshoot);
    }
  }

  // Re-measure when the box's width changes (window, content width, font size)
  var notesWidth = 0;
  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      if (notesArea.offsetWidth !== notesWidth) { notesWidth = notesArea.offsetWidth; growNotes(); }
    }).observe(notesArea);
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(growNotes);

  var saveTimer;
  notesArea.addEventListener('input', function () {
    clearTimeout(saveTimer);
    updateNotesCount();
    growNotes();
    saveTimer = setTimeout(function () {
      localStorage.setItem(NOTES_KEY, notesArea.value);
      pulseSaved();
    }, 800);
  });

  copyBtn.addEventListener('click', function () {
    if (!notesArea.value.trim()) {
      flashStatus(notesStatus, 'Nothing to copy yet.');
      return;
    }
    navigator.clipboard.writeText(notesArea.value).then(function () {
      flashStatus(notesStatus, 'Copied to clipboard.');
    }, function () {
      flashStatus(notesStatus, 'Copy failed — try Ctrl+C.');
    });
  });

  saveBtn.addEventListener('click', function () {
    var text = notesArea.value;
    if (!text.trim()) { flashStatus(notesStatus, 'Nothing to save yet.'); return; }
    saveTextFile(text, 'notes.md', function (result) {
      flashStatus(notesStatus, result === 'saved' ? 'Saved.' : result === 'downloaded' ? 'Downloaded.' : 'Save failed.');
    });
  });

  clearBtn.addEventListener('click', function () {
    if (!notesArea.value.trim()) {
      flashStatus(notesStatus, 'Already empty.');
      return;
    }
    replaceText(notesArea, 0, notesArea.value.length, '');
    localStorage.removeItem(NOTES_KEY);
    flashStatus(notesStatus, 'Cleared. Ctrl/⌘+Z to undo.');
    updateNotesCount();
  });

  // ── Notes view: Source (textarea) / Rendered (read-only preview) ──────────
  // One text, two views: the preview is rebuilt from the textarea each time.
  var NOTES_VIEW_KEY   = 'contextPadNotesView';
  var notesPreview     = document.getElementById('notesPreview');
  var notesRenderedBtn = document.getElementById('notesModeRendered');
  var notesSourceBtn   = document.getElementById('notesModeSource');

  function setNotesView(view, focus) {
    var rendered = view === 'rendered';
    if (rendered) {
      notesPreview.innerHTML = notesArea.value.trim()
        ? renderMarkdown(notesArea.value)
        : '<p class="notes-preview-empty">Nothing to preview yet.</p>';
    }
    notesArea.hidden    = rendered;
    growNotes();
    notesPreview.hidden = !rendered;
    notesRenderedBtn.setAttribute('aria-pressed', rendered ? 'true' : 'false');
    notesSourceBtn.setAttribute('aria-pressed', rendered ? 'false' : 'true');
    [annotBtn, mdBtn, clearBtn].forEach(function (b) {
      setUnavailable(b, rendered, 'Switch to Source to edit');
    });
    localStorage.setItem(NOTES_VIEW_KEY, view);
    if (focus && !rendered) notesArea.focus();
  }

  notesRenderedBtn.addEventListener('click', function () { setNotesView('rendered'); });
  notesSourceBtn.addEventListener('click', function () { setNotesView('source', true); });
  notesPreview.addEventListener('dblclick', function () { setNotesView('source', true); });

  setNotesView(localStorage.getItem(NOTES_VIEW_KEY) === 'rendered' ? 'rendered' : 'source');

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

  // Each top-level block carries data-src="first-last" (0-based source lines)
  // so the rendered view can hand that exact slice to the block editor.
  function srcAttr(a, b) { return ' data-src="' + a + '-' + b + '"'; }

  // ── GFM tables ──
  function nextNonBlank(lines, from) {
    for (var j = from; j < lines.length; j++) { if (lines[j].trim()) return j; }
    return -1;
  }

  function isTableSep(line) {
    var t = line.trim();
    return t.indexOf('|') !== -1 && /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/.test(t);
  }

  function splitRow(line) {
    var t = line.trim().replace(/\\\|/g, '\u0002');   // protect escaped pipes
    if (t.charAt(0) === '|') t = t.slice(1);
    if (t.slice(-1) === '|') t = t.slice(0, -1);
    return t.split('|').map(function (c) { return c.trim().replace(/\u0002/g, '|'); });
  }

  // Lenient about blank lines between rows (common in LLM-pasted tables):
  // a blank line followed by another |row continues the table.
  function renderTable(lines, headIdx, sepIdx) {
    var head   = splitRow(lines[headIdx]);
    var aligns = splitRow(lines[sepIdx]).map(function (c) {
      var l = c.charAt(0) === ':', r = c.slice(-1) === ':';
      return l && r ? 'center' : r ? 'right' : l ? 'left' : '';
    });
    function cell(tag, text, k) {
      var style = aligns[k] ? ' style="text-align:' + aligns[k] + '"' : '';
      return '<' + tag + style + '>' + inlineFormat(escapeHtml(text || '')) + '</' + tag + '>';
    }

    var rows = [], last = sepIdx, j = sepIdx + 1;
    while (j < lines.length) {
      var t = lines[j].trim();
      if (!t) {
        var nb = nextNonBlank(lines, j);
        if (nb === -1 || lines[nb].trim().charAt(0) !== '|') break;
        j = nb;
        continue;
      }
      if (t.indexOf('|') === -1) break;
      // This row is the header of a following table
      var after = nextNonBlank(lines, j + 1);
      if (after !== -1 && isTableSep(lines[after])) break;
      rows.push(splitRow(t));
      last = j;
      j++;
    }

    var html = '<div class="table-wrap"' + srcAttr(headIdx, last) + '><table><thead><tr>' +
      head.map(function (c, k) { return cell('th', c, k); }).join('') + '</tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr>' + head.map(function (_, k) { return cell('td', r[k], k); }).join('') + '</tr>';
    });
    html += '</tbody></table></div>';
    return { html: html, last: last };
  }

  function renderMarkdown(markdown) {
    var lines     = markdown.split('\n');
    var html      = '';
    var inUl      = false;
    var inOl      = false;
    var inCode    = false;
    var codeBuf   = [];
    var codeStart = 0;
    var listEnd   = 0;
    var LIST_END  = '\u0001';

    function closeLists() {
      if (!inUl && !inOl) return;
      html  = html.replace(LIST_END, listEnd);
      html += inUl ? '</ul>' : '</ol>';
      inUl = inOl = false;
    }

    for (var i = 0; i < lines.length; i++) {
      var rawLine = lines[i];
      var line    = rawLine.trimEnd();
      var trimmed = line.trim();

      // Fenced code block
      if (/^```/.test(trimmed)) {
        if (!inCode) {
          closeLists();
          inCode    = true;
          codeBuf   = [];
          codeStart = i;
        } else {
          html   += '<pre' + srcAttr(codeStart, i) + '><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>';
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

      // Table: a row with pipes whose next non-blank line is a |---| separator
      var sepIdx = trimmed.indexOf('|') !== -1 ? nextNonBlank(lines, i + 1) : -1;
      if (sepIdx !== -1 && isTableSep(lines[sepIdx])) {
        closeLists();
        var table = renderTable(lines, i, sepIdx);
        html += table.html;
        i = table.last;
        continue;
      }

      if (/^---\s*$/.test(trimmed)) { closeLists(); html += '<hr' + srcAttr(i, i) + ' />'; continue; }

      var hMatch = trimmed.match(/^(#{1,4})\s+(.*)/);
      if (hMatch) {
        closeLists();
        var tag = 'h' + hMatch[1].length;
        html += '<' + tag + srcAttr(i, i) + '>' + inlineFormat(escapeHtml(hMatch[2])) + '</' + tag + '>';
        continue;
      }

      var olMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
      if (olMatch) {
        if (!inOl) { closeLists(); html += '<ol' + srcAttr(i, LIST_END) + '>'; inOl = true; }
        html += '<li>' + inlineFormat(escapeHtml(olMatch[2])) + '</li>';
        listEnd = i;
        continue;
      }

      if (/^-\s+/.test(trimmed)) {
        if (!inUl) { closeLists(); html += '<ul' + srcAttr(i, LIST_END) + '>'; inUl = true; }
        html += '<li>' + inlineFormat(escapeHtml(trimmed.replace(/^-\s+/, ''))) + '</li>';
        listEnd = i;
        continue;
      }

      // Blockquote
      if (/^>\s+/.test(trimmed)) {
        closeLists();
        html += '<blockquote' + srcAttr(i, i) + '><p>' + inlineFormat(escapeHtml(trimmed.replace(/^>\s+/, ''))) + '</p></blockquote>';
        continue;
      }

      closeLists();
      html += '<p' + srcAttr(i, i) + '>' + inlineFormat(escapeHtml(trimmed)) + '</p>';
    }

    closeLists();
    // Unclosed fence at end of file: render what we have rather than dropping it
    if (inCode) {
      html += '<pre' + srcAttr(codeStart, lines.length - 1) + '><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>';
    }
    return html;
  }

  var tocHeadings = [];   // [{ h, a }] for the current document, used by the scrollspy

  function buildToc(contentEl, tocEl) {
    tocEl.innerHTML = '';
    tocHeadings = [];
    var headings = Array.from(contentEl.querySelectorAll('h2, h3'));
    headings.forEach(function (h, i) {
      var id = 'toc-' + i;
      h.id = id;
      var li = document.createElement('li');
      li.className = 'toc-' + h.tagName.toLowerCase();
      var a  = document.createElement('a');
      a.href = '#' + id;
      a.textContent = h.textContent || 'Section';
      li.appendChild(a);
      tocEl.appendChild(li);
      tocHeadings.push({ h: h, a: a });
    });
    updateTocActive();
    return headings.length;
  }

  // Highlight the section currently under the header
  function updateTocActive() {
    var line = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 0) + 40;
    var current = null;
    tocHeadings.forEach(function (t) {
      t.a.classList.remove('is-active');
      if (t.h.isConnected && t.h.getBoundingClientRect().top <= line) current = t;
    });
    if (!current && tocHeadings.length) current = tocHeadings[0];
    if (current) current.a.classList.add('is-active');
  }

  var tocTicking = false;
  window.addEventListener('scroll', function () {
    if (tocTicking) return;
    tocTicking = true;
    requestAnimationFrame(function () { tocTicking = false; updateTocActive(); });
  }, { passive: true });

  var openTagGroups = {};   // type -> true when expanded; survives re-renders

  function buildTagsSidebar(contentEl, tagsSidebarEl, tagsContentEl) {
    var allTags = Array.from(contentEl.querySelectorAll('.annot-tag'));
    allTags.forEach(function (el, i) { el.id = 'annot-' + i; });
    tagsContentEl.innerHTML = '';
    document.getElementById('tagsTotal').textContent = allTags.length || '';

    if (!allTags.length) { tagsSidebarEl.hidden = true; return; }

    var order = [];
    var groups = {};
    allTags.forEach(function (el) {
      var type = el.dataset.tagType;
      if (!groups[type]) { groups[type] = []; order.push(type); }
      groups[type].push(el);
    });

    order.forEach(function (type) {
      var open = !!openTagGroups[type];
      var head = document.createElement('button');
      head.type = 'button';
      head.className = 'tag-group-head';
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
      head.innerHTML = '<span class="tag-dot annot-tag--' + type.toLowerCase() + '"></span>' +
                       '<span class="tag-group-name">' + type + '</span>' +
                       '<span class="side-count">' + groups[type].length + '</span>' + iconSvg('chevron');
      var items = document.createElement('div');
      items.className = 'tag-group-items';
      items.hidden = !open;
      head.addEventListener('click', function () {
        openTagGroups[type] = items.hidden;
        items.hidden = !items.hidden;
        head.setAttribute('aria-expanded', items.hidden ? 'false' : 'true');
      });

      groups[type].forEach(function (el) {
        var a = document.createElement('a');
        a.href = '#' + el.id;
        a.className = 'tags-entry';
        // Show just the note, without the "[TYPE: ...]" wrapper
        var note = el.textContent.replace(/^\[[A-Z]+:\s*/, '').replace(/\]$/, '') || '(empty)';
        a.textContent = note;
        a.title = note;
        a.addEventListener('click', function () { flashTarget(el); });
        items.appendChild(a);
      });

      tagsContentEl.appendChild(head);
      tagsContentEl.appendChild(items);
    });

    tagsSidebarEl.hidden = false;
  }

  // Briefly highlight whatever a sidebar link jumped to
  function flashTarget(el) {
    el.classList.remove('is-target');
    void el.offsetWidth;
    el.classList.add('is-target');
    setTimeout(function () { el.classList.remove('is-target'); }, 1400);
  }

  // Collapsible sidebar sections. On narrow screens the outline stacks above
  // the document, so start collapsed there to keep the text in view.
  var startCollapsed = window.matchMedia('(max-width: 940px)').matches;
  Array.from(document.querySelectorAll('.side-head')).forEach(function (head) {
    head.insertAdjacentHTML('beforeend', iconSvg('chevron'));
    if (startCollapsed) {
      head.nextElementSibling.hidden = true;
      head.setAttribute('aria-expanded', 'false');
    }
    head.addEventListener('click', function () {
      var body = head.nextElementSibling;
      body.hidden = !body.hidden;
      head.setAttribute('aria-expanded', body.hidden ? 'false' : 'true');
    });
  });

  document.getElementById('toc').addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (a) { var h = document.getElementById(a.getAttribute('href').slice(1)); if (h) flashTarget(h); }
  });

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
  var modeRenderedBtn  = document.getElementById('readerModeRendered');
  var modeSourceBtn    = document.getElementById('readerModeSource');
  var mdAddBlock       = document.getElementById('mdAddBlock');
  var openMdBtn        = document.getElementById('openMdBtn');
  var readerDirtyEl    = document.getElementById('readerDirty');
  var readerStatus     = document.getElementById('readerStatus');
  var readerAnnotBtn   = document.getElementById('readerAnnotBtn');
  readerAnnotBtn.innerHTML = 'Annotate <span class="btn-shortcut">' + kbdLabel + '</span>';
  var readerMdBtn      = document.getElementById('readerMdBtn');
  readerMdBtn.innerHTML = 'Markdown <span class="btn-shortcut">Ctrl+⇧D</span>';
  var readerSaveBtn    = document.getElementById('readerSaveBtn');
  var readerToNotesBtn = document.getElementById('readerToNotesBtn');

  var currentMdSource   = '';
  var currentMdFilename = 'document.md';
  var readerMode        = 'rendered';   // 'rendered' | 'source'
  var activeBlock       = null;         // { ta, start, end } while a block is being edited
  var mdDirty           = false;
  var docLoaded         = false;
  var savedMdSource     = '';         // last loaded/saved text, for the modified marker
  var undoStack         = [];         // previous versions of currentMdSource
  var redoStack         = [];
  var sourceModeStart   = '';         // text when Source mode was entered
  var UNDO_LIMIT        = 200;

  function setDirty(dirty) {
    mdDirty = dirty;
    readerDirtyEl.textContent = dirty ? '• modified' : '';
    readerDirtyEl.title = dirty ? 'Unsaved changes (Ctrl/⌘+S to save)' : '';
  }

  function refreshDirty() {
    setDirty(currentMdSource !== savedMdSource);
  }

  // Record a document-level change (block commit, Source session) as one undo step
  function pushHistory(prevSource) {
    undoStack.push(prevSource);
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    redoStack = [];
  }

  function stepHistory(from, to) {
    if (!from.length) return false;
    to.push(currentMdSource);
    currentMdSource = from.pop();
    renderView(currentMdSource);
    refreshDirty();
    return true;
  }

  function undoReader() { return stepHistory(undoStack, redoStack); }
  function redoReader() { return stepHistory(redoStack, undoStack); }

  function updateReaderTokens(source) {
    var tokenStr = estimateTokens(source);
    readerTokenCount.textContent = tokenStr || '';
    readerTokenCount.style.display = tokenStr ? '' : 'none';
  }

  function renderView(source) {
    mdContent.innerHTML = renderMarkdown(source);
    buildToc(mdContent, tocEl);
    buildTagsSidebar(mdContent, tagsSidebarEl, tagsContentEl);
    updateReaderTokens(source);
  }

  // Textarea the Annotate / Markdown helpers should act on, or null
  function readerEditTarget() {
    if (readerMode === 'source') return mdEditor;
    return activeBlock ? activeBlock.ta : null;
  }

  function updateHelperButtons() {
    var noDoc = 'Open a file first';
    [readerSaveBtn, readerToNotesBtn, modeRenderedBtn, modeSourceBtn].forEach(function (b) {
      setUnavailable(b, !docLoaded, noDoc);
    });
    var noTarget = !docLoaded ? noDoc : 'Double-click a block to edit first';
    var off = !readerEditTarget();
    setUnavailable(readerAnnotBtn, off, noTarget);
    setUnavailable(readerMdBtn, off, noTarget);
  }

  // ── Block editor (Rendered mode) ──
  function autosize(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }

  // start/end are 0-based source lines; end < start means "insert at start"
  function openBlockEditor(el, start, end) {
    var lines = currentMdSource.split('\n');
    var ta = document.createElement('textarea');
    ta.className = 'md-block-editor';
    ta.spellcheck = notesArea.spellcheck;
    ta.value = end >= start ? lines.slice(start, end + 1).join('\n') : '';
    var wrap = document.createElement('div');
    wrap.className = 'md-block-edit';
    wrap.innerHTML = '<span class="md-block-edit-label">' + (el ? 'Editing' : 'New block') +
                     ' · Esc to finish</span>';
    wrap.appendChild(ta);
    if (el) { el.replaceWith(wrap); } else { mdContent.appendChild(wrap); }
    activeBlock = { ta: ta, start: start, end: end };

    ta.addEventListener('input', function () { autosize(ta); });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        commitBlockEditor();
      }
    });
    ta.addEventListener('blur', function () {
      // Deferred so focus moving into a picker doesn't count as "done editing"
      setTimeout(function () {
        if (!activeBlock || activeBlock.ta !== ta) return;
        var a = document.activeElement;
        if (a === ta || !annotPicker.hidden || !mdPicker.hidden ||
            annotPicker.contains(a) || mdPicker.contains(a)) return;
        commitBlockEditor();
      }, 0);
    });

    autosize(ta);
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
    updateHelperButtons();
  }

  function commitBlockEditor() {
    if (!activeBlock) return;
    var b = activeBlock;
    activeBlock = null;
    var lines    = currentMdSource.split('\n');
    var oldText  = b.end >= b.start ? lines.slice(b.start, b.end + 1).join('\n') : '';
    var newText  = b.ta.value.replace(/\s+$/, '');
    var newLines = newText ? newText.split('\n') : [];
    // New block appended after existing content: keep it a separate paragraph
    if (b.end < b.start && newLines.length && b.start > 0 && lines[b.start - 1].trim()) {
      newLines.unshift('');
    }
    if (newText !== oldText.replace(/\s+$/, '')) {
      pushHistory(currentMdSource);
      Array.prototype.splice.apply(lines, [b.start, Math.max(0, b.end - b.start + 1)].concat(newLines));
      currentMdSource = lines.join('\n');
      refreshDirty();
    }
    renderView(currentMdSource);
    updateHelperButtons();
  }

  document.querySelector('#readerLayout .content-wrap').addEventListener('dblclick', function (e) {
    if (readerMode !== 'rendered' || e.target.closest('.md-block-edit, #mdAddBlock')) return;
    // Line ranges are stale until a pending edit is committed and re-rendered
    if (activeBlock) { commitBlockEditor(); return; }
    var block = e.target.closest('#mdContent > [data-src]');
    if (block) {
      var range = block.dataset.src.split('-');
      window.getSelection().removeAllRanges();
      openBlockEditor(block, +range[0], +range[1]);
    } else if (!mdContent.contains(e.target)) {
      appendBlock();
    }
  });

  function appendBlock() {
    var n = currentMdSource.split('\n').length;
    openBlockEditor(null, n, n - 1);
  }

  mdAddBlock.addEventListener('click', function () {
    if (activeBlock) commitBlockEditor();
    appendBlock();
  });

  // ── Mode toggle ──
  function setReaderMode(mode) {
    if (mode === readerMode) return;
    if (mode === 'source') {
      commitBlockEditor();
      mdEditor.value  = currentMdSource;
      sourceModeStart = currentMdSource;
      mdContent.setAttribute('hidden', '');
      mdAddBlock.setAttribute('hidden', '');
      mdEditor.removeAttribute('hidden');
    } else {
      currentMdSource = mdEditor.value;
      // The whole Source session becomes one step in the rendered-mode history
      if (currentMdSource !== sourceModeStart) pushHistory(sourceModeStart);
      mdEditor.setAttribute('hidden', '');
      mdContent.removeAttribute('hidden');
      mdAddBlock.removeAttribute('hidden');
      renderView(currentMdSource);
    }
    readerMode = mode;
    modeRenderedBtn.setAttribute('aria-pressed', mode === 'rendered' ? 'true' : 'false');
    modeSourceBtn.setAttribute('aria-pressed', mode === 'source' ? 'true' : 'false');
    updateHelperButtons();
    if (mode === 'source') mdEditor.focus();
  }

  modeRenderedBtn.addEventListener('click', function () { setReaderMode('rendered'); });
  modeSourceBtn.addEventListener('click', function () { setReaderMode('source'); });

  mdEditor.addEventListener('input', function () {
    currentMdSource = mdEditor.value;
    refreshDirty();
    updateReaderTokens(currentMdSource);
  });

  // ── Helpers, Save, To Notes ──
  // Keep focus in the block editor when these are clicked (Safari doesn't focus buttons)
  [readerAnnotBtn, readerMdBtn].forEach(function (b) {
    b.addEventListener('mousedown', function (e) { e.preventDefault(); });
  });

  readerAnnotBtn.addEventListener('click', function () {
    if (!annotPicker.hidden) { closeAnnotPicker(); return; }
    var target = readerEditTarget();
    if (target) openAnnotPicker(readerAnnotBtn, target);
  });

  readerMdBtn.addEventListener('click', function () {
    if (!mdPicker.hidden) { closeMdPicker(); return; }
    var target = readerEditTarget();
    if (target) openMdPicker(readerMdBtn, target);
  });

  readerSaveBtn.addEventListener('click', function () {
    commitBlockEditor();
    var text = currentMdSource;
    if (!text.trim()) return;
    var name = currentMdFilename;
    if (!/\.(md|txt)$/i.test(name)) name += '.md';
    saveTextFile(text, name, function (result) {
      if (result === 'error') { flashStatus(readerStatus, 'Save failed.'); return; }
      if (result === 'saved' || result === 'downloaded') {
        savedMdSource = text;
        refreshDirty();
        flashStatus(readerStatus, result === 'saved' ? 'Saved.' : 'Downloaded.');
      }
    });
  });

  readerToNotesBtn.addEventListener('click', function () {
    commitBlockEditor();
    if (!currentMdSource.trim()) return;
    // Append rather than replace so existing notes are never lost
    switchTab('notes');
    setNotesView('source');
    var val      = notesArea.value;
    var trimmed  = val.replace(/\s+$/, '');
    var insertAt = trimmed ? trimmed.length + 2 : 0;
    replaceText(notesArea, trimmed.length, val.length, (trimmed ? '\n\n' : '') + currentMdSource);
    notesArea.setSelectionRange(insertAt, insertAt);
    notesArea.blur();
    notesArea.focus();
    flashStatus(notesStatus, 'Added ' + currentMdFilename + '. Ctrl/⌘+Z to undo.');
  });

  // Ctrl/⌘+Z, Ctrl/⌘+Shift+Z, Ctrl+Y in Rendered mode. Inside any text field
  // the browser's native undo applies instead.
  document.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    var key = e.key.toLowerCase();
    var isUndo = key === 'z' && !e.shiftKey;
    var isRedo = (key === 'z' && e.shiftKey) || (key === 'y' && !e.shiftKey);
    if (!isUndo && !isRedo) return;
    var a = document.activeElement;
    if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT' || a.isContentEditable)) return;
    if (panels.reader.hidden || readerMode !== 'rendered') return;
    e.preventDefault();
    if (isUndo) { undoReader(); } else { redoReader(); }
  });

  // Ctrl/⌘+S saves in whichever tab is showing
  document.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 's') return;
    e.preventDefault();
    if (!panels.notes.hidden) { saveBtn.click(); }
    else if (docLoaded) { readerSaveBtn.click(); }
  });

  openMdBtn.addEventListener('click', function () { fileInput.click(); });

  document.getElementById('outlineBtn').addEventListener('click', function () {
    applyTocSetting(!tocShown);
  });

  window.addEventListener('beforeunload', function (e) {
    if (mdDirty || activeBlock) { e.preventDefault(); e.returnValue = ''; }
  });

  function displayMd(text, filename, note) {
    activeBlock       = null;
    docLoaded         = true;
    currentMdSource   = text;
    currentMdFilename = filename;
    savedMdSource     = text;
    sourceModeStart   = text;
    undoStack = [];
    redoStack = [];
    docTitle.textContent = filename;
    docPath.textContent  = note || '';
    docPath.hidden       = !note;
    setDirty(false);
    if (readerMode === 'source') mdEditor.value = text;
    renderView(text);
    readerLayout.removeAttribute('hidden');
    updateHelperButtons();
    readerLayout.classList.toggle('toc-collapsed', !tocShown);
    window.scrollTo(0, 0);
  }

  updateHelperButtons();

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

  Array.from(document.querySelectorAll('[data-icon]')).forEach(applyIcon);

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
          displayMd(msg.content, msg.title || 'From agent', 'Pushed from an AI agent via MCP');
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
