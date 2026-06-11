export const WMS_EXPORT_HEADER_MAP = {
  '\u5546\u54c1\u540d\u79f0': 'Item Name',
  '\u5546\u54c1\u56fe\u7247': 'Item Image',
  'SKU\u7f16\u53f7': 'SKU Code',
  'SKU\u7f16\u7801': 'SKU Code',
  '\u5206\u7c7b': 'Category',
  '\u5546\u54c1\u5206\u7c7b': 'Item Category',
  '\u54c1\u724c': 'Brand',
  '\u5546\u54c1\u54c1\u724c': 'Item Brand',
  '\u6210\u8272': 'Condition',
  '\u5e74\u4efd': 'Year',
  '\u6210\u672c\u4ef7': 'Cost Price',
  '\u9500\u552e\u4ef7': 'Selling Price',
  '\u6750\u8d28': 'Material',
  '\u7455\u75b5': 'Defect',
  '\u7f3a\u9677': 'Defect',
  '\u914d\u4ef6': 'Accessories',
  '\u62a4\u7406': 'Care',
  '\u662f\u5426\u5df2\u62a4\u7406': 'Cared',
  '\u9274\u5b9a\u673a\u6784': 'Agency',
  '\u5bc4\u552e\u4fe1\u606f': 'Consignment Info',
  '\u9ed8\u8ba4\u6570\u91cf': 'Default Qty',
  '\u5907\u6ce8': 'Remark',
  '\u521b\u5efa\u4eba': 'Creator',
  '\u521b\u5efa\u65f6\u95f4': 'Created At',
  '\u72b6\u6001': 'Status',
  '\u4ed3\u5e93': 'Warehouse',
  '\u6e90\u4ed3\u5e93': 'Source Warehouse',
  '\u76ee\u6807\u4ed3\u5e93': 'Target Warehouse',
  '\u5e93\u5b58\u6570\u91cf': 'Stock Qty',
  '\u5165\u5e93\u65f6\u95f4': 'Inbound Time',
  '\u51fa\u5e93\u65f6\u95f4': 'Outbound Time',
  '\u5468\u8f6c\u5929\u6570': 'Turnover Days',
  '\u5e73\u5747\u6210\u672c\u4ef7': 'Avg Cost Price',
  '\u5e73\u5747\u9500\u552e\u4ef7': 'Avg Selling Price',
  '\u5229\u6da6': 'Profit',
  '\u5355\u53f7': 'Order No.',
  '\u8ba2\u5355\u53f7': 'Order No.',
  '\u4e1a\u52a1\u5355\u53f7': 'Business Order No.',
  '\u5165\u5e93\u5355\u53f7': 'Inbound Order No.',
  '\u51fa\u5e93\u5355\u53f7': 'Outbound Order No.',
  '\u79fb\u5e93\u5355\u53f7': 'Transfer Order No.',
  '\u76d8\u5e93\u5355\u53f7': 'Stocktake Order No.',
  '\u64cd\u4f5c\u5355\u53f7': 'Operation No.',
  '\u6570\u91cf': 'Quantity',
  '\u91d1\u989d': 'Amount',
  '\u91d1\u989d($)': 'Amount($)',
  '\u91d1\u989d($USD)': 'Amount ($USD)',
  '\u603b\u6570\u91cf': 'Total Quantity',
  '\u603b\u91d1\u989d': 'Total Amount',
  '\u5165\u5e93\u72b6\u6001': 'Inbound Status',
  '\u51fa\u5e93\u72b6\u6001': 'Outbound Status',
  '\u79fb\u5e93\u72b6\u6001': 'Transfer Status',
  '\u76d8\u5e93\u72b6\u6001': 'Stocktake Status',
  '\u5165\u5e93\u7c7b\u578b': 'Inbound Type',
  '\u51fa\u5e93\u7c7b\u578b': 'Outbound Type',
  '\u64cd\u4f5c\u65f6\u95f4': 'Operation Time',
  '\u64cd\u4f5c\u4eba': 'Operator',
  '\u66f4\u65b0\u65f6\u95f4': 'Updated At',
  '\u66f4\u65b0\u4eba': 'Updated By',
  '\u5e73\u53f0': 'Platform',
  '\u8d27\u4e3b': 'Owner',
  '\u5546\u6237': 'Merchant',
  '\u6761\u7801': 'Barcode',
  '\u5305\u578b': 'Model'
}

