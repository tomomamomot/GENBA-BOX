(function () {
  const STORE_KEY = 'genba-box-v2';
  const REPORT_BUTTONS_ID = 'genba-report-tools';

  function readState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : { entries: [], settings: {} };
    } catch (error) {
      console.warn('report read failed', error);
      return { entries: [], settings: {} };
    }
  }

  function num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function toYmd(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function monthKey(dateOrString) {
    const d = typeof dateOrString === 'string' ? new Date(`${dateOrString}T00:00:00`) : new Date(dateOrString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function yen(value) {
    return `¥${Math.round(num(value)).toLocaleString('ja-JP')}`;
  }

  function expenseItems(settings) {
    const items = Array.isArray(settings?.expenseItems) ? settings.expenseItems : [];
    return items.length ? items : ['交通費', '駐車場代', '宿泊費', 'ガソリン代', '資材代', 'その他'].map((label, index) => ({ id: `exp${index + 1}`, label }));
  }

  function shiftLabel(shift) {
    return { day: '日勤', night: '夜勤', trip: '出張' }[shift] || '日勤';
  }

  function typeLabel(type) {
    return type === 'sub' ? '外注' : '自分';
  }

  function calcEntry(entry, items) {
    const labor = num(entry.qty || 1) * num(entry.unitRate);
    const overtime = num(entry.otHours) * num(entry.otRate);
    const expenses = items.reduce((sum, item) => sum + num(entry.expenses?.[item.id]), 0);
    return { labor, overtime, expenses, total: labor + overtime + expenses };
  }

  function csvCell(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function entriesForCurrentMonth(state) {
    const activeMonth = typeof cursor !== 'undefined' ? monthKey(cursor) : monthKey(new Date());
    return (state.entries || []).filter((entry) => monthKey(entry.date) === activeMonth).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  function buildMonthlyCsv() {
    const state = readState();
    const items = expenseItems(state.settings);
    const rows = [
      ['日付', '区分', '会社名', '現場名', '職人名', '勤務', '人工', '単価', '残業h', '残業単価', ...items.map((item) => item.label), '合計', 'メモ'],
    ];
    entriesForCurrentMonth(state).forEach((entry) => {
      const calc = calcEntry(entry, items);
      rows.push([
        entry.date,
        typeLabel(entry.type),
        entry.company || '',
        entry.site || '',
        entry.workerName || '',
        shiftLabel(entry.shift),
        num(entry.qty || 1),
        num(entry.unitRate),
        num(entry.otHours),
        num(entry.otRate),
        ...items.map((item) => num(entry.expenses?.[item.id])),
        calc.total,
        entry.notes || '',
      ]);
    });
    return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  }

  function buildDailyText() {
    const state = readState();
    const items = expenseItems(state.settings);
    const selected = typeof selectedDate !== 'undefined' ? selectedDate : toYmd(new Date());
    const entries = (state.entries || []).filter((entry) => entry.date === selected);
    const lines = [`GENBA BOX 日報 ${selected}`];
    if (!entries.length) {
      lines.push('予定なし');
      return lines.join('\n');
    }
    entries.forEach((entry, index) => {
      const calc = calcEntry(entry, items);
      const expenses = items.map((item) => [item.label, num(entry.expenses?.[item.id])]).filter(([, amount]) => amount > 0);
      lines.push('', `${index + 1}. ${entry.site || '現場名未入力'}`);
      lines.push(`会社: ${entry.company || '-'} / 区分: ${typeLabel(entry.type)} / 勤務: ${shiftLabel(entry.shift)}`);
      if (entry.workerName) lines.push(`職人: ${entry.workerName}`);
      lines.push(`人工: ${num(entry.qty || 1)} / 人工額: ${yen(calc.labor)} / 残業: ${yen(calc.overtime)} / 経費: ${yen(calc.expenses)}`);
      if (expenses.length) lines.push(`経費内訳: ${expenses.map(([label, amount]) => `${label} ${yen(amount)}`).join('、')}`);
      if (entry.notes) lines.push(`メモ: ${entry.notes}`);
    });
    return lines.join('\n');
  }

  function activeMonthLabel() {
    const base = typeof cursor !== 'undefined' ? cursor : new Date();
    return monthKey(base);
  }

  function setLog(message) {
    const log = document.getElementById('sync-log');
    if (log) log.textContent = message;
  }

  function injectReportTools() {
    const panel = document.querySelector('#sc-sync .sync-panel');
    if (!panel || document.getElementById(REPORT_BUTTONS_ID)) return;
    const section = document.createElement('div');
    section.className = 'sync-section';
    section.id = REPORT_BUTTONS_ID;
    section.innerHTML = `
      <div class="sync-section-head">
        <div>
          <div class="sync-section-title">日報・月次出力</div>
          <div class="sync-section-sub">選択日の共有メモと月別一覧</div>
        </div>
        <span>CSV / TXT</span>
      </div>
      <div class="sync-actions two">
        <button class="btn-secondary" type="button" id="daily-report-export-btn">選択日の日報</button>
        <button class="btn-secondary" type="button" id="monthly-report-export-btn">月次一覧CSV</button>
      </div>`;
    panel.insertBefore(section, document.getElementById('sync-log'));
  }

  function bindReportTools() {
    document.addEventListener('click', (event) => {
      if (event.target.id === 'daily-report-export-btn') {
        const selected = typeof selectedDate !== 'undefined' ? selectedDate : toYmd(new Date());
        downloadText(`${selected}_GENBA-BOX_日報.txt`, buildDailyText(), 'text/plain;charset=utf-8;');
        setLog(`${selected}の日報を出力しました`);
      }
      if (event.target.id === 'monthly-report-export-btn') {
        downloadText(`${activeMonthLabel()}_GENBA-BOX_月次一覧.csv`, buildMonthlyCsv(), 'text/csv;charset=utf-8;');
        setLog(`${activeMonthLabel()}の月次一覧CSVを出力しました`);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectReportTools();
    bindReportTools();
  });
})();
