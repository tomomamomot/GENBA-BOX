(function () {
  function hasRange(entry) {
    return entry?.date && entry?.endDate && entry.endDate > entry.date;
  }

  function cloneForDate(entry, date, index) {
    const excludedDates = Array.isArray(entry.excludedDates) ? entry.excludedDates.filter(Boolean) : [];
    const next = {
      ...entry,
      id: index === 0 ? entry.id : `${entry.id}-${date}`,
      date,
      rangeGroupId: entry.rangeGroupId || entry.id,
      rangeStart: entry.date,
      rangeEnd: entry.endDate,
      excludedDates,
      updatedAt: new Date().toISOString()
    };
    delete next.endDate;
    return next;
  }

  function expandRangeEntries() {
    if (typeof state === 'undefined' || !Array.isArray(state.entries)) return false;
    let changed = false;
    const nextEntries = [];

    state.entries.forEach((entry) => {
      if (!hasRange(entry)) {
        if (entry?.endDate) {
          const copy = { ...entry };
          delete copy.endDate;
          nextEntries.push(copy);
          changed = true;
          return;
        }
        nextEntries.push(entry);
        return;
      }

      changed = true;
      const current = fromYmd(entry.date);
      const last = fromYmd(entry.endDate);
      let index = 0;
      const excluded = new Set(Array.isArray(entry.excludedDates) ? entry.excludedDates : []);
      while (current <= last) {
        const ymd = toYmd(current);
        if (!excluded.has(ymd)) {
          nextEntries.push(cloneForDate(entry, ymd, index));
          index += 1;
        }
        current.setDate(current.getDate() + 1);
      }
    });

    if (!changed) return false;
    state.entries = nextEntries;
    saveState();
    return true;
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (expandRangeEntries() && typeof renderAll === 'function') renderAll();
  });
})();
