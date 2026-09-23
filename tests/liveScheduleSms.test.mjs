import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { parse, compileScript } from '@vue/compiler-sfc'
import * as vue from 'vue'

const asModule = source => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
const display = await asModule(await readFile(new URL('../src/views/wms/live/schedule/smsDisplay.js', import.meta.url), 'utf8'))
const validPreview = () => ({ previewId: 'preview-1', enabled: true, expiresAt: new Date(Date.now() + 900000).toISOString(), messages: [{ body: 'English schedule update', segments: 1 }], blocked: [] })

async function fixture(file = 'SmsNotifications.vue', api = {}, editable = true) {
  const source = await readFile(new URL(`../src/views/wms/live/schedule/${file}`, import.meta.url), 'utf8')
  const { descriptor } = parse(source)
  const compiled = compileScript(descriptor, { id: 'sms-test' }).content
  const modules = {
    vue: { ...vue, watch() {}, onBeforeUnmount() {}, getCurrentInstance: () => ({ proxy: { $modal: { msgSuccess() {}, confirm: async () => true } } }) },
    '../useLiveI18n': { useLiveI18n: () => ({ tr: text => text, isEn: vue.ref(false), messageNode: text => text }) },
    '@/utils/permission': { checkPermi: () => editable }, './smsDisplay': display,
    '@/api/wms/liveScheduleSms': {
      getPendingNotifications: async () => ({ data: { enabled: true, items: [], pendingCount: 0, scheduleStates: {} } }),
      previewNotifications: async () => ({ data: validPreview() }), ...api
    }
  }
  const create = new Function('modules', compiled
    .replace(/^import \{([^}]+)\} from ['"]([^'"]+)['"];?$/gm, (_, bindings, name) => `const {${bindings.replace(/\bas\b/g, ':')}} = modules[${JSON.stringify(name)}]`)
    .replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm, (_, binding, name) => `const ${binding} = modules[${JSON.stringify(name)}]`)
    .replace('export default', 'return'))
  const props = vue.reactive({ scope: { startDate: '2026-09-20', endDate: '2026-09-26', employeeId: '5' }, employees: [], open: true })
  return create(modules).setup(props, { expose() {}, emit() {} })
}

test('default selection includes eligible cancellations but excludes missing consent and blocked recipients', () => {
  assert.deepEqual(display.defaultEventSelection([
    { eventId: '11:1', eligible: true, action: 'NEW' },
    { eventId: '12:1', eligible: false, reason: 'No consent' },
    { eventId: '13:2', eligible: true, action: 'CANCEL' }
  ]), ['11:1', '13:2'])
})

test('preview cannot publish when disabled, empty, blocked, malformed or expired', () => {
  const preview = validPreview()
  assert.equal(display.canPublishPreview(preview), true)
  for (const extra of [{ enabled: false }, { messages: [] }, { blocked: [{ eventId: '1:2' }] }, { expiresAt: 'invalid' }, { expiresAt: new Date(Date.now() - 1).toISOString() }]) {
    assert.equal(display.canPublishPreview({ ...preview, ...extra }), false)
  }
})

test('individual event selection cannot include blocked recipients and invalidates previous preview', async () => {
  const page = await fixture()
  page.preview.value = validPreview()
  page.toggleEvent({ eventId: '11:1', eligible: true }, true)
  page.toggleEvent({ eventId: '11:1', eligible: true }, true)
  page.toggleEvent({ eventId: '12:1', eligible: false }, true)
  assert.deepEqual(page.selectedEventIds.value, ['11:1'])
  assert.equal(page.preview.value, null)
  page.toggleEvent({ eventId: '11:1', eligible: true }, false)
  assert.deepEqual(page.selectedEventIds.value, [])
})

