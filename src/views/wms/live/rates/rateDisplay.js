const labels = {
  ACTIVE: '生效中',
  PENDING: '待生效',
  EXPIRED: '已过期',
  DISABLED: '已停用',
  SUPERSEDED: '已被替代'
}

export function rateStatusLabel(rate) {
  return labels[rate.effectiveStatus] || '未生效'
}

export function rateStatusType(rate) {
  return rate.effectiveStatus === 'ACTIVE' ? 'success' : rate.effectiveStatus === 'PENDING' ? 'warning' : 'info'
}
