import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import test from 'node:test'

// Execute the real shared save handler with API mocks; never write to the database.
const source = fs.readFileSync(new URL('../src/views/wms/basic/item/index.vue', import.meta.url), 'utf8')
const start = source.indexOf('const submitForm = async () => {')
const end = source.indexOf('/** 从 getItemImages', start)
assert.ok(start >= 0 && end > start)
const handler = source.slice(start, end).replace('const submitForm =', 'globalThis.submitForm =')

function setup(editing, skuCode) {
  const calls = [], validated = [], errors = []
  const capture = kind => async payload => {
    calls.push({ kind, payload: JSON.parse(JSON.stringify(payload)) })
    return { data: { id: 123 } }
  }
  const context = {
    form: { value: { id: editing ? 123 : undefined, skuCode, itemBrand: 1, costPrice: 263, sellingPrice: 473.4 } },
    skuForm: { itemSkuList: [{ id: 1, skuCode: 'old' }, { id: 2, skuCode: '  AB 123 \t' }] },
    itemFormRef: { value: { validate: async () => {
      validated.push(context.form.value.skuCode)
      if (!context.form.value.skuCode) throw new Error('required')
    } } },
    scrollToFirstFormError: () => errors.push('required'),
    hasRequiredItemImage: () => true,
    validateItemImagesOnNextTick: () => {},
    canEditCostPrice: { value: true }, canEditSellingPrice: { value: true },
    hasUploadingImages: { value: false }, buttonLoading: { value: false },
    normalizeUploadedImageMeta: () => {}, bagDimensionsToInch: () => ({}), itemRelationPayload: () => ({}),
    serializeAuthAgency: value => value, serializeExteriorMaterial: value => value,
    resolveEnglishOption: value => value, COUNTRY_OF_ORIGIN_OPTIONS: [], buildImageListPayload: () => [],
    pendingImageFiles: { value: [] }, dialog: { visible: true }, refreshListAfterSave: () => {},
    proxy: { $modal: { msgSuccess: () => {}, msgError: message => errors.push(message), msgWarning: () => {} } },
    tr: text => text, addItem: capture('add'), updateItem: capture('update')
  }
  vm.createContext(context)
  vm.runInContext(handler, context)
  return { context, calls, validated, errors }
}

for (const editing of [false, true]) {
  const mode = editing ? 'edit' : 'create'
  for (const [label, input, expected] of [
    ['trims surrounding whitespace', ' \tLV3891 \n', 'LV3891'],
    ['preserves internal spaces and case', '  Lv 3891  ', 'Lv 3891'],
    ['keeps clean SKU unchanged', 'LV3891', 'LV3891']
  ]) {
    test(`${mode}: ${label}`, async () => {
      const { context, calls, validated, errors } = setup(editing, input)
      await context.submitForm()
      assert.deepEqual(errors, [])
      assert.deepEqual(validated, [expected])
      assert.equal(calls.length, 1)
      assert.equal(calls[0].kind, editing ? 'update' : 'add')
      assert.equal(calls[0].payload.skuCode, expected)
      assert.equal(calls[0].payload.sku[0].skuCode, expected)
      assert.equal(calls[0].payload.sku[1].skuCode, 'AB 123')
      assert.equal(calls[0].payload.sku[0].costPrice, 263)
      assert.equal(calls[0].payload.sku[0].sellingPrice, 473.4)
      assert.equal(context.buttonLoading.value, false)
    })
  }
  for (const input of [' \t\n ', '', undefined, null]) {
    test(`${mode}: rejects blank SKU ${JSON.stringify(input)}`, async () => {
      const { context, calls, validated, errors } = setup(editing, input)
      await context.submitForm()
      assert.deepEqual(validated, [''])
      assert.equal(calls.length, 0)
      assert.deepEqual(errors, ['required'])
    })
  }
}
