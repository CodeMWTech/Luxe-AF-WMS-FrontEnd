/** 新增、修改和筛选共用的采购人。已有商品上的旧文本不在这里改写。 */
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

export function suggestPurchasers(queryString, callback) {
  const query = String(queryString || '').trim().toLowerCase()
  callback(
    PURCHASER_OPTIONS
      .filter(item => !query || item.toLowerCase().includes(query))
      .map(value => ({ value }))
  )
}
