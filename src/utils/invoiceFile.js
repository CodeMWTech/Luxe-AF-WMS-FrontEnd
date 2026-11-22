export function invoiceFileName(name, date) {
  const safeName = String(name || '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim() || 'Invoice'
  const safeDate = String(date || '').slice(0, 10).replace(/\//g, '-')
  return safeDate ? `${safeName}_${safeDate}.pdf` : `${safeName}.pdf`
}
