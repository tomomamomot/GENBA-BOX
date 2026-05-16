(function () {
  function hasRange(entry) {
    return entry?.date && entry?.endDate && entry.endDate > entry.date;
  }

  function cloneForDate(entry, date, index) {
    const next = { ...entry, id: index === 0 ? entry.id : `${entry.id}-${date}`, date, updatedAt: new Date().toISOString() };
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
      while (current <= last) {
        nextEntries.push(cloneForDate(entry, toYmd(current), index));
        current.setDate(current.getDate() + 1);
        index += 1;
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