export function getExportLanguagePayload(isEnglish) {
  const language = isEnglish ? 'en' : 'zh-cn'
  return {
    language,
    lang: language,
    locale: language,
    contentLanguage: isEnglish ? 'en_US' : 'zh_CN'
  }
}

export function getExportLanguageHeaders(isEnglish) {
  return {
    'Content-Language': isEnglish ? 'en_US' : 'zh_CN',
    'Accept-Language': isEnglish ? 'en-US,en;q=0.9' : 'zh-CN,zh;q=0.9'
  }
}

export function downloadXlsx(data, filename) {
  const blob = data instanceof Blob
    ? data
    : new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c >>> 0
  }
  return table
})()

function crc32(data) {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function readUInt16(data, offset) {
  return data[offset] | (data[offset + 1] << 8)
}

function readUInt32(data, offset) {
  return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0
}

function writeUInt16(target, offset, value) {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
}

function writeUInt32(target, offset, value) {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
  target[offset + 2] = (value >>> 16) & 0xff
  target[offset + 3] = (value >>> 24) & 0xff
}

function findEndOfCentralDirectory(data) {
  const minOffset = Math.max(0, data.length - 0xffff - 22)
  for (let offset = data.length - 22; offset >= minOffset; offset--) {
    if (readUInt32(data, offset) === 0x06054b50) return offset
  }
  return -1
}

async function inflateRaw(data) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Failed to export file')
  }
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function getZipEntryContent(zipData, entry) {
  const compressed = zipData.slice(entry.dataOffset, entry.dataOffset + entry.compressedSize)
  if (entry.method === 0) return compressed
  if (entry.method === 8) return inflateRaw(compressed)
  throw new Error('Failed to export file')
}

function replaceHeaderText(xmlText, headerMap) {
  let next = xmlText
  Object.entries(headerMap).forEach(([source, target]) => {
    next = next.split(source).join(target)
  })
  return next
}

function parseZipEntries(zipData) {
  const decoder = new TextDecoder()
  const endOffset = findEndOfCentralDirectory(zipData)
  if (endOffset < 0) throw new Error('Failed to export file')

  const entryCount = readUInt16(zipData, endOffset + 10)
  let centralOffset = readUInt32(zipData, endOffset + 16)
  const entries = []

  for (let i = 0; i < entryCount; i++) {
    if (readUInt32(zipData, centralOffset) !== 0x02014b50) throw new Error('Failed to export file')

    const flags = readUInt16(zipData, centralOffset + 8)
    const method = readUInt16(zipData, centralOffset + 10)
    const crc = readUInt32(zipData, centralOffset + 16)
    const compressedSize = readUInt32(zipData, centralOffset + 20)
    const uncompressedSize = readUInt32(zipData, centralOffset + 24)
    const nameLength = readUInt16(zipData, centralOffset + 28)
    const extraLength = readUInt16(zipData, centralOffset + 30)
    const commentLength = readUInt16(zipData, centralOffset + 32)
    const localHeaderOffset = readUInt32(zipData, centralOffset + 42)
    const nameBytes = zipData.slice(centralOffset + 46, centralOffset + 46 + nameLength)
    const name = decoder.decode(nameBytes)

    if (readUInt32(zipData, localHeaderOffset) !== 0x04034b50) throw new Error('Failed to export file')
    const localNameLength = readUInt16(zipData, localHeaderOffset + 26)
    const localExtraLength = readUInt16(zipData, localHeaderOffset + 28)
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength

    entries.push({
      name,
      nameBytes,
      flags,
      method,
      crc,
      compressedSize,
      uncompressedSize,
      dataOffset
    })

    centralOffset += 46 + nameLength + extraLength + commentLength
  }

  return entries
}

