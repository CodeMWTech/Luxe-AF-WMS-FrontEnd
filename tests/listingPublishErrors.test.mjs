import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/views/wms/platform/listings/components/PublishDialog.vue', import.meta.url), 'utf8')
const submitSource = source.slice(source.indexOf('async function doPublish()'), source.indexOf('const preSelectedSkuIds'))

// Execute the real submit handler with API and UI boundaries replaced.
function fixture() {
  const calls = { requests: [], success: [], errors: [], emitted: [], scrolls: 0 }
  const state = { error: null, duringRequest: null }
  const ref = value => ({ value })
  const deps = {
    previewLoading: ref(false),
    previewList: ref([{ skuId: '2097890900433653761', skuCode: 'DR995', overrideTitle: 'Bag', overridePrice: 100 }]),
    isWhatnotPublish: ref(true), isTiktokPublish: ref(false),
    hasWhatnotPreviewErrors: ref(false), hasEbayTitleTooLong: ref(false),
    hasTiktokPriceInvalid: ref(false), hasMissingTiktokBrand: ref(false),
    hasBelowSellingPrice: ref(false),
    chosenTemplateId: ref(1), chosenShopId: ref(2),
    publishing: ref(false), publishError: ref(''), visible: ref(true),
    publishErrorRef: ref({ $el: { scrollIntoView() { calls.scrolls++ } } }),
    nextTick: async () => {},
    t: key => key,
    proxy: { $modal: { msgSuccess: value => calls.success.push(value), msgError: value => calls.errors.push(value) } },
    emit: event => calls.emitted.push(event),
    batchPublish: async (body, config) => {
      calls.requests.push({ body, config })
      state.duringRequest?.()
      if (state.error != null) throw state.error
    }
  }
  const doPublish = new Function(...Object.keys(deps), submitSource + '; return doPublish')(...Object.values(deps))
  return { ...deps, doPublish, calls, state }
}

test('a batch failure retains every SKU error and keeps the dialog open without a duplicate toast', async () => {
  const h = fixture()
  const lines = Array.from({ length: 20 }, (_, i) => 'SKU DR' + (995 + i) + ' 已有该 Whatnot 店铺的上架记录')
  const message = '本批次未提交\n' + lines.join('\n')
  h.state.error = new Error(message)
  await h.doPublish()
  assert.equal(h.publishError.value, message)
  assert.equal(h.visible.value, true)
  assert.equal(h.publishing.value, false)
  assert.deepEqual(h.calls.errors, [])
  assert.deepEqual(h.calls.success, [])
  assert.deepEqual(h.calls.emitted, [])
  assert.equal(h.calls.scrolls, 1)
  assert.equal(h.calls.requests[0].config.silentError, true)
  assert.deepEqual(h.calls.requests[0].body.skuIds, ['2097890900433653761'])
})

test('retry clears stale errors and successful submission closes the dialog', async () => {
  const h = fixture()
  h.state.error = new Error('SKU DR995 已有上架记录')
  await h.doPublish()
  h.state.error = null
  h.state.duringRequest = () => {
    assert.equal(h.publishError.value, '')
    assert.equal(h.publishing.value, true)
  }
  await h.doPublish()
  assert.equal(h.visible.value, false)
  assert.equal(h.publishing.value, false)
  assert.deepEqual(h.calls.emitted, ['success'])
  assert.equal(h.calls.success.length, 1)
})

test('network and non-Error failures remain visible and allow retry', async () => {
  for (const [error, expected] of [
    [new Error('Network Error'), 'Network Error'],
    ['Session expired', 'Session expired'],
    [409, 'platformListings.publishFailed']
  ]) {
    const h = fixture()
    h.state.error = error
    await h.doPublish()
    assert.equal(h.publishError.value, expected)
    assert.equal(h.visible.value, true)
    assert.equal(h.publishing.value, false)
  }
})

test('other platforms retain their successful submit behavior', async () => {
  const h = fixture()
  h.isWhatnotPublish.value = false
  await h.doPublish()
  assert.equal(h.visible.value, false)
  assert.deepEqual(h.calls.success, ['platformListings.publishSuccess'])
})
