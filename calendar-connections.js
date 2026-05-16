(function () {
  const STYLE_ID = 'genba-calendar-connections-style';

  function bandKey(entry) {
    const company = String(entry?.company || '').trim();
    const site = String(entry?.site || '').trim();
    if (!company || !site) return '';
    return [entry.type || 'self', entry.shift || 'day', company, site].join('\u001f');
  }

  function sameWorkBand(a, b) {
    return !!bandKey(a) && bandKey(a) === bandKey(b);
  }

  function hasAdjacentBand(ymd, entry) {
    if (typeof dayEntries !== 'function') return false;
    return dayEntries(ymd).some((item) => sameWorkBand(entry, item));
  }

  function isBandStart(ymd, entry, dayOfWeek) {
    return dayOfWeek === 0 || !hasAdjacentBand(adjacentYmd(ymd, -1), entry);
  }

  function bandSpan(ymd, entry, dayOfWeek) {
    let span = 1;
    while (dayOfWeek + span <= 6 && hasAdjacentBand(adjacentYmd(ymd, span), entry)) span += 1;
    return span;
  }

  function shiftSlot(entry, usedSlots) {
    const preferred = String(entry.shift || 'day') === 'night' ? 2 : 1;
    if (!usedSlots.has(preferred)) return preferred;
    for (const slot of [3, 4]) {
      if (!usedSlots.has(slot)) return slot;
    }
    return preferred;
  }

  function sortEntriesForCalendar(items) {
    return [...items].sort((a, b) => {
      const aNight = String(a.shift || 'day') === 'night' ? 1 : 0;
      const bNight = String(b.shift || 'day') === 'night' ? 1 : 0;
      return aNight - bNight
        || String(a.company || '').localeCompare(String(b.company || ''), 'ja')
        || String(a.site || '').localeCompare(String(b.site || ''), 'ja')
        || String(a.type || 'self').localeCompare(String(b.type || 'self'), 'ja')
        || String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    });
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #sc-cal #cal-grid,
      #sc-cal .cal-day,
      #sc-cal .task-stack {
        overflow: visible !important;
      }
      #sc-cal .task-stack {
        display: grid !important;
        grid-template-rows: repeat(4, minmax(0, 18px));
        gap: 3px;
        align-content: start;
        height: 78px;
        position: relative;
      }
      #sc-cal .cal-task {
        grid-row: var(--slot, 1);
        position: relative;
        z-index: 3;
        width: calc((100% + 5px) * var(--span, 1) - 5px);
        min-height: 18px;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: clip !important;
        word-break: keep-all !important;
        -webkit-line-clamp: unset !important;
        pointer-events: none;
      }
      #sc-cal .cal-task.cont-left {
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        margin-left: -5px;
        padding-left: 8px;
      }
      #sc-cal .cal-task.cont-right {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
        margin-right: -5px;
        padding-right: 8px;
      }
      #sc-cal .cal-task.cont-left.cont-right {
        border-radius: 0;
      }
      #sc-cal .cal-task.night {
        grid-row: 2;
      }
      @media (max-width: 480px) {
        #sc-cal .task-stack {
          grid-template-rows: repeat(4, minmax(0, 15px));
          gap: 2px;
          height: 66px;
        }
        #sc-cal .cal-task {
          width: calc(100% * var(--span, 1));
          min-height: 15px;
          line-height: 1.08;
        }
        #sc-cal .cal-task.cont-left {
          margin-left: -4px;
          padding-left: 6px;
        }
        #sc-cal .cal-task.cont-right {
          margin-right: -4px;
          padding-right: 6px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  window.hasAdjacentCompany = function hasAdjacentCompanyBySite(ymd, entry) {
    return hasAdjacentBand(ymd, entry);
  };

  window.calendarTaskClass = function calendarTaskClassBySite(entry, ymd, dayOfWeek) {
    const classes = ['cal-task', shiftClass(entry.shift), entry.type === 'sub' ? 'sub' : ''];
    const left = dayOfWeek !== 0 && hasAdjacentBand(adjacentYmd(ymd, -1), entry);
    const right = dayOfWeek !== 6 && hasAdjacentBand(adjacentYmd(ymd, 1), entry);
    if (left) classes.push('cont-left');
    if (right) classes.push('cont-right');
    return classes.filter(Boolean).join(' ');
  };

  window.renderCalendar = function renderCalendarWithWeeklySpans() {
    const grid = document.getElementById('cal-grid');
    const monthStart = startOfMonth(cursor);
    const startDay = monthStart.getDay();
    const firstCell = new Date(monthStart);
    firstCell.setDate(firstCell.getDate() - startDay);
    const rows = ['日', '月', '火', '水', '木', '金', '土'].map((label) => `<div class="cal-dow">${label}</div>`);

    for (let i = 0; i < 42; i += 1) {
      const date = new Date(firstCell);
      date.setDate(firstCell.getDate() + i);
      const ymd = toYmd(date);
      const dayOfWeek = date.getDay();
      const items = dayEntries(ymd);
      const classes = ['cal-day'];
      if (date.getMonth() !== cursor.getMonth()) classes.push('other');
      if (ymd === selectedDate) classes.push('sel');
      if (ymd === toYmd(new Date())) classes.push('today');
      if (dayOfWeek === 0) classes.push('sun');
      if (dayOfWeek === 6) classes.push('sat');

      const usedSlots = new Set();
      const visibleItems = sortEntriesForCalendar(items).filter((entry) => isBandStart(ymd, entry, dayOfWeek));
      const lines = visibleItems.slice(0, 4).map((entry) => {
        const slot = shiftSlot(entry, usedSlots);
        usedSlots.add(slot);
        const span = bandSpan(ymd, entry, dayOfWeek);
        const label = escapeHtml(companyEventTitle(entry));
        return `<div class="${window.calendarTaskClass(entry, ymd, dayOfWeek)}" style="--slot:${slot};--span:${span}">${label}</div>`;
      }).join('');
      const more = visibleItems.length > 4 ? `<div class="more-chip">•••</div>` : '';
      rows.push(`<button class="${classes.join(' ')}" data-date="${ymd}"><span class="dn">${date.getDate()}</span><div class="task-stack">${lines}</div>${more}</button>`);
    }

    grid.innerHTML = rows.join('');
    renderSummary();
  };

  document.addEventListener('DOMContentLoaded', () => {
    injectStyle();
    if (typeof window.renderCalendar === 'function') window.renderCalendar();
  });
})();
