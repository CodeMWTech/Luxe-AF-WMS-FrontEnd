const LA_TIME_ZONE = 'America/Los_Angeles'

function pad2(value) {
  return String(value).padStart(2, '0')
}

function getDateParts(time, withTime = true) {
  if (!time) return null
  let value = time
  if (typeof value === 'string') {
    value = value.replace(/-/g, '/').replace('T', ' ').replace(/\.\d{3}.*/, '')
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const options = {
    timeZone: LA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }
  if (withTime) {
    Object.assign(options, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    })
  }

  const parts = new Intl.DateTimeFormat('en-US', options)
    .formatToParts(date)
    .reduce((acc, part) => {
      acc[part.type] = part.value
      return acc
    }, {})

  return parts
}

export function formatLosAngelesTime(time) {
  const parts = getDateParts(time, true)
  if (!parts) return '-'
  return `${parts.month}/${parts.day}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`
}

export function formatLosAngelesDate(time) {
  const parts = getDateParts(time, false)
  if (!parts) return '-'
  return `${parts.month}/${parts.day}/${parts.year}`
}

export function formatDateForQuery(time) {
  if (!time) return undefined
  const date = time instanceof Date ? time : new Date(time)
  if (Number.isNaN(date.getTime())) return undefined
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function formatDateTimeForQuery(time) {
  if (!time) return undefined
  const date = time instanceof Date ? time : new Date(time)
  if (Number.isNaN(date.getTime())) return undefined
  return `${formatDateForQuery(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}