test('an uncertain publication retries the same preview and idempotency key', async () => {
  const requests = []; let fail = true
  const page = await fixture('SmsNotifications.vue', { publishNotifications: async body => { requests.push(body); if (fail) throw Error('network timeout'); return { data: { batchId: 'batch-1' } } } })
  page.selectedEventIds.value = ['11:1']; await page.generatePreview(); await page.publish()
  assert.equal(page.publishUncertain.value, true)
  await page.openPublisher()
  fail = false; await page.publish()
  assert.equal(requests.length, 2)
  assert.deepEqual(requests[0], requests[1])
  assert.ok(requests[0].idempotencyKey)
  assert.equal(page.publishUncertain.value, false)
  assert.equal(page.preview.value, null)
})

test('an uncertain publication remains retryable after expiry and cannot be replaced by a new preview', async () => {
  const requests = []; let previews = 0, fail = true
  const page = await fixture('SmsNotifications.vue', {
    previewNotifications: async () => { previews++; return { data: validPreview() } },
    publishNotifications: async body => { requests.push(body); if (fail) throw Error('network timeout'); return { data: { batchId: 'existing', reused: true } } }
  })
  page.selectedEventIds.value = ['11:1']; await page.generatePreview(); await page.publish()
  page.preview.value.expiresAt = new Date(Date.now() - 1000).toISOString()
  page.now.value = Date.now()
  assert.equal(page.publishAllowed.value, true)
  page.publisherOpen.value = false; await page.openPublisher()
  page.invalidatePreview(); await page.refreshForPublisher(); await page.generatePreview()
  page.selectAll(false); page.toggleEvent({ eventId: '12:2', eligible: true }, true)
  assert.equal(previews, 1)
  assert.deepEqual(page.selectedEventIds.value, ['11:1'])
  assert.equal(page.preview.value.previewId, 'preview-1')
  fail = false; await page.publish()
  assert.deepEqual(requests[0], requests[1])
  assert.equal(page.pendingPublishRequest.value, null)
})

test('an explicit expired rejection releases the original request so a new preview can be created', async () => {
  let attempt = 0, previews = 0
  const page = await fixture('SmsNotifications.vue', {
    previewNotifications: async () => ({ data: { ...validPreview(), previewId: `preview-${++previews}` } }),
    publishNotifications: async () => { if (++attempt === 1) throw Error('network timeout'); throw Object.assign(new Error('Preview expired'), { publishRejected: true }) }
  })
  page.selectedEventIds.value = ['11:1']; await page.generatePreview(); await page.publish(); await page.publish()
  assert.equal(page.publishUncertain.value, false)
  assert.equal(page.pendingPublishRequest.value, null)
  await page.generatePreview()
  assert.equal(page.preview.value.previewId, 'preview-2')
})

test('scope invalidation during an in-flight publish cannot discard the request needed for recovery', async () => {
  let fail
  const page = await fixture('SmsNotifications.vue', { publishNotifications: () => new Promise((_resolve, reject) => { fail = reject }) })
  page.selectedEventIds.value = ['11:1']; await page.generatePreview()
  const pending = page.publish(); page.invalidatePreview(); fail(Error('network timeout')); await pending
  assert.equal(page.preview.value.previewId, 'preview-1')
  assert.equal(page.pendingPublishRequest.value.previewId, 'preview-1')
  assert.equal(page.publishAllowed.value, true)
})

test('publish API distinguishes explicit application rejection from an ambiguous transport failure', async () => {
  const source = await readFile(new URL('../src/api/wms/liveScheduleSms.js', import.meta.url), 'utf8')
  const client = request => new Function('request', source.replace(/^import .*$/m, '').replace(/\bexport /g, '') + '\nreturn publishNotifications')(request)
  await assert.rejects(client(async () => { throw Error('Preview expired') })({}), error => error.publishRejected === true)
  await assert.rejects(client(async () => { throw Object.assign(Error('gateway timeout'), { isAxiosError: true }) })({}), error => error.publishRejected !== true)
})

