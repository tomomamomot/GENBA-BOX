
const STORE_KEY = 'genba-box-v2';
const OLD_STORE_KEY = 'shokunin3';
const DEFAULT_EXPENSE_ITEMS = ['交通費', '駐車場代', '宿泊費', 'ガソリン代', '資材代', 'その他'];
const DEFAULT_SETTINGS = {
  name: '', address: '', tel: '', companyName: '', bank: '', branch: '', accountNo: '', accountName: '',
  invoiceNo: '', invoiceEnabled: true, taxRate: 10,
  defaultDayRate: 0, defaultNightRate: 0, defaultOtRate: 0,
  companies: [], expenseItems: DEFAULT_EXPENSE_ITEMS.map((label, index) => ({ id: `exp${index + 1}`, label })),
  companyInvoiceModes: {}, showSales: true, showSubcontract: true, googleClientId: '', googleCalendarId: 'primary', googleStoreMode: 'local', googleAccountEmail: '', googleSyncEnabled: false,
};
const DEFAULT_STATE = { entries: [], receipts: [], settings: DEFAULT_SETTINGS };

let state = loadState();
let cursor = startOfMonth(new Date());
let selectedDate = toYmd(new Date());
let selectedCompany = '';
let activeScreen = 'cal';
let editingId = null;
let modalTouch = { startY: 0, currentY: 0, dragging: false };
let isDayModalOpen = false;

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return normalizeState(JSON.parse(raw));
    const legacy = localStorage.getItem(OLD_STORE_KEY);
    if (legacy) return migrateLegacy(JSON.parse(legacy));
  } catch (error) {
    console.warn('loadState failed', error);
  }
  return clone(DEFAULT_STATE);
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function normalizeState(source) {
  const settings = { ...clone(DEFAULT_SETTINGS), ...(source.settings || {}) };
  settings.companies = Array.isArray(settings.companies) ? settings.companies.filter(Boolean) : [];
  settings.expenseItems = normalizeExpenseItems(settings.expenseItems);
  settings.companyInvoiceModes = settings.companyInvoiceModes && typeof settings.companyInvoiceModes === 'object' ? settings.companyInvoiceModes : {};
  const entries = Array.isArray(source.entries) ? source.entries.map(normalizeEntry) : [];
  const receipts = Array.isArray(source.receipts) ? source.receipts.map(normalizeReceipt) : [];
  return { entries, receipts, settings };
}
function normalizeExpenseItems(items) {
  const list = Array.isArray(items) ? items : [];
  const mapped = list.map((item, index) => typeof item === 'string' ? { id: `exp${index + 1}`, label: item } : { id: item.id || `exp${index + 1}`, label: item.label || `項目${index + 1}` }).filter((item) => item.label.trim());
  return mapped.length ? mapped : clone(DEFAULT_SETTINGS.expenseItems);
}
function normalizeReceipt(receipt) {
  return {
    id: String(receipt.id || crypto.randomUUID()), fileName: receipt.fileName || '領収書', importedAt: receipt.importedAt || new Date().toISOString(),
    category: receipt.category || guessReceiptCategory(receipt.fileName || ''), amount: num(receipt.amount || 0), date: receipt.date || '', vendor: receipt.vendor || '', status: receipt.status || '未確認'
  };
}
function normalizeEntry(entry) {
  return {
    id: String(entry.id || crypto.randomUUID()), date: entry.date || toYmd(new Date()), type: entry.type || 'self', shift: entry.shift || 'day',
    company: entry.company || '', site: entry.site || '', workerName: entry.workerName || '', qty: num(entry.qty || 1),
    unitRate: num(entry.unitRate || 0), otHours: num(entry.otHours || 0), otRate: num(entry.otRate || 0),
    expenses: entry.expenses && typeof entry.expenses === 'object' ? entry.expenses : {}, notes: entry.notes || '',
    invoiceMode: entry.invoiceMode || 'with', createdAt: entry.createdAt || new Date().toISOString(), updatedAt: entry.updatedAt || new Date().toISOString()
  };
}
function migrateLegacy(oldData) {
  const migrated = clone(DEFAULT_STATE);
  const oldSettings = oldData.settings || {};
  migrated.settings = {
    ...migrated.settings,
    name: oldSettings.name || '', address: oldSettings.addr || '', tel: oldSettings.tel || '', companyName: oldSettings.co || '',
    bank: oldSettings.bank || '', branch: oldSettings.branch || '', accountNo: oldSettings.accno || '', accountName: oldSettings.accname || '',
    invoiceNo: oldSettings.invno || '', invoiceEnabled: oldSettings.showInv !== false, taxRate: num(oldSettings.taxRate || 10),
    defaultDayRate: num(oldSettings.tanka || 0), defaultNightRate: num(oldSettings.ntanka || 0), defaultOtRate: num(oldSettings.ottanka || 0),
    companies: [...new Set((oldData.entries || []).map((entry) => entry.co).filter(Boolean))],
  };
  migrated.entries = (oldData.entries || []).map((entry) => ({
    id: String(entry.id || crypto.randomUUID()), date: toYmd(new Date(entry.y, entry.m, entry.d)), type: entry.type || 'self',
    shift: entry.wt === 'night' ? 'night' : entry.wt === 'trip' ? 'trip' : 'day', company: entry.co || '', site: entry.site || '',
    workerName: entry.subname || '', qty: num(entry.ninku || 1), unitRate: num(entry.tanka || 0),
    otHours: num(entry.oth || 0), otRate: num(entry.ottanka || 0),
    expenses: { exp1: num(entry.kotsu || 0), exp2: num(entry.parking || 0), exp3: num(entry.shuku || 0), exp4: num(entry.gas || 0), exp5: num(entry.zai || 0), exp6: num(entry.other || 0) },
    notes: entry.memo || '', invoiceMode: 'with', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }));
  saveState(migrated);
  return migrated;
}
function saveState(nextState = state) { localStorage.setItem(STORE_KEY, JSON.stringify(nextState)); }
function num(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function yen(value, hidden = false) { return hidden ? '••••••' : `¥${Math.round(num(value)).toLocaleString('ja-JP')}`; }
function escapeHtml(value) { return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
function toYmd(date) { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function fromYmd(ymd) { const [y, m, d] = String(ymd).split('-').map(Number); return new Date(y, m - 1, d); }
function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function monthKey(dateOrString) { const d = typeof dateOrString === 'string' ? fromYmd(dateOrString) : new Date(dateOrString); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function fmtMonth(date) { return `${date.getFullYear()}年${date.getMonth() + 1}月`; }
function fmtDateJP(ymd) { const d = fromYmd(ymd); return `${d.getMonth() + 1}月${d.getDate()}日`; }
function weekdayLabel(ymd) { return ['日', '月', '火', '水', '木', '金', '土'][fromYmd(ymd).getDay()]; }
function expenseItems() { return normalizeExpenseItems(state.settings.expenseItems); }
function companyOptions() { return [...new Set([...state.settings.companies, ...state.entries.map((entry) => entry.company).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'ja')); }
function subcontractEnabled() { return state.settings.showSubcontract !== false; }
function yearEntries() { const year = cursor.getFullYear(); return state.entries.filter((entry) => fromYmd(entry.date).getFullYear() === year); }
function sumBy(entries, selector) { return entries.reduce((sum, entry) => sum + selector(entry), 0); }
function rateFieldValue(value) { return num(value) ? String(num(value)) : ''; }
function settingListValues(hiddenId) { return (document.getElementById(hiddenId)?.value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean); }
function writeSettingList(hiddenId, values) { const hidden = document.getElementById(hiddenId); if (hidden) hidden.value = values.join('\n'); }
function renderEditableList(listId, hiddenId) {
  const list = document.getElementById(listId); if (!list) return;
  const values = settingListValues(hiddenId);
  list.innerHTML = values.length ? values.map((label, index) => `<span class="setting-chip">${escapeHtml(label)}<button type="button" data-remove-setting-item="${hiddenId}" data-remove-index="${index}" aria-label="削除">×</button></span>`).join('') : '<div class="empty-inline">まだ登録がありません</div>';
}
function renderSettingListEditors() { renderEditableList('st-company-list', 'st-companies'); renderEditableList('st-expense-list', 'st-expenses'); }
function addSettingListItem(hiddenId, inputId) {
  const input = document.getElementById(inputId); if (!input) return;
  const value = input.value.trim(); if (!value) return;
  const values = [...new Set([...settingListValues(hiddenId), value])];
  writeSettingList(hiddenId, values); input.value = ''; renderSettingListEditors();
}
function showSaveFeedback(message) {
  const el = document.getElementById('save-status'); if (!el) { alert(message); return; }
  el.textContent = message; el.classList.add('show');
  window.clearTimeout(showSaveFeedback.timer);
  showSaveFeedback.timer = window.setTimeout(() => el.classList.remove('show'), 2200);
}
function guessReceiptCategory(name) {
  const text = String(name || '').toLowerCase();
  if (/parking|駐車|パーキング/.test(text)) return '駐車場代';
  if (/hotel|宿|旅館/.test(text)) return '宿泊費';
  if (/gas|fuel|ガソリン|燃料/.test(text)) return 'ガソリン代';
  if (/train|bus|taxi|交通|電車|バス|タクシー/.test(text)) return '交通費';
  if (/資材|材料|工具|tool/.test(text)) return '資材代';
  return expenseItems()[0]?.label || 'その他';
}
function monthEntries() { const key = monthKey(cursor); return state.entries.filter((entry) => monthKey(entry.date) === key).sort((a, b) => a.date.localeCompare(b.date)); }
function dayEntries(ymd) { return state.entries.filter((entry) => entry.date === ymd).sort((a, b) => a.createdAt.localeCompare(b.createdAt)); }
function calcEntry(entry) {
  const qty = num(entry.qty || 1), unitRate = num(entry.unitRate), otHours = num(entry.otHours), otRate = num(entry.otRate);
  const labor = qty * unitRate, overtime = otHours * otRate;
  const expenses = expenseItems().reduce((sum, item) => sum + num(entry.expenses?.[item.id]), 0);
  return { qty, unitRate, otHours, otRate, labor, overtime, expenses, subtotal: labor + overtime + expenses };
}
function shiftLabel(shift) { return { day: '日勤', night: '夜勤', trip: '出張' }[shift] || '日勤'; }
function shiftClass(shift) { return { day: 'day', night: 'night', trip: 'trip' }[shift] || 'day'; }
function typeLabel(type) { return type === 'sub' ? '外注' : '自分'; }
function pickSelectedCompany() { const companies = getInvoiceCompanies(); if (!companies.length) { selectedCompany = ''; return companies; } if (!companies.includes(selectedCompany)) selectedCompany = companies[0]; return companies; }
function getInvoiceCompanies() { return [...new Set(monthEntries().filter((entry) => entry.type === 'self').map((entry) => entry.company).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja')); }
function companyInvoiceMode(company) { return state.settings.companyInvoiceModes?.[company] || 'with'; }
function setCompanyInvoiceMode(company, mode) { state.settings.companyInvoiceModes[company] = mode; saveState(); }
function companyEventTitle(entry) { return [entry.company, entry.site].filter(Boolean).join(' / ') || '現場予定'; }

function renderAll() { renderNav(); renderHeaders(); renderCalendar(); renderDayEntries(); renderSubScreen(); renderInvoiceScreen(); renderSettings(); renderSyncScreen(); renderReceiptScreen(); }
function renderNav() {
  if (activeScreen === 'sub' && !subcontractEnabled()) activeScreen = 'cal';
  if (activeScreen !== 'cal') isDayModalOpen = false;
  document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active', 'print-active'));
  document.getElementById(`sc-${activeScreen}`)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach((el) => el.classList.toggle('active', el.dataset.screen === activeScreen));
  syncMenuClones();
  document.querySelectorAll('[data-screen="sub"],[data-screen-link="sub"]').forEach((el) => el.classList.toggle('hidden', !subcontractEnabled()));
  document.getElementById('fab-sub')?.classList.toggle('hidden', !subcontractEnabled());
  document.querySelectorAll('.top-menu').forEach((menu) => menu.classList.add('hidden'));
}
function syncMenuClones() {
  const subItem = subcontractEnabled() ? '<button class="top-menu-item" data-screen-link="sub">外注</button>' : '';
  const template = `
    <button class="top-menu-item" data-screen-link="cal">カレンダー</button>
    ${subItem}
    <button class="top-menu-item" data-screen-link="inv">請求</button>
    <button class="top-menu-item" data-screen-link="sync">Google同期</button>
    <button class="top-menu-item" data-screen-link="receipt">領収書</button>
    <button class="top-menu-item" data-screen-link="st">設定</button>
    <button class="top-menu-item" data-sales-toggle>${state.settings.showSales ? '売上を隠す' : '売上を表示'}</button>`;
  document.querySelectorAll('.top-menu').forEach((menu) => { menu.innerHTML = template; });
}
function renderHeaders() {
  const monthText = fmtMonth(cursor);
  document.getElementById('cal-sub').textContent = `${monthText} ・ 予定 ${monthEntries().length}件`;
  document.getElementById('sub-sub').textContent = `${monthText}の外注出面`;
  document.getElementById('inv-sub').textContent = `${monthText}の会社別帳票`;
  ['cal', 'sub', 'inv'].forEach((prefix) => { const el = document.getElementById(`${prefix}-mnav`); if (el) el.textContent = monthText; });
}
function renderCalendar() {
  const grid = document.getElementById('cal-grid');
  const monthStart = startOfMonth(cursor), startDay = monthStart.getDay();
  const firstCell = new Date(monthStart); firstCell.setDate(firstCell.getDate() - startDay);
  const rows = ['日', '月', '火', '水', '木', '金', '土'].map((label) => `<div class="cal-dow">${label}</div>`);
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(firstCell); date.setDate(firstCell.getDate() + i);
    const ymd = toYmd(date); const items = dayEntries(ymd);
    const classes = ['cal-day'];
    if (date.getMonth() !== cursor.getMonth()) classes.push('other');
    if (ymd === selectedDate) classes.push('sel');
    if (ymd === toYmd(new Date())) classes.push('today');
    if (date.getDay() === 0) classes.push('sun'); if (date.getDay() === 6) classes.push('sat');
    const lines = items.slice(0, 2).map((entry) => `<div class="cal-task ${shiftClass(entry.shift)} ${entry.type === 'sub' ? 'sub' : ''}">${escapeHtml(companyEventTitle(entry))}</div>`).join('');
    const more = items.length > 2 ? `<div class="more-chip">+${items.length - 2}</div>` : '';
    rows.push(`<button class="${classes.join(' ')}" data-date="${ymd}"><span class="dn">${date.getDate()}</span><div class="task-stack">${lines}</div>${more}</button>`);
  }
  grid.innerHTML = rows.join('');
  renderSummary();
}
function renderSummary() {
  const selfEntries = monthEntries().filter((entry) => entry.type === 'self');
  const yearItems = yearEntries();
  const yearSelfEntries = yearItems.filter((entry) => entry.type === 'self');
  const salesExTax = sumBy(selfEntries, (entry) => calcEntry(entry).subtotal);
  const ownQty = sumBy(selfEntries, (entry) => calcEntry(entry).qty);
  const yearQty = sumBy(yearSelfEntries, (entry) => calcEntry(entry).qty);
  const yearSales = sumBy(yearSelfEntries, (entry) => calcEntry(entry).subtotal);
  const yearExpenses = sumBy(yearItems, (entry) => calcEntry(entry).expenses);
  const hidden = !state.settings.showSales;
  document.getElementById('sum-grid').innerHTML = `
    <div class="sum-card"><div class="sl">今月の自分人工</div><div class="sv green">${ownQty.toLocaleString('ja-JP')}</div></div>
    <div class="sum-card"><div class="sl">今月の売上</div><div class="sv ${hidden ? 'hidden-amount' : ''}">${yen(salesExTax, hidden)}</div></div>
    <div class="sum-card"><div class="sl">${cursor.getFullYear()}年の人工合計</div><div class="sv green">${yearQty.toLocaleString('ja-JP')}</div></div>
    <div class="sum-card"><div class="sl">${cursor.getFullYear()}年の売上合計</div><div class="sv ${hidden ? 'hidden-amount' : ''}">${yen(yearSales, hidden)}</div></div>
    <div class="sum-card"><div class="sl">${cursor.getFullYear()}年の経費合計</div><div class="sv ${hidden ? 'hidden-amount' : ''}">${yen(yearExpenses, hidden)}</div></div>
    <div class="sum-card"><div class="sl">${cursor.getFullYear()}年の登録件数</div><div class="sv">${yearItems.length}</div></div>`;
}
function renderDayEntries() {
  const legacy = document.getElementById('day-entries');
  if (legacy) legacy.innerHTML = '';
  const modal = document.getElementById('day-modal-bg');
  const title = document.getElementById('day-modal-title');
  const body = document.getElementById('day-modal-body');
  if (!modal || !title || !body) return;
  const entries = dayEntries(selectedDate);
  const hidden = !state.settings.showSales;
  title.textContent = `${fmtDateJP(selectedDate)}（${weekdayLabel(selectedDate)}）`;
  if (!entries.length) {
    body.innerHTML = `<div class="day-mini-empty"><div class="empty" style="padding:22px 10px 8px"><div>この日の予定はありません</div><p>追加ボタンから登録できます。</p></div><button class="btn-primary" type="button" data-add-date="${selectedDate}">予定を追加</button></div>`;
    modal.classList.toggle('open', activeScreen === 'cal' && isDayModalOpen);
    return;
  }
  body.innerHTML = `<div class="day-mini-list">${entries.map((entry) => {
    const calc = calcEntry(entry);
    return `<div class="day-mini-card"><div class="day-mini-row"><div><div class="day-mini-title">${escapeHtml(entry.company || '会社名未入力')}</div><div class="day-mini-sub">${escapeHtml(entry.site || '現場名未入力')} ・ ${entry.type === 'sub' ? escapeHtml(entry.workerName || '外注職人') : '自分'} ・ ${shiftLabel(entry.shift)}</div></div><div class="pill ${shiftClass(entry.shift)}">${shiftLabel(entry.shift)}</div></div><div class="day-mini-sub" style="margin-top:8px">${calc.qty}人工 / ${yen(calc.subtotal, hidden)}</div><div class="day-mini-actions"><button class="day-mini-btn" type="button" data-edit-entry="${entry.id}">編集</button><button class="day-mini-btn" type="button" data-sync-entry="${entry.id}">同期</button><button class="day-mini-btn del" type="button" data-del-entry="${entry.id}">削除</button></div></div>`;
  }).join('')}<button class="btn-primary" type="button" data-add-date="${selectedDate}">予定を追加</button></div>`;
  modal.classList.toggle('open', activeScreen === 'cal' && isDayModalOpen);
}

function openDayModal(date) {
  selectedDate = date;
  if (monthKey(selectedDate) !== monthKey(cursor)) cursor = startOfMonth(fromYmd(selectedDate));
  isDayModalOpen = true;
  renderAll();
}

function closeDayModal() {
  isDayModalOpen = false;
  document.getElementById('day-modal-bg')?.classList.remove('open');
}
function renderSubScreen() {
  const body = document.getElementById('sub-body');
  const monthlySubs = monthEntries().filter((entry) => entry.type === 'sub');
  const groups = {};
  monthlySubs.forEach((entry) => {
    const name = entry.workerName || '名称未入力';
    if (!groups[name]) groups[name] = { days: 0, total: 0, companies: new Set(), entries: [] };
    groups[name].days += num(entry.qty || 1); groups[name].total += calcEntry(entry).subtotal; groups[name].entries.push(entry); if (entry.company) groups[name].companies.add(entry.company);
  });
  const people = Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
  const hidden = !state.settings.showSales;
  if (!people.length) { body.innerHTML = `<div class="sub-total-grid"><div class="sub-stat"><div class="k">外注人数</div><div class="v">0人</div></div><div class="sub-stat"><div class="k">支払見込</div><div class="v">${yen(0, hidden)}</div></div></div><div class="empty"><div class="icon">👷</div><div>外注の記録はまだありません</div><p>右下の＋から追加できます。</p></div>`; return; }
  const totalPay = people.reduce((sum, [, info]) => sum + info.total, 0);
  const totalDays = people.reduce((sum, [, info]) => sum + info.days, 0);
  body.innerHTML = `<div class="sub-total-grid"><div class="sub-stat"><div class="k">外注人数</div><div class="v">${people.length}人</div></div><div class="sub-stat"><div class="k">支払見込</div><div class="v ${hidden ? 'hidden-amount' : ''}">${yen(totalPay, hidden)}</div></div><div class="sub-stat"><div class="k">人工合計</div><div class="v">${totalDays}</div></div><div class="sub-stat"><div class="k">会社数</div><div class="v">${new Set(monthlySubs.map((entry) => entry.company).filter(Boolean)).size}</div></div></div>${people.map(([name, info]) => `<div class="sub-card"><div class="sub-card-hd"><div><div class="sub-card-name">${escapeHtml(name)}</div><div class="sub-card-sub">${[...info.companies].join(' / ') || '会社未入力'}</div></div><div><div class="sub-card-amt ${hidden ? 'hidden-amount' : ''}">${yen(info.total, hidden)}</div><div class="sub-card-meta">${info.days}人工</div></div></div><div class="sub-card-foot">${info.entries.slice(0, 4).map((entry) => `<span class="etag">${fmtDateJP(entry.date)} ${escapeHtml(entry.site || '現場')}</span>`).join('')}</div></div>`).join('')}`;
}
function renderInvoiceScreen() {
  const tabs = document.getElementById('co-tabs');
  const body = document.getElementById('inv-body');
  const companies = pickSelectedCompany();
  if (!companies.length) { tabs.innerHTML = ''; body.innerHTML = `<div class="empty"><div class="icon">🧾</div><div>この月の請求対象はまだありません</div><p>自分の予定を入力するとここに会社別帳票が出ます。</p></div>`; return; }
  tabs.innerHTML = companies.map((company) => `<button class="co-chip ${company === selectedCompany ? 'active' : ''}" data-company="${escapeHtml(company)}">${escapeHtml(company)}</button>`).join('');
  const mode = companyInvoiceMode(selectedCompany);
  const entries = monthEntries().filter((entry) => entry.type === 'self' && entry.company === selectedCompany);
  const rows = entries.map((entry) => ({ entry, calc: calcEntry(entry) }));
  const subtotal = rows.reduce((sum, row) => sum + row.calc.subtotal, 0);
  const tax = state.settings.invoiceEnabled && mode === 'with' ? Math.round(subtotal * (num(state.settings.taxRate) / 100)) : 0;
  const total = subtotal + tax;
  const hidden = !state.settings.showSales;
  const expenseSums = expenseItems().map((item) => ({ ...item, total: rows.reduce((sum, row) => sum + num(row.entry.expenses?.[item.id]), 0) })).filter((item) => item.total > 0);
  body.innerHTML = `<div class="mode-switch"><button class="mode-btn ${mode === 'with' ? 'active' : ''}" data-invoice-mode="with">インボイスあり</button><button class="mode-btn ${mode === 'without' ? 'active' : ''}" data-invoice-mode="without">インボイスなし</button></div><div class="btn-row" style="padding:0 16px 10px"><button class="btn-secondary" data-export-demen>出面CSV</button><button class="btn-secondary" data-export-invoice>請求CSV</button><button class="btn-gold" data-print-demen>出面表印刷</button><button class="btn-primary" data-print-invoice>請求書印刷</button></div><div class="tbl-wrap" id="print-demen-wrap"><table class="demen"><thead><tr><th>日</th><th>現場名</th><th>区分</th><th class="right">人工</th><th class="right">単価</th><th class="right">人工計</th><th class="right">残業h</th><th class="right">残業計</th>${expenseItems().map((item) => `<th class="right">${escapeHtml(item.label)}</th>`).join('')}<th class="right">合計</th></tr></thead><tbody>${rows.map(({ entry, calc }) => `<tr><td>${entry.date.slice(8, 10)}</td><td>${escapeHtml(entry.site)}</td><td>${shiftLabel(entry.shift)}</td><td class="right">${calc.qty}</td><td class="right">${yen(calc.unitRate, hidden)}</td><td class="right">${yen(calc.labor, hidden)}</td><td class="right">${calc.otHours || ''}</td><td class="right">${calc.overtime ? yen(calc.overtime, hidden) : ''}</td>${expenseItems().map((item) => `<td class="right">${num(entry.expenses?.[item.id]) ? yen(entry.expenses[item.id], hidden) : ''}</td>`).join('')}<td class="right">${yen(calc.subtotal, hidden)}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="${9 + expenseItems().length}" class="right">月合計</td><td class="right">${yen(subtotal, hidden)}</td></tr></tfoot></table></div><div class="inv-box" id="print-invoice-box"><div class="inv-hd"><div class="inv-hd-title">請求書</div><div class="inv-hd-to">${escapeHtml(selectedCompany)} 御中</div><div class="inv-hd-date">請求日 ${toYmd(new Date())}</div><div class="inv-badge">${mode === 'with' && state.settings.invoiceEnabled ? 'インボイス対応' : 'インボイスなし'}</div></div><div class="inv-amt-box"><div class="inv-amt-lbl">ご請求金額</div><div class="inv-amt-val ${hidden ? 'hidden-amount' : ''}">${yen(total, hidden)}</div><div class="inv-amt-note">${fmtMonth(cursor)}分</div></div><div class="inv-sec"><div class="inv-sec-title">請求内訳</div><div class="inv-row"><span class="lbl">売上（税別）</span><span class="val ${hidden ? 'hidden-amount' : ''}">${yen(subtotal, hidden)}</span></div><div class="inv-row"><span class="lbl">消費税 (${state.settings.taxRate}%)</span><span class="val ${hidden ? 'hidden-amount' : ''}">${yen(tax, hidden)}</span></div><div class="inv-total"><span>合計</span><span class="val ${hidden ? 'hidden-amount' : ''}">${yen(total, hidden)}</span></div></div><div class="inv-sec"><div class="inv-sec-title">経費内訳</div>${expenseSums.length ? expenseSums.map((item) => `<div class="inv-row"><span class="lbl">${escapeHtml(item.label)}</span><span class="val ${hidden ? 'hidden-amount' : ''}">${yen(item.total, hidden)}</span></div>`).join('') : `<div class="inv-row"><span class="lbl">経費なし</span><span class="val">-</span></div>`}${state.settings.invoiceEnabled && mode === 'with' && state.settings.invoiceNo ? `<div class="inv-row"><span class="lbl">登録番号</span><span class="val">${escapeHtml(state.settings.invoiceNo)}</span></div>` : ''}</div>${state.settings.bank ? `<div class="inv-bank"><strong>振込先</strong>${escapeHtml(state.settings.bank)} ${escapeHtml(state.settings.branch)}<br>${escapeHtml(state.settings.accountNo)}<br>${escapeHtml(state.settings.accountName)}</div>` : ''}${state.settings.name || state.settings.companyName ? `<div class="inv-sender"><strong>${escapeHtml(state.settings.companyName || state.settings.name)}</strong>${state.settings.address ? `${escapeHtml(state.settings.address)}<br>` : ''}${state.settings.tel ? `TEL ${escapeHtml(state.settings.tel)}` : ''}</div>` : ''}</div>`;
}
function renderSyncScreen() {
  const s = state.settings;
  const client = document.getElementById('google-client-id'); if (client) client.value = s.googleClientId || '';
  const cal = document.getElementById('google-calendar-id'); if (cal) cal.value = s.googleCalendarId || 'primary';
  const mode = document.getElementById('google-store-mode'); if (mode) mode.value = s.googleStoreMode || 'local';
  const status = document.getElementById('google-account-status'); if (status) status.textContent = s.googleAccountEmail || '未接続';
  const sub = document.getElementById('sync-sub'); if (sub) sub.textContent = s.googleAccountEmail ? '接続済み' : '未接続';
  const dot = document.getElementById('google-status-dot'); if (dot) dot.classList.toggle('off', !s.googleAccountEmail);
  const log = document.getElementById('sync-log'); if (log && !log.textContent) log.textContent = 'Google連携の設定待ち';
}
function renderReceiptScreen() {
  const sub = document.getElementById('receipt-sub'); if (sub) sub.textContent = `${state.receipts?.length || 0}件`;
  const body = document.getElementById('receipt-body'); if (!body) return;
  const receipts = state.receipts || [];
  if (!receipts.length) { body.innerHTML = '<div class="empty"><div>領収書はまだありません</div></div>'; return; }
  body.innerHTML = '<div class="receipt-list">' + receipts.map((receipt) => `<div class="receipt-card"><div><div class="receipt-name">${escapeHtml(receipt.fileName || '領収書')}</div><div class="receipt-meta">${escapeHtml(receipt.status)} ・ ${escapeHtml(receipt.importedAt.slice(0, 10))}</div></div><select class="receipt-select" data-receipt-category="${receipt.id}">${expenseItems().map((item) => `<option value="${escapeHtml(item.label)}" ${item.label === receipt.category ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('')}</select><button class="receipt-del" type="button" data-del-receipt="${receipt.id}">×</button></div>`).join('') + '</div>';
}
function renderSettings() {
  const s = state.settings;
  const map = { 'st-name': s.name, 'st-addr': s.address, 'st-tel': s.tel, 'st-co': s.companyName, 'st-bank': s.bank, 'st-branch': s.branch, 'st-accno': s.accountNo, 'st-accname': s.accountName, 'st-invno': s.invoiceNo, 'st-tanka': rateFieldValue(s.defaultDayRate), 'st-ntanka': rateFieldValue(s.defaultNightRate), 'st-ottanka': rateFieldValue(s.defaultOtRate) };
  Object.entries(map).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.value = value ?? ''; });
  document.getElementById('st-tax').value = String(s.taxRate);
  document.getElementById('st-companies').value = (s.companies || []).join('\n');
  document.getElementById('st-expenses').value = expenseItems().map((item) => item.label).join('\n');
  document.getElementById('tgl-inv').classList.toggle('on', !!s.invoiceEnabled);
  document.getElementById('tgl-subcontract')?.classList.toggle('on', subcontractEnabled());
  document.getElementById('inv-no-row').classList.toggle('hidden', !s.invoiceEnabled);
  renderSettingListEditors();
}
function createDefaultEntry(type, date) {
  return { id: '', date, type, shift: 'day', company: '', site: '', workerName: '', qty: 1, unitRate: '', otHours: 0, otRate: '', expenses: Object.fromEntries(expenseItems().map((item) => [item.id, 0])), notes: '', invoiceMode: 'with' };
}
function openModal(type, id = null) {
  if (type === 'sub' && !subcontractEnabled()) type = 'self';
  editingId = id;
  const entry = id ? state.entries.find((item) => item.id === id) : createDefaultEntry(type, selectedDate);
  if (!entry) return;
  const isSub = entry.type === 'sub' || type === 'sub';
  const expenseFields = expenseItems().map((item) => `<div class="field"><label>${escapeHtml(item.label)}</label><input type="number" min="0" step="1" data-expense-id="${item.id}" value="${num(entry.expenses?.[item.id]) || ''}"></div>`).join('');
  const typeButtons = `<button class="type-btn ${entry.type === 'self' ? 'active' : ''}" data-entry-type="self" type="button">自分</button>${subcontractEnabled() || entry.type === 'sub' ? `<button class="type-btn ${entry.type === 'sub' ? 'active' : ''}" data-entry-type="sub" type="button">外注職人</button>` : ''}`;
  document.getElementById('modal-title').textContent = id ? '予定を編集' : '予定を追加';
  document.getElementById('modal-body').innerHTML = `<div class="type-sel">${typeButtons}</div><form id="entry-form"><div class="field"><label>日付</label><input id="f-date" type="date" value="${escapeHtml(entry.date)}"></div>${isSub ? `<div class="field" id="worker-wrap"><label>職人名</label><input id="f-worker" value="${escapeHtml(entry.workerName)}" placeholder="佐藤大工"></div>` : `<div class="field hidden" id="worker-wrap"><label>職人名</label><input id="f-worker" value="${escapeHtml(entry.workerName)}"></div>`}<div class="field"><label>会社名</label><input id="f-company" value="${escapeHtml(entry.company)}" placeholder="空欄でも保存できます"></div><div class="field"><label>現場名</label><input id="f-site" value="${escapeHtml(entry.site)}" placeholder="空欄でも保存できます"></div><div class="field-r2"><div class="field"><label>勤務区分</label><select id="f-shift"><option value="day" ${entry.shift === 'day' ? 'selected' : ''}>日勤</option><option value="night" ${entry.shift === 'night' ? 'selected' : ''}>夜勤</option><option value="trip" ${entry.shift === 'trip' ? 'selected' : ''}>出張</option></select></div><div class="field"><label>人工</label><input id="f-qty" type="number" min="0" step="0.5" value="${entry.qty}"></div></div><div class="field-r3"><div class="field"><label>単価</label><input id="f-rate" type="number" min="0" step="1" value="${rateFieldValue(entry.unitRate)}"></div><div class="field"><label>残業時間</label><input id="f-ot-hours" type="number" min="0" step="0.5" value="${num(entry.otHours) || ''}"></div><div class="field"><label>残業単価</label><input id="f-ot-rate" type="number" min="0" step="1" value="${rateFieldValue(entry.otRate)}"></div></div><div class="sec-hd" style="padding:0 0 8px">経費</div><div class="field-r2">${expenseFields}</div><div class="field"><label>メモ</label><textarea id="f-notes" placeholder="注意点やメモ">${escapeHtml(entry.notes)}</textarea></div><div class="btn-row"><button class="btn-secondary" type="button" id="cancel-entry-btn">キャンセル</button><button class="btn-primary" type="submit">保存</button></div></form>`;
  document.getElementById('modal-bg').classList.add('open');
}
function closeModal() {
  const modal = document.getElementById('entry-modal');
  modal.classList.remove('dragging');
  modal.style.transform = '';
  document.getElementById('modal-bg').classList.remove('open');
  editingId = null;
}
function collectEntryForm() {
  const type = document.querySelector('[data-entry-type].active')?.dataset.entryType || 'self';
  const entry = {
    id: editingId || crypto.randomUUID(), date: document.getElementById('f-date').value, type, shift: document.getElementById('f-shift').value,
    company: document.getElementById('f-company').value.trim(), site: document.getElementById('f-site').value.trim(), workerName: document.getElementById('f-worker').value.trim(),
    qty: num(document.getElementById('f-qty').value), unitRate: num(document.getElementById('f-rate').value), otHours: num(document.getElementById('f-ot-hours').value), otRate: num(document.getElementById('f-ot-rate').value),
    expenses: {}, notes: document.getElementById('f-notes').value.trim(), invoiceMode: 'with', createdAt: editingId ? (state.entries.find((item) => item.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  document.querySelectorAll('[data-expense-id]').forEach((input) => { entry.expenses[input.dataset.expenseId] = num(input.value); });
  if (!entry.date) throw new Error('日付を入力してください');
  return entry;
}
function upsertEntry(entry) {
  state.entries = state.entries.filter((item) => item.id !== entry.id);
  state.entries.push(entry);
  selectedDate = entry.date; cursor = startOfMonth(fromYmd(entry.date));
  saveState(); renderAll();
}
function saveGoogleSettings() {
  state.settings.googleClientId = document.getElementById('google-client-id')?.value.trim() || '';
  state.settings.googleCalendarId = document.getElementById('google-calendar-id')?.value.trim() || 'primary';
  state.settings.googleStoreMode = document.getElementById('google-store-mode')?.value || 'local';
  saveState(); renderAll(); setSyncLog('Google設定を保存しました');
}
function setSyncLog(message) { const log = document.getElementById('sync-log'); if (log) log.textContent = message; }
function handleReceiptFiles(files) {
  const list = Array.from(files || []);
  if (!list.length) return;
  state.receipts = [...(state.receipts || []), ...list.map((file) => normalizeReceipt({ fileName: file.name, importedAt: new Date().toISOString(), category: guessReceiptCategory(file.name), status: '仕分け候補' }))];
  saveState(); renderReceiptScreen();
}
function saveSettings() {
  const linesToObjects = (text, previous) => text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((label, index) => ({ id: previous[index]?.id || `exp${index + 1}`, label }));
  state.settings = { ...state.settings, name: document.getElementById('st-name').value.trim(), address: document.getElementById('st-addr').value.trim(), tel: document.getElementById('st-tel').value.trim(), companyName: document.getElementById('st-co').value.trim(), bank: document.getElementById('st-bank').value.trim(), branch: document.getElementById('st-branch').value.trim(), accountNo: document.getElementById('st-accno').value.trim(), accountName: document.getElementById('st-accname').value.trim(), invoiceNo: document.getElementById('st-invno').value.trim(), invoiceEnabled: document.getElementById('tgl-inv').classList.contains('on'), showSubcontract: document.getElementById('tgl-subcontract')?.classList.contains('on') !== false, taxRate: num(document.getElementById('st-tax').value || 10), defaultDayRate: num(document.getElementById('st-tanka').value || 0), defaultNightRate: num(document.getElementById('st-ntanka').value || 0), defaultOtRate: num(document.getElementById('st-ottanka').value || 0), companies: settingListValues('st-companies'), expenseItems: linesToObjects(document.getElementById('st-expenses').value, expenseItems()) };
  state.entries = state.entries.map((entry) => { const nextExpenses = {}; expenseItems().forEach((item) => { nextExpenses[item.id] = num(entry.expenses?.[item.id]); }); return { ...entry, expenses: nextExpenses }; });
  saveState(); renderAll(); showSaveFeedback('設定を保存しました');
}
function deleteEntry(id) { state.entries = state.entries.filter((entry) => entry.id !== id); saveState(); renderAll(); }
function gcalEntry(id) {
  const entry = state.entries.find((item) => item.id === id); if (!entry) return;
  const start = entry.date.replaceAll('-', ''); const endDate = fromYmd(entry.date); endDate.setDate(endDate.getDate() + 1); const end = toYmd(endDate).replaceAll('-', '');
  const title = encodeURIComponent(companyEventTitle(entry));
  window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}`, '_blank');
}
function csvCell(value) { const text = String(value ?? ''); return `"${text.replaceAll('"', '""')}"`; }
function downloadCsv(filename, rows) { const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n'); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; link.click(); URL.revokeObjectURL(link.href); }
function exportDemenCsv() {
  const rows = [['日付', '会社名', '現場名', '区分', '人工', '単価', '人工計', '残業h', '残業計', ...expenseItems().map((item) => item.label), '合計']];
  monthEntries().filter((entry) => entry.type === 'self' && entry.company === selectedCompany).forEach((entry) => {
    const calc = calcEntry(entry);
    rows.push([entry.date, entry.company, entry.site, shiftLabel(entry.shift), calc.qty, calc.unitRate, calc.labor, calc.otHours, calc.overtime, ...expenseItems().map((item) => num(entry.expenses?.[item.id])), calc.subtotal]);
  });
  downloadCsv(`${monthKey(cursor)}_${selectedCompany}_出面表.csv`, rows);
}
function exportInvoiceCsv() {
  const entries = monthEntries().filter((entry) => entry.type === 'self' && entry.company === selectedCompany);
  const subtotal = entries.reduce((sum, entry) => sum + calcEntry(entry).subtotal, 0);
  const tax = state.settings.invoiceEnabled && companyInvoiceMode(selectedCompany) === 'with' ? Math.round(subtotal * (num(state.settings.taxRate) / 100)) : 0;
  downloadCsv(`${monthKey(cursor)}_${selectedCompany}_請求書.csv`, [['請求先', selectedCompany], ['対象月', fmtMonth(cursor)], ['売上（税別）', subtotal], ['消費税', tax], ['合計', subtotal + tax]]);
}
function printView(kind) {
  const screen = document.getElementById('sc-inv'); screen.classList.add('print-active');
  if (kind === 'invoice') document.getElementById('print-demen-wrap')?.classList.add('hidden'); else document.getElementById('print-invoice-box')?.classList.add('hidden');
  window.print();
  document.getElementById('print-demen-wrap')?.classList.remove('hidden'); document.getElementById('print-invoice-box')?.classList.remove('hidden'); screen.classList.remove('print-active');
}
function bindEvents() {
  document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => { activeScreen = button.dataset.screen; renderAll(); }));
  const salesToggle = document.getElementById('toggle-sales-btn');
  if (salesToggle) salesToggle.addEventListener('click', () => { state.settings.showSales = !state.settings.showSales; saveState(); renderAll(); });
  ['prev-month-btn', 'sub-prev-month-btn', 'inv-prev-month-btn'].forEach((id) => document.getElementById(id).addEventListener('click', () => { cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1); if (monthKey(selectedDate) !== monthKey(cursor)) selectedDate = toYmd(cursor); renderAll(); }));
  ['next-month-btn', 'sub-next-month-btn', 'inv-next-month-btn'].forEach((id) => document.getElementById(id).addEventListener('click', () => { cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1); if (monthKey(selectedDate) !== monthKey(cursor)) selectedDate = toYmd(cursor); renderAll(); }));
  document.getElementById('fab-main').addEventListener('click', () => { closeDayModal(); openModal('self'); });
  document.getElementById('fab-sub').addEventListener('click', () => { if (!subcontractEnabled()) return; closeDayModal(); openModal('sub'); });
  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
  document.getElementById('add-company-btn')?.addEventListener('click', () => addSettingListItem('st-companies', 'st-company-new'));
  document.getElementById('add-expense-btn')?.addEventListener('click', () => addSettingListItem('st-expenses', 'st-expense-new'));
  document.getElementById('st-company-new')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); addSettingListItem('st-companies', 'st-company-new'); } });
  document.getElementById('st-expense-new')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); addSettingListItem('st-expenses', 'st-expense-new'); } });
  document.getElementById('save-google-settings-btn')?.addEventListener('click', saveGoogleSettings);
  document.getElementById('google-connect-btn')?.addEventListener('click', () => setSyncLog(state.settings.googleClientId ? 'OAuth接続は次の実装で有効化します' : 'Client IDを入力してください'));
  document.getElementById('google-sync-now-btn')?.addEventListener('click', () => setSyncLog(state.settings.googleClientId ? '同期エンジンは次の実装で有効化します' : 'Client IDを入力してください'));
  document.getElementById('receipt-pick-btn')?.addEventListener('click', () => document.getElementById('receipt-file')?.click());
  document.getElementById('receipt-file')?.addEventListener('change', (event) => { handleReceiptFiles(event.target.files); event.target.value = ''; });
  document.getElementById('tgl-inv').addEventListener('click', () => { document.getElementById('tgl-inv').classList.toggle('on'); document.getElementById('inv-no-row').classList.toggle('hidden', !document.getElementById('tgl-inv').classList.contains('on')); });
  document.getElementById('tgl-subcontract')?.addEventListener('click', () => document.getElementById('tgl-subcontract').classList.toggle('on'));
  document.getElementById('modal-bg').addEventListener('click', (event) => { if (event.target.id === 'modal-bg') closeModal(); });
  initModalGesture();

  document.addEventListener('click', (event) => {
    const removeSettingItem = event.target.closest('[data-remove-setting-item]');
    if (removeSettingItem) { const hiddenId = removeSettingItem.dataset.removeSettingItem; const index = Number(removeSettingItem.dataset.removeIndex); const values = settingListValues(hiddenId).filter((_, itemIndex) => itemIndex !== index); writeSettingList(hiddenId, values); renderSettingListEditors(); return; }
    const closeDayButton = event.target.closest('[data-close-day-modal]');
    if (closeDayButton || event.target.id === 'day-modal-bg') { closeDayModal(); return; }
    const menuButton = event.target.closest('#menu-toggle-btn,[data-menu-open]');
    if (menuButton) {
      const menu = menuButton.closest('.topbar').querySelector('.top-menu');
      menu.classList.toggle('hidden');
      return;
    }
    const screenLink = event.target.closest('[data-screen-link]');
    if (screenLink) { activeScreen = screenLink.dataset.screenLink; if (activeScreen !== 'cal') closeDayModal(); renderAll(); return; }
    const otherSales = event.target.closest('[data-sales-toggle]');
    if (otherSales) { state.settings.showSales = !state.settings.showSales; saveState(); renderAll(); return; }
    const dayButton = event.target.closest('.cal-day');
    if (dayButton) { openDayModal(dayButton.dataset.date); return; }
    const addDate = event.target.closest('[data-add-date]');
    if (addDate) { selectedDate = addDate.dataset.addDate; closeDayModal(); openModal('self'); return; }
    const editButton = event.target.closest('[data-edit-entry]'); if (editButton) { closeDayModal(); openModal('self', editButton.dataset.editEntry); return; }
    const delButton = event.target.closest('[data-del-entry]'); if (delButton) { if (confirm('この予定を削除しますか？')) deleteEntry(delButton.dataset.delEntry); return; }
    const syncButton = event.target.closest('[data-sync-entry]'); if (syncButton) { gcalEntry(syncButton.dataset.syncEntry); return; }
    const receiptCategory = event.target.closest('[data-receipt-category]');
    if (receiptCategory) { const item = state.receipts.find((receipt) => receipt.id === receiptCategory.dataset.receiptCategory); if (item) { item.category = receiptCategory.value; item.status = '確認済み'; saveState(); renderReceiptScreen(); } return; }
    const delReceipt = event.target.closest('[data-del-receipt]');
    if (delReceipt) { state.receipts = (state.receipts || []).filter((receipt) => receipt.id !== delReceipt.dataset.delReceipt); saveState(); renderReceiptScreen(); return; }
    const companyChip = event.target.closest('[data-company]'); if (companyChip) { selectedCompany = companyChip.dataset.company; renderInvoiceScreen(); return; }
    const modeButton = event.target.closest('[data-invoice-mode]'); if (modeButton) { setCompanyInvoiceMode(selectedCompany, modeButton.dataset.invoiceMode); renderInvoiceScreen(); return; }
    if (event.target.matches('#cancel-entry-btn')) { closeModal(); return; }
    if (event.target.matches('[data-export-demen]')) exportDemenCsv();
    if (event.target.matches('[data-export-invoice]')) exportInvoiceCsv();
    if (event.target.matches('[data-print-demen]')) printView('demen');
    if (event.target.matches('[data-print-invoice]')) printView('invoice');
    if (event.target.matches('[data-entry-type]')) {
      if (event.target.dataset.entryType === 'sub' && !subcontractEnabled()) return;
      document.querySelectorAll('[data-entry-type]').forEach((button) => button.classList.remove('active')); event.target.classList.add('active');
      document.getElementById('worker-wrap').classList.toggle('hidden', event.target.dataset.entryType !== 'sub'); return;
    }
    if (!event.target.closest('.top-menu') && !event.target.closest('.ghost-icon-btn')) {
      document.querySelectorAll('.top-menu').forEach((menu) => menu.classList.add('hidden'));
    }
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'f-shift') {
      const rate = document.getElementById('f-rate'); if (!rate) return;
      if (event.target.value === 'night') rate.value = rateFieldValue(state.settings.defaultNightRate); else if (!num(rate.value)) rate.value = rateFieldValue(state.settings.defaultDayRate);
    }
  });

  document.addEventListener('submit', (event) => {
    if (event.target.id !== 'entry-form') return;
    event.preventDefault();
    try { const entry = collectEntryForm(); upsertEntry(entry); closeModal(); } catch (error) { alert(error.message || '保存に失敗しました'); }
  });
}

