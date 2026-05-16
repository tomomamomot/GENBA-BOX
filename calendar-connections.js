(function () {
  const STYLE_ID = 'genba-calendar-connections-style';

  function sameWorkBand(a, b) {
    if (!a || !b) return false;
    const company = String(a.company || '').trim();
    const site = String(a.site || '').trim();
    if (!company || !site) return false;
    return company === String(b.company || '').trim()
      && site === String(b.site || '').trim()
      && String(a.shift || 'day') === String(b.shift || 'day')
      && String(a.type || 'self') === String(b.type || 'self');
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
    if (typeof dayEntries !== 'function') return false;
    return dayEntries(ymd).some((item) => sameWorkBand(entry, item));
  };

  window.calendarTaskClass = function calendarTaskClassBySite(entry, ymd, dayOfWeek) {
    const classes = ['cal-task', shiftClass(entry.shift), entry.type === 'sub' ? 'sub' : ''];
    if (dayOfWeek !== 0 && window.hasAdjacentCompany(adjacentYmd(ymd, -1), entry)) classes.push('cont-left');
    if (dayOfWeek !== 6 && window.hasAdjacentCompany(adjacentYmd(ymd, 1), entry)) classes.push('cont-right');
    return classes.filter(Boolean).join(' ');
  };

  document.addEventListener('DOMContentLoaded', () => {
    injectStyle();
    if (typeof renderCalendar === 'function') renderCalendar();
  });
})();
