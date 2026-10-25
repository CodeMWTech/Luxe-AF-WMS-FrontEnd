import useSettingsStore from '@/store/modules/settings'

/** 新增、修改和筛选共用的采购人。已有商品上的旧文本不在这里改写。 */
export const PURCHASER_OPTIONS = [
  { value: 'TK1 - Nana' },
  { value: 'TK2 - Maggie' },
  { value: 'TK3 - Yuki' },
  { value: 'Ebay 1' },
  { value: 'Ebay 2 - Dee' },
  { value: 'Ebay 3 - Sally' },
  { value: 'Whole Company', zh: '全公司' },
  { value: 'Others', zh: '其他' }
]

export function purchaserLabel(item, isEn) {
  if (!item?.zh || isEn) return item?.value || ''
  return `${item.zh} ${item.value}`
}

function purchaserIsEn() {
  return (useSettingsStore().language || 'zh-cn') === 'en'
}

export function suggestPurchasers(queryString, callback) {
  const isEn = purchaserIsEn()
  const query = String(queryString || '').trim().toLowerCase()
  callback(
    PURCHASER_OPTIONS
      .filter(item => {
        if (!query) return true
        const texts = [item.value, item.zh, purchaserLabel(item, isEn)]
        return texts.some(text => String(text || '').toLowerCase().includes(query))
      })
      .map(item => ({ value: item.value, label: purchaserLabel(item, isEn) }))
  )
}