function initModalGesture() {
  const modal = document.getElementById('entry-modal');
  const handleStart = (y) => { modalTouch.startY = y; modalTouch.currentY = y; modalTouch.dragging = true; modal.classList.add('dragging'); };
  const handleMove = (y) => {
    if (!modalTouch.dragging) return;
    modalTouch.currentY = y;
    const diff = Math.max(0, y - modalTouch.startY);
    modal.style.transform = `translateY(${diff}px)`;
  };
  const handleEnd = () => {
    if (!modalTouch.dragging) return;
    const diff = modalTouch.currentY - modalTouch.startY;
    modalTouch.dragging = false;
    modal.classList.remove('dragging');
    if (diff > 120) {
      closeModal();
    } else {
      modal.style.transform = '';
    }
  };
  modal.addEventListener('touchstart', (event) => handleStart(event.touches[0].clientY), { passive: true });
  modal.addEventListener('touchmove', (event) => handleMove(event.touches[0].clientY), { passive: true });
  modal.addEventListener('touchend', handleEnd);
  modal.addEventListener('pointerdown', (event) => { if (event.pointerType !== 'mouse') handleStart(event.clientY); });
  modal.addEventListener('pointermove', (event) => { if (modalTouch.dragging && event.pointerType !== 'mouse') handleMove(event.clientY); });
  modal.addEventListener('pointerup', handleEnd);
}
function registerPwa() { if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('sw failed', error)); }
function init() { bindEvents(); renderAll(); registerPwa(); }
document.addEventListener('DOMContentLoaded', init);
