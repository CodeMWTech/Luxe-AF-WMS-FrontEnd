// Business-page display only; keep supplierName intact for legal names and Invoice headers.
export function supplierDisplayName(supplier) {
  const legalName = String(supplier?.supplierName ?? '').trim()
  const nickName = String(supplier?.supplierShortName ?? '').trim()

  if (!legalName) return nickName
  if (!nickName || nickName === legalName) return legalName
  return `${legalName}（${nickName}）`
}
