// Business-page display only; keep supplierName intact for legal names and Invoice headers.
export function supplierDisplayName(supplier) {
  return String(supplier?.supplierShortName ?? '').trim() || String(supplier?.supplierName ?? '').trim()
}
