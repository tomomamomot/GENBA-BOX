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

  function shiftOrder(shift) {
    return String(shift || 'day') === 'night' ? 99 : 1;
  }

  function sortEntriesForCalendar(items) {
    return [...items].sort((a, b) => {
      return shiftOrder(a.shift) - shiftOrder(b.shift)
        || String(a.company || '').localeCompare(String(b.company || ''), 'ja')
        || String(a.site || '').localeCompare(String(b.site || ''), 'ja')
        || String(a.type || 'self').localeCompare(String(b.type || 'self'), 'ja')
        || String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    });
  }

  function hasAdjacentBand(ymd, entry) {
    if (typeof dayEntries !== 'function') return false;
    return dayEntries(ymd).some((item) => sameWorkBand(entry, item));
  }

  function isBandStart(ymd, entry, dayOfWeek) {
    if (ymd === (entry.date || ymd)) return true;
    return dayOfWeek === 0 && hasAdjacentBand(ymd, entry);
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #sc-cal .task-stack {
        justify-content: flex-start;
        height: 100%;
      }
      #sc-cal .cal-task {
        min-height: 18px;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: clip !important;
        word-break: keep-all !important;
        -webkit-line-clamp: unset !important;
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
      #sc-cal .cal-task.band-continuation {
        color: transparent;
        text-shadow: none;
      }
      #sc-cal .cal-task.band-continuation::after {
        content: '\u00a0';
      }
      #sc-cal .cal-task.night {
        order: 99;
        margin-top: auto;
      }
      #sc-cal .cal-task.night ~ .cal-task.night {
        margin-top: 3px;
      }
      @media (max-width: 480px) {
        #sc-cal .cal-task {
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
    if (!isBandStart(ymd, entry, dayOfWeek)) classes.push('band-continuation');
    return classes.filter(Boolean).join(' ');
  };

  window.renderCalendar = function renderCalendarWithMergedBands() {
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
      const items = dayEntries(ymd);
      const classes = ['cal-day'];
      if (date.getMonth() !== cursor.getMonth()) classes.push('other');
      if (ymd === selectedDate) classes.push('sel');
      if (ymd === toYmd(new Date())) classes.push('today');
      if (date.getDay() === 0) classes.push('sun');
      if (date.getDay() === 6) classes.push('sat');

      const displayedItems = sortEntriesForCalendar(items);
      const lines = displayedItems.slice(0, 4).map((entry) => {
        const label = isBandStart(ymd, entry, date.getDay()) ? escapeHtml(companyEventTitle(entry)) : '';
        return `<div class="${window.calendarTaskClass(entry, ymd, date.getDay())}">${label}</div>`;
      }).join('');
      const more = items.length > 4 ? `<div class="more-chip">•••</div>` : '';
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
