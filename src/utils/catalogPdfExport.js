export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function formatMoney(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!Number.isFinite(n)) return '--'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function safeFileName(value, fallback = 'file') {
  const name = String(value || fallback)
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return name || fallback
}

/**
 * Open a catalog-style PDF print preview window (same UX as inventory statistics batch PDF export).
 */
export function openCatalogPdfExport({ title, rows, columns, canViewCost = false, isEn = false }) {
  const headerHtml = columns
    .map(column => `<th data-column="${column.key}" class="${column.className || ''}">${escapeHtml(column.label)}</th>`)
    .join('')
  const rowsHtml = rows.map(row => {
    const cells = columns.map(column => (
      `<td data-column="${column.key}" class="${column.className || ''}">${column.render(row)}</td>`
    )).join('')
    return `<tr>${cells}</tr>`
  }).join('')
  const columnOptionsHtml = columns.map(column => `
    <label class="column-option">
      <input type="checkbox" data-column-toggle value="${column.key}" checked />
      <span>${escapeHtml(column.label)}</span>
    </label>
  `).join('')

  const now = new Date()
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
  const count = rows.length
  const metaText = isEn
    ? `${nowStr} | ${count} records`
    : `${nowStr} | \u5171 ${count} \u6761\u8bb0\u5f55`
  const pageText = isEn
    ? {
        settings: 'PDF settings',
        costCoefficient: 'Avg cost coefficient',
        costHint: 'The average cost price in the report will be multiplied by this coefficient.',
        visibleColumns: 'Visible columns',
        print: 'Print',
        invalidCoefficient: 'Please enter a valid coefficient.',
        emptyColumns: 'Please keep at least one column visible.'
      }
    : {
        settings: 'PDF \u8bbe\u7f6e',
        costCoefficient: '\u5e73\u5747\u6210\u672c\u4ef7\u7cfb\u6570',
        costHint: '\u62a5\u8868\u4e2d\u7684\u5e73\u5747\u6210\u672c\u4ef7\u5c06\u4e58\u4ee5\u6b64\u7cfb\u6570\u3002',
        visibleColumns: '\u663e\u793a\u7684\u8868\u5934',
        print: '\u6253\u5370',
        invalidCoefficient: '\u8bf7\u8f93\u5165\u6709\u6548\u7684\u7cfb\u6570\u3002',
        emptyColumns: '\u8bf7\u81f3\u5c11\u4fdd\u7559\u4e00\u4e2a\u663e\u793a\u5b57\u6bb5\u3002'
      }

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    return false
  }

  printWindow.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(safeFileName(title, title))}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, "Microsoft YaHei", sans-serif; padding: 20px; color: #1f2329; background: #f5f7fa; }
    button, input { font: inherit; }
    .settings-panel { max-width: 1480px; margin: 0 auto 16px; padding: 16px 18px; border: 1px solid #dfe3eb; border-radius: 8px; background: #fff; box-shadow: 0 2px 8px rgba(31, 35, 41, .06); }
    .settings-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
    .settings-title { font-size: 17px; font-weight: 700; }
    .print-button { min-width: 92px; padding: 8px 18px; border: 1px solid #409eff; border-radius: 5px; color: #fff; background: #409eff; cursor: pointer; }
    .print-button:hover { background: #337ecc; border-color: #337ecc; }
    .setting-row { display: flex; align-items: flex-start; gap: 14px; padding-top: 12px; border-top: 1px solid #edf0f5; }
    .setting-row + .setting-row { margin-top: 12px; }
    .setting-label { flex: 0 0 150px; padding-top: 5px; color: #4b5563; font-weight: 600; }
    .setting-content { flex: 1; min-width: 0; }
    .coefficient-input { width: 180px; height: 32px; padding: 0 10px; border: 1px solid #cfd5df; border-radius: 4px; outline: none; }
    .coefficient-input:focus { border-color: #409eff; box-shadow: 0 0 0 2px rgba(64, 158, 255, .15); }
    .setting-hint { margin-top: 6px; color: #7b8494; font-size: 12px; }
    .column-options { display: flex; flex-wrap: wrap; gap: 8px 18px; }
    .column-option { display: inline-flex; align-items: center; gap: 6px; min-width: 112px; line-height: 28px; cursor: pointer; user-select: none; }
    .column-option input { width: 16px; height: 16px; accent-color: #409eff; }
    .report-content { max-width: 1480px; margin: 0 auto; padding: 20px; background: #fff; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .meta { color: #667085; font-size: 11px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: auto; }
    th, td { border: 1px solid #dfe3eb; padding: 4px 6px; text-align: left; vertical-align: middle; overflow-wrap: break-word; }
    th { background: #f5f7fa; color: #4b5563; font-weight: 600; white-space: nowrap; }
    tr:nth-child(even) td { background: #fafbfc; }
    th[hidden], td[hidden] { display: none; }
    .image-cell { width: 80px; text-align: center; }
    td.image-cell img { width: 72px; height: 72px; object-fit: cover; border-radius: 4px; display: block; margin: 0 auto; }
    .number-cell { text-align: right; white-space: nowrap; }
    @page { size: landscape; margin: 6mm; }
    @media print {
      body { padding: 0; background: #fff; }
      .no-print { display: none !important; }
      .report-content { max-width: none; margin: 0; padding: 0; }
      table { font-size: 8px; }
      th, td { padding: 2px 3px; }
      th { white-space: normal; }
      .image-cell { width: 56px; }
      td.image-cell img { width: 48px; height: 48px; }
      h1 { font-size: 14px; }
      .meta { font-size: 8px; margin-bottom: 8px; }
    }
  </style>
</head>
<body>
  <section class="settings-panel no-print">
    <div class="settings-header">
      <div class="settings-title">${escapeHtml(pageText.settings)}</div>
      <button id="print-button" class="print-button" type="button">${escapeHtml(pageText.print)}</button>
    </div>
    ${canViewCost ? `
    <div class="setting-row">
      <div class="setting-label">${escapeHtml(pageText.costCoefficient)}</div>
      <div class="setting-content">
        <input id="cost-coefficient" class="coefficient-input" type="number" value="1" step="0.01" />
        <div class="setting-hint">${escapeHtml(pageText.costHint)}</div>
      </div>
    </div>` : ''}
    <div class="setting-row">
      <div class="setting-label">${escapeHtml(pageText.visibleColumns)}</div>
      <div class="setting-content column-options">${columnOptionsHtml}</div>
    </div>
  </section>
  <main class="report-content">
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">${escapeHtml(metaText)}</div>
    <table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>
  </main>
  <script>
    (function () {
      var toggles = Array.prototype.slice.call(document.querySelectorAll('[data-column-toggle]'));
      var coefficientInput = document.getElementById('cost-coefficient');
      var printButton = document.getElementById('print-button');

      function syncColumns() {
        toggles.forEach(function (toggle) {
          var cells = document.querySelectorAll('[data-column="' + toggle.value + '"]');
          Array.prototype.forEach.call(cells, function (cell) {
            cell.hidden = !toggle.checked;
          });
        });
      }

      function syncCostValues() {
        if (!coefficientInput) return;
        var coefficient = Number(coefficientInput.value);
        var isValid = coefficientInput.value.trim() !== '' && Number.isFinite(coefficient);
        var formatter = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        var values = document.querySelectorAll('[data-cost-value]');
        Array.prototype.forEach.call(values, function (valueElement) {
          var rawValue = valueElement.getAttribute('data-cost-value');
          var cost = Number(rawValue);
          valueElement.textContent = isValid && rawValue !== '' && Number.isFinite(cost)
            ? '$' + formatter.format(cost * coefficient)
            : '--';
        });
      }

      toggles.forEach(function (toggle) {
        toggle.addEventListener('change', syncColumns);
      });
      if (coefficientInput) coefficientInput.addEventListener('input', syncCostValues);
      printButton.addEventListener('click', function () {
        if (!toggles.some(function (toggle) { return toggle.checked; })) {
          window.alert('${escapeHtml(pageText.emptyColumns)}');
          return;
        }
        if (coefficientInput && (coefficientInput.value.trim() === '' || !Number.isFinite(Number(coefficientInput.value)))) {
          window.alert('${escapeHtml(pageText.invalidCoefficient)}');
          coefficientInput.focus();
          return;
        }
        window.print();
      });

      syncColumns();
      syncCostValues();
    })();
  <\/script>
</body>
</html>
  `)
  printWindow.document.close()
  return true
}