test('All records removes host and date scope while preserving explicit status filtering', async () => {
  const requests = []
  const page = await fixture('SmsRecordsDialog.vue', { listNotifications: async params => { requests.push(params); return { rows: [], total: 0 } } })
  await page.load()
  assert.equal(requests[0].startDate, '2026-09-20')
  assert.equal(requests[0].employeeId, '5')
  page.allRecords.value = true; page.status.value = 'UNKNOWN'; await page.load()
  assert.equal(requests[1].startDate, undefined)
  assert.equal(requests[1].endDate, undefined)
  assert.equal(requests[1].employeeId, undefined)
  assert.equal(requests[1].status, 'UNKNOWN')
})

test('double clicks do not start concurrent publications', async () => {
  let done, calls = 0
  const page = await fixture('SmsNotifications.vue', { publishNotifications: async () => { calls++; await new Promise(resolve => { done = resolve }) } })
  page.selectedEventIds.value = ['11:1']; await page.generatePreview()
  const first = page.publish(); await page.publish()
  assert.equal(calls, 1); done(); await first
})

test('a preview response for superseded selection cannot re-enable publishing', async () => {
  let done
  const page = await fixture('SmsNotifications.vue', { previewNotifications: () => new Promise(resolve => { done = resolve }) })
  page.selectedEventIds.value = ['11:1']; const pending = page.generatePreview()
  page.invalidatePreview(); done({ data: validPreview() }); await pending
  assert.equal(page.preview.value, null)
  assert.equal(page.publishAllowed.value, false)
})

test('read-only users cannot publish or open a recipient editor', async () => {
  let calls = 0
  const page = await fixture('SmsNotifications.vue', { publishNotifications: async () => { calls++ } }, false)
  page.preview.value = validPreview(); await page.publish(); await page.openPublisher(); page.openRecipient('1')
  assert.equal(calls, 0); assert.equal(page.publisherOpen.value, false); assert.equal(page.recipientOpen.value, false)
})

test('Pacific timestamps handle DST and do not use the browser local timezone', () => {
  assert.match(display.formatPacificInstant('2026-11-01T08:30:00Z', true), /1:30 AM PDT/)
  assert.match(display.formatPacificInstant('2026-11-01T09:30:00Z', true), /1:30 AM PST/)
  assert.equal(display.formatPacificInstant('2026-09-24 14:00:00', true), '2026-09-24 14:00:00')
  assert.equal(display.formatPacificInstant(null), '—')
})

test('recipient enablement requires explicit consent and source and cannot override STOP', () => {
  const form = { phone: '+12135550100', enabled: true, consentConfirmed: false, consentSource: 'Existing record' }
  assert.equal(display.canSaveRecipient(form), false)
  form.consentConfirmed = true; assert.equal(display.canSaveRecipient(form), true)
  assert.equal(display.canSaveRecipient(form, true), false)
  form.consentSource = ' '; assert.equal(display.canSaveRecipient(form), false)
  form.enabled = false; assert.equal(display.canSaveRecipient(form, true), true)
})

test('result reconciliation requires evidence and validates Message SID before association', () => {
  assert.equal(display.validResolution({ action: 'CONFIRM_NOT_SENT', note: '' }), false)
  assert.equal(display.validResolution({ action: 'CONFIRM_NOT_SENT', note: 'Checked provider logs' }), true)
  assert.equal(display.validResolution({ action: 'ASSOCIATE_SID', note: 'Checked provider logs', messageSid: 'not-a-sid' }), false)
  assert.equal(display.validResolution({ action: 'ASSOCIATE_SID', note: 'Checked provider logs', messageSid: 'SM' + 'a'.repeat(32) }), true)
  assert.equal(display.validResolution({ action: 'RESEND', note: 'Checked provider logs' }), false)
  assert.equal(display.validResolution({ action: 'CONFIRM_NOT_SENT', note: 'a'.repeat(801) }), false)
})

test('delivery and publication labels never imply read receipts or shift acceptance', () => {
  assert.equal(display.messageStatusLabels.DELIVERED, '已送达')
  assert.equal(display.notificationStateLabels.PUBLISHED, '短信已提交')
  assert.notEqual(display.notificationStateLabels.PUBLISHED, '已确认')
})
