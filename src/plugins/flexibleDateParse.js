import { dayjs } from 'element-plus'

const LONG_TOKENS = [
  ['YYYY', '\u0001'],
  ['MMMM', '\u0002'],
  ['MMM', '\u0003'],
  ['dddd', '\u0004'],
  ['ddd', '\u0005'],
  ['Do', '\u0006']
]

function replaceAll(text, from, to) {
  return String(text).split(from).join(to)
}

/** MM/DD/YYYY -> M/D/YYYY, so 8/9/2026 and 08/09/2026 both parse. */
export function relaxDateFormat(format) {
  if (!format || typeof format !== 'string') {
    return format
  }
  let out = format
  LONG_TOKENS.forEach(([token, mark]) => {
    out = replaceAll(out, token, mark)
  })
  out = replaceAll(out, 'MM', 'M')
  out = replaceAll(out, 'DD', 'D')
  out = replaceAll(out, 'HH', 'H')
  out = replaceAll(out, 'hh', 'h')
  out = replaceAll(out, 'mm', 'm')
  out = replaceAll(out, 'ss', 's')
  LONG_TOKENS.forEach(([token, mark]) => {
    out = replaceAll(out, mark, token)
  })
  return out
}

function applyFlexibleParse(option, dayjsClass) {
  const proto = dayjsClass.prototype
  if (proto.parse.__flexibleDateParse) {
    return
  }
  const originalParse = proto.parse
  proto.parse = function parseFlexibleDate(cfg) {
    originalParse.call(this, cfg)
    if (this.isValid()) {
      return
    }
    const args = cfg && cfg.args ? Array.from(cfg.args) : []
    const format = args[1]
    if (typeof cfg.date !== 'string' || typeof format !== 'string') {
      return
    }
    const relaxed = relaxDateFormat(format)
    if (!relaxed || relaxed === format) {
      return
    }
    args[1] = relaxed
    originalParse.call(this, Object.assign({}, cfg, { args }))
  }
  proto.parse.__flexibleDateParse = true
}

dayjs.extend(applyFlexibleParse)
