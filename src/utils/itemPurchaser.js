import useSettingsStore from '@/store/modules/settings'

/** 新增、修改和筛选共用的采购人。已有商品上的旧文本不在这里改写。选项本身保持字符串，和 main 一致。 */
export const PURCHASER_OPTIONS = [
  'TK1 - Nana',
  'TK2 - Maggie',
  'TK3 - Yuki',
  'Ebay 1',
  'Ebay 2 - Dee',
  'Ebay 3 - Sally',
  'Whole Company',
  'Others'
]

const PURCHASER_ZH = {
  'Whole Company': '全公司',
  Others: '其他'
}

export function purchaserLabel(value, isEn) {
  const zh = PURCHASER_ZH[value]
  if (!zh || isEn) return value || ''
  return `${zh} ${value}`
}

export function purchaserAliases(value) {
  const zh = PURCHASER_ZH[value]
  return zh ? [value, zh] : [value]
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
        return purchaserAliases(item).concat(purchaserLabel(item, isEn))
          .some(text => String(text || '').toLowerCase().includes(query))
      })
      .map(value => ({ value, label: purchaserLabel(value, isEn) }))
  )
}
