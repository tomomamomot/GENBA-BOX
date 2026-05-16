(function () {
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
    if (typeof renderCalendar === 'function') renderCalendar();
  });
})();
