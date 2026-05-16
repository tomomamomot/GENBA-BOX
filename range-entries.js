(function () {
  const STORE_KEY = 'genba-box-v2';

  function readRawState() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function mergeRangeFields() {
    if (!window.state?.entries) return;
    const raw = readRawState();
    const rawEntries = Array.isArray(raw.entries) ? raw.entries : [];
    const ranges = new Map(rawEntries.filter((entry) => entry.endDate).map((entry) => [String(entry.id), entry.endDate]));
    state.entries.forEach((entry) => {
      if (ranges.has(String(entry.id))) entry.endDate = ranges.get(String(entry.id));
    });
  }

  function isInRange(ymd, entry) {
    const start = entry.date || ymd;
    const end = entry.endDate || entry.date || ymd;
    return start <= ymd && ymd <= end;
  }

  function overlapsMonth(entry, key) {
    const start = entry.date || '';
    const end = entry.endDate || entry.date || '';
    return start.slice(0, 7) <= key && end.slice(0, 7) >= key;
  }

  function overlapsYear(entry, year) {
    const start = entry.date || '';
    const end = entry.endDate || entry.date || '';
    return Number(start.slice(0, 4)) <= year && Number(end.slice(0, 4)) >= year;
  }

  window.dayEntries = function rangedDayEntries(ymd) {
    return (state.entries || [])
      .filter((entry) => isInRange(ymd, entry))
      .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  };

  window.monthEntries = function rangedMonthEntries() {
    const key = monthKey(cursor);
    return (state.entries || [])
      .filter((entry) => overlapsMonth(entry, key))
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  };

  window.yearEntries = function rangedYearEntries() {
    const year = cursor.getFullYear();
    return (state.entries || [])
      .filter((entry) => overlapsYear(entry, year));
  };

  const originalCollectEntryForm = window.collectEntryForm;
  window.collectEntryForm = function collectSingleRangeEntry() {
    const entries = originalCollectEntryForm();
    if (!entries.length) return entries;
    const first = entries[0];
    const last = entries[entries.length - 1];
    return [{ ...first, endDate: last.date }];
  };

  const originalOpenModal = window.openModal;
  window.openModal = function openModalWithRange(type, id = null) {
    originalOpenModal(type, id);
    if (!id) return;
    const entry = state.entries.find((item) => item.id === id);
    const endInput = document.getElementById('f-end-date');
    if (entry?.endDate && endInput) endInput.value = entry.endDate;
  };

  document.addEventListener('DOMContentLoaded', () => {
    mergeRangeFields();
    saveState();
    if (typeof renderAll === 'function') renderAll();
  });
})();
