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
    return { day: 1, trip: 2, night: 3 }[shift] || 1;
  }

  function sortEntriesForCalendar(items) {
    return [...items].sort((a, b) => {
      const aContinues = hasAdjacentBand(adjacentYmd(a.date, -1), a) ? 1 : 0;
      const bContinues = hasAdjacentBand(adjacentYmd(b.date, -1), b) ? 1 : 0;
      return shiftOrder(a.shift) - shiftOrder(b.shift)
        || String(a.company || '').localeCompare(String(b.company || ''), 'ja')
        || String(a.site || '').localeCompare(String(b.site || ''), 'ja')
        || aContinues - bContinues
        || String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    });
  }

  function hasAdjacentBand(ymd, entry) {
    if (typeof dayEntries !== 'function') return false;
    return dayEntries(ymd).some((item) => sameWorkBand(entry, item));
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #sc-cal .cal-task {
        min-height: 18px;
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
      #sc-cal .cal-task.band-fill {
        color: transparent;
        text-shadow: none;
      }
      #sc-cal .cal-task.band-fill::after {
        content: '\u00a0';
      }
      @media (max-width: 480px) {
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
    if (left) classes.push('cont-left', 'band-fill');
    if (right) classes.push('cont-right');
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
        const isContinuation = date.getDay() !== 0 && hasAdjacentBand(adjacentYmd(ymd, -1), entry);
        const label = isContinuation ? '' : escapeHtml(companyEventTitle(entry));
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
