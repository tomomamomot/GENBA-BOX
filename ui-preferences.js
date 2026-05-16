(function () {
  const STORE_KEY = 'genba-box-ui-prefs';
  const STYLE_ID = 'genba-ui-preferences-style';
  const SECTION_ID = 'genba-ui-preferences-section';
  const DEFAULTS = { fontScale: 1, lineWidth: 1 };

  function readPrefs() {
    try {
      return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(STORE_KEY) || '{}')) };
    } catch (error) {
      return { ...DEFAULTS };
    }
  }

  function savePrefs(prefs) {
    localStorage.setItem(STORE_KEY, JSON.stringify(prefs));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value)));
  }

  function applyPrefs() {
    const prefs = readPrefs();
    const fontScale = clamp(prefs.fontScale || 1, 0.9, 1.18);
    const lineWidth = clamp(prefs.lineWidth || 1, 0.5, 2);
    document.documentElement.style.setProperty('--gb-font-scale', String(fontScale));
    document.documentElement.style.setProperty('--gb-line-width', `${lineWidth}px`);
    document.documentElement.style.setProperty('--gb-line-alpha', String(lineWidth <= 0.75 ? 0.72 : 1));
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      :root {
        --gb-font-scale: 1;
        --gb-line-width: 1px;
        --gb-line-alpha: 1;
      }
      body {
        font-size: calc(17px * var(--gb-font-scale));
      }
      .topbar-title { font-size: calc(23px * var(--gb-font-scale)); }
      .topbar-sub { font-size: calc(14px * var(--gb-font-scale)); }
      .month-label { font-size: calc(21px * var(--gb-font-scale)); }
      .dn { font-size: calc(18px * var(--gb-font-scale)); }
      .cal-task { font-size: calc(12px * var(--gb-font-scale)); }
      .more-chip, .sl, .etag, .pill, .co-chip, .mode-btn, .sync-section-sub, .receipt-meta { font-size: calc(12px * var(--gb-font-scale)); }
      .sv { font-size: calc(24px * var(--gb-font-scale)); }
      .field label, .sync-section-title, .st-label, .top-menu-item { font-size: calc(16px * var(--gb-font-scale)); }
      .field input, .field select, .field textarea, .st-input, .st-select, .btn-primary, .btn-secondary, .btn-gold { font-size: calc(17px * var(--gb-font-scale)); }
      .ecard-site, .sub-card-name, .day-mini-title, .day-mini-site { font-size: calc(18px * var(--gb-font-scale)); }
      .inv-amt-val { font-size: calc(31px * var(--gb-font-scale)); }
      .inv-hd-title { font-size: calc(24px * var(--gb-font-scale)); }
      .cal-grid,
      .month-nav,
      .ecard,
      .sub-card,
      .inv-box,
      .st-section,
      .sum-card,
      .sync-section,
      .receipt-summary,
      .receipt-card,
      .tbl-wrap,
      .day-modal,
      .modal,
      .top-menu,
      .field input,
      .field select,
      .field textarea,
      .st-input,
      .st-select,
      .btn-secondary,
      .company-combo select,
      .company-combo input,
      .receipt-date,
      .receipt-amount,
      .receipt-select {
        border-width: var(--gb-line-width) !important;
        border-color: color-mix(in srgb, var(--line) calc(var(--gb-line-alpha) * 100%), transparent) !important;
      }
      .cal-dow,
      .cal-day,
      .ecard-foot,
      .ecard-actions,
      .sub-card-foot,
      .st-row,
      .day-modal-head,
      .modal-title,
      .expense-row,
      .expense-year-total {
        border-width: var(--gb-line-width) !important;
      }
      .pref-panel {
        display: grid;
        gap: 14px;
        padding: 14px;
      }
      .pref-row {
        display: grid;
        grid-template-columns: 92px minmax(0, 1fr) 48px;
        gap: 10px;
        align-items: center;
      }
      .pref-label {
        color: var(--ink);
        font-size: calc(14px * var(--gb-font-scale));
        font-weight: 900;
      }
      .pref-value {
        color: var(--sub);
        font-size: calc(13px * var(--gb-font-scale));
        font-weight: 900;
        text-align: right;
      }
      .pref-range {
        width: 100%;
        accent-color: var(--accent);
      }
      @media (max-width: 480px) {
        .month-label { font-size: calc(24px * var(--gb-font-scale)); }
        .dn { font-size: calc(15px * var(--gb-font-scale)); }
        .cal-task { font-size: calc(10.5px * var(--gb-font-scale)); }
        .sv { font-size: calc(17px * var(--gb-font-scale)); }
        .pref-row { grid-template-columns: 82px minmax(0, 1fr) 44px; }
      }
    `;
    document.head.appendChild(style);
  }

  function percent(value) {
    return `${Math.round(Number(value) * 100)}%`;
  }

  function lineLabel(value) {
    return `${Number(value).toFixed(1)}px`;
  }

  function updateControlValues() {
    const prefs = readPrefs();
    const font = document.getElementById('ui-font-scale');
    const line = document.getElementById('ui-line-width');
    const fontValue = document.getElementById('ui-font-scale-value');
    const lineValue = document.getElementById('ui-line-width-value');
    if (font) font.value = String(clamp(prefs.fontScale || 1, 0.9, 1.18));
    if (line) line.value = String(clamp(prefs.lineWidth || 1, 0.5, 2));
    if (fontValue) fontValue.textContent = percent(font?.value || prefs.fontScale || 1);
    if (lineValue) lineValue.textContent = lineLabel(line?.value || prefs.lineWidth || 1);
  }

  function injectControls() {
    if (document.getElementById(SECTION_ID)) return;
    const saveWrap = document.querySelector('#sc-st .save-wrap');
    if (!saveWrap) return;
    const holder = document.createElement('div');
    holder.id = SECTION_ID;
    holder.innerHTML = `
      <div class="sec-hd">表示の調整</div>
      <div class="st-section pref-panel">
        <div class="pref-row">
          <span class="pref-label">文字サイズ</span>
          <input class="pref-range" id="ui-font-scale" type="range" min="0.9" max="1.18" step="0.02">
          <span class="pref-value" id="ui-font-scale-value">100%</span>
        </div>
        <div class="pref-row">
          <span class="pref-label">線の太さ</span>
          <input class="pref-range" id="ui-line-width" type="range" min="0.5" max="2" step="0.1">
          <span class="pref-value" id="ui-line-width-value">1.0px</span>
        </div>
      </div>`;
    saveWrap.parentNode.insertBefore(holder, saveWrap);
    updateControlValues();
  }

  function bindControls() {
    document.addEventListener('input', (event) => {
      if (event.target.id !== 'ui-font-scale' && event.target.id !== 'ui-line-width') return;
      const prefs = readPrefs();
      if (event.target.id === 'ui-font-scale') prefs.fontScale = clamp(event.target.value, 0.9, 1.18);
      if (event.target.id === 'ui-line-width') prefs.lineWidth = clamp(event.target.value, 0.5, 2);
      savePrefs(prefs);
      applyPrefs();
      updateControlValues();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectStyle();
    applyPrefs();
    injectControls();
    bindControls();
  });
})();
