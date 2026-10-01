import { parsePhoneNumberFromString, getCountries, getCountryCallingCode } from 'libphonenumber-js/max'

export { getCountries, getCountryCallingCode }

// Shared by the form component and regression tests. No implicit default country here.
export function inspectPhone(raw, country, extension = '', allowExtension = false) {
  const text = String(raw || '').trim()
  if (!text && !extension) return { value: '', phone: null }
  if (text.length > 64) return { error: 'tooLong' }
  if (!text) return { error: 'missingNumber' }
  if (!/^\+?[0-9\s().-]+(?:(?:ext\.?|x|#)\s*[0-9]{1,8})?$/i.test(text)) return { error: 'invalid' }
  if (!text.startsWith('+') && !country) return { error: 'country' }
  const phone = parsePhoneNumberFromString(text, { defaultCountry: country || undefined, extract: false })
  if (!phone) return { error: 'invalid' }
  const ext = String(extension || phone.ext || '').trim()
  if (ext && !allowExtension) return { error: 'extension' }
  if (ext && !/^[0-9]{1,8}$/.test(ext)) return { error: 'extensionLength' }
  if (!phone.isPossible()) return { error: 'length' }
  if (!phone.isValid()) return { error: 'invalid' }
  return { value: phone.number + (ext ? ` ext. ${ext}` : ''), phone, extension: ext }
}
