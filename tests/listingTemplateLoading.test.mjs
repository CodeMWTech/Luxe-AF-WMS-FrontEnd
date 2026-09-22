import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/views/wms/platform/listings/template.vue', import.meta.url), 'utf8')
const functions = source.slice(source.indexOf('function invalidateTemplateDetail()'), source.indexOf('function isPositiveValue('))

function createHarness() {
  const pending = new Map()
  const form = { id: null }
  const dialog = { visible: false, title: '', isEdit: false }
  const templateDetailLoading = { value: false }
  const templateSaveDisabled = { get value() { return templateDetailLoading.value || (dialog.isEdit && !form.id) } }
  const errors = []
  let saves = 0
  const dependencies = {
    form, dialog, templateDetailLoading, templateSaveDisabled,
    resetForm: () => { for (const key of Object.keys(form)) delete form[key]; form.id = null },
    filterShops: () => {}, clearFormValidate: () => {}, t: key => key,
    getTemplate: id => new Promise((resolve, reject) => pending.set(id, { resolve, reject })),
    proxy: { $modal: { msgError: message => errors.push(message) } },
    formRef: { value: { validate: callback => callback(true) } },
    submitValidatedForm: () => { saves++ }
  }
  const factory = new Function(...Object.keys(dependencies), `let templateDetailSequence = 0; ${functions}; return { handleEdit, handleAdd, invalidateTemplateDetail, submitForm }`)
  const actions = factory(...Object.values(dependencies))
  const detail = (id, shopId) => ({ data: { id, shopId, platform: 'SHOPIFY', status: 'ENABLED', whatnotLocationId: 'loc-' + shopId, whatnotPublicationId: 'pub-' + shopId, whatnotAutoPublishConfirmed: true } })
  return { ...actions, form, dialog, templateDetailLoading, templateSaveDisabled, pending, errors, detail, get saves() { return saves } }
}

const flush = () => new Promise(resolve => setImmediate(resolve))

test('a late detail response cannot replace a newer template and shop selection', async () => {
  const h = createHarness()
  h.handleEdit({ id: 'A' })
  h.dialog.visible = false
  h.invalidateTemplateDetail()
  h.handleEdit({ id: 'B' })
  h.pending.get('B').resolve(h.detail('B', 'shop-B'))
  await flush()
  assert.equal(h.form.id, 'B')
  assert.equal(h.form.whatnotLocationId, 'loc-shop-B')
  h.pending.get('A').resolve(h.detail('A', 'shop-A'))
  await flush()
  assert.equal(h.form.id, 'B')
  assert.equal(h.form.shopId, 'shop-B')
  assert.equal(h.form.whatnotPublicationId, 'pub-shop-B')
})

test('opening a new template invalidates the previous edit response', async () => {
  const h = createHarness()
  h.handleEdit({ id: 'A' })
  h.handleAdd()
  h.pending.get('A').resolve(h.detail('A', 'shop-A'))
  await flush()
  assert.equal(h.form.id, null)
  assert.equal(h.dialog.isEdit, false)
  assert.equal(h.templateDetailLoading.value, false)
})

test('saving is blocked while detail loads and enabled after a valid detail response', async () => {
  const h = createHarness()
  h.handleEdit({ id: 'A' })
  h.submitForm()
  assert.equal(h.saves, 0)
  assert.equal(h.templateSaveDisabled.value, true)
  h.pending.get('A').resolve(h.detail('A', 'shop-A'))
  await flush()
  assert.equal(h.templateSaveDisabled.value, false)
  h.submitForm()
  assert.equal(h.saves, 1)
})

test('failed detail loading leaves the empty edit form unsaveable', async () => {
  const h = createHarness()
  h.handleEdit({ id: 'A' })
  h.pending.get('A').reject(new Error('Network unavailable'))
  await flush()
  assert.equal(h.templateDetailLoading.value, false)
  assert.equal(h.templateSaveDisabled.value, true)
  h.submitForm()
  assert.equal(h.saves, 0)
  assert.equal(h.errors.length, 1)
})

test('an obsolete response cannot release the current loading and save protection', async () => {
  const h = createHarness()
  h.handleEdit({ id: 'A' })
  h.handleEdit({ id: 'B' })
  h.pending.get('A').resolve(h.detail('A', 'shop-A'))
  await flush()
  assert.equal(h.templateDetailLoading.value, true)
  assert.equal(h.templateSaveDisabled.value, true)
  assert.equal(h.form.id, null)
  h.pending.get('B').resolve(h.detail('B', 'shop-B'))
  await flush()
  assert.equal(h.form.id, 'B')
})