function concatUint8Arrays(parts, totalLength) {
  const result = new Uint8Array(totalLength)
  let offset = 0
  parts.forEach(part => {
    result.set(part, offset)
    offset += part.length
  })
  return result
}

function buildZip(entries) {
  const localParts = []
  const centralParts = []
  let offset = 0

  entries.forEach(entry => {
    const localHeader = new Uint8Array(30 + entry.nameBytes.length)
    writeUInt32(localHeader, 0, 0x04034b50)
    writeUInt16(localHeader, 4, 20)
    writeUInt16(localHeader, 6, entry.flags & ~0x08)
    writeUInt16(localHeader, 8, entry.method)
    writeUInt32(localHeader, 14, entry.crc)
    writeUInt32(localHeader, 18, entry.compressedSize)
    writeUInt32(localHeader, 22, entry.uncompressedSize)
    writeUInt16(localHeader, 26, entry.nameBytes.length)
    localHeader.set(entry.nameBytes, 30)
    localParts.push(localHeader, entry.compressedData)

    const centralHeader = new Uint8Array(46 + entry.nameBytes.length)
    writeUInt32(centralHeader, 0, 0x02014b50)
    writeUInt16(centralHeader, 4, 20)
    writeUInt16(centralHeader, 6, 20)
    writeUInt16(centralHeader, 8, entry.flags & ~0x08)
    writeUInt16(centralHeader, 10, entry.method)
    writeUInt32(centralHeader, 16, entry.crc)
    writeUInt32(centralHeader, 20, entry.compressedSize)
    writeUInt32(centralHeader, 24, entry.uncompressedSize)
    writeUInt16(centralHeader, 28, entry.nameBytes.length)
    writeUInt32(centralHeader, 42, offset)
    centralHeader.set(entry.nameBytes, 46)
    centralParts.push(centralHeader)

    offset += localHeader.length + entry.compressedData.length
  })

  const centralOffset = offset
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const endHeader = new Uint8Array(22)
  writeUInt32(endHeader, 0, 0x06054b50)
  writeUInt16(endHeader, 8, entries.length)
  writeUInt16(endHeader, 10, entries.length)
  writeUInt32(endHeader, 12, centralSize)
  writeUInt32(endHeader, 16, centralOffset)

  const totalLength = offset + centralSize + endHeader.length
  return concatUint8Arrays([...localParts, ...centralParts, endHeader], totalLength)
}

export async function translateXlsxHeaders(blobData, headerMap = WMS_EXPORT_HEADER_MAP) {
  const zipData = new Uint8Array(await blobData.arrayBuffer())
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const entries = parseZipEntries(zipData)

  const translatedEntries = await Promise.all(entries.map(async entry => {
    const shouldTranslate = /^xl\/(sharedStrings|worksheets\/.*)\.xml$/i.test(entry.name)
    if (!shouldTranslate) {
      return {
        ...entry,
        compressedData: zipData.slice(entry.dataOffset, entry.dataOffset + entry.compressedSize)
      }
    }

    const content = await getZipEntryContent(zipData, entry)
    const xmlText = decoder.decode(content)
    const translatedText = replaceHeaderText(xmlText, headerMap)
    if (translatedText === xmlText) {
      return {
        ...entry,
        compressedData: zipData.slice(entry.dataOffset, entry.dataOffset + entry.compressedSize)
      }
    }

    const translatedData = encoder.encode(translatedText)
    return {
      ...entry,
      method: 0,
      crc: crc32(translatedData),
      compressedSize: translatedData.length,
      uncompressedSize: translatedData.length,
      compressedData: translatedData
    }
  }))

  return buildZip(translatedEntries)
}

export async function prepareLanguageXlsx(blobData, isEnglish, headerMap = WMS_EXPORT_HEADER_MAP) {
  return isEnglish ? translateXlsxHeaders(blobData, headerMap) : blobData
}
