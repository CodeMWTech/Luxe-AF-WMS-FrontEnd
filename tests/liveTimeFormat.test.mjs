import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
const root = new URL('../src/views/wms/live/', import.meta.url)
const sharedUrl = 'data:text/javascript;base64,' + Buffer.from(await readFile(new URL('shared.js', root), 'utf8')).toString('base64')
const shared = await import(sharedUrl)
const smsSource = (await readFile(new URL('schedule/smsDisplay.js', root), 'utf8')).replace("'../shared'", JSON.stringify(sharedUrl))
const sms = await import('data:text/javascript;base64,' + Buffer.from(smsSource).toString('base64'))

test('business time boundaries use lowercase am/pm and retain minutes', () => {
  for (const [input, expected] of [['00:00:00', '12:00 am'], ['09:30', '09:30 am'], ['11:59:00', '11:59 am'], ['12:00:00', '12:00 pm'], ['17:30:00', '05:30 pm'], ['23:59:59', '11:59 pm'], [null, ''], ['', '']]) {
    assert.equal(shared.displayTime(input), expected)
  }
  assert.equal(shared.displayTime('17:30:42.123', true), '05:30:42 pm')
})

test('operation timestamps preserve their wall clock and supplied precision', () => {
  assert.equal(shared.displayDateTime('2026-10-17T17:30:42'), '10/17/2026 05:30:42 pm')
  assert.equal(shared.displayDateTime('2026-10-17 00:00:00'), '10/17/2026 12:00:00 am')
  assert.equal(shared.displayDateTime('2026-10-17T12:00'), '10/17/2026 12:00 pm')
  assert.equal(shared.displayDateTime(null), '')
  assert.equal(shared.displayDateTime('legacy value'), 'legacy value')
})

test('SMS timestamps retain UTC to Los Angeles conversion including DST boundaries', () => {
  assert.equal(sms.displayTimestamp('2026-10-17 00:30:00'), '10/16/2026 05:30 pm')
  assert.equal(sms.displayTimestamp('2026-10-17T00:30:00Z'), '10/16/2026 05:30 pm')
  assert.equal(sms.displayTimestamp('2026-01-17 20:00:00'), '01/17/2026 12:00 pm')
  assert.equal(sms.displayTimestamp('2026-03-08 09:59:00'), '03/08/2026 01:59 am')
  assert.equal(sms.displayTimestamp('2026-03-08 10:00:00'), '03/08/2026 03:00 am')
  assert.equal(sms.displayTimestamp('2026-11-01 08:30:00'), '11/01/2026 01:30 am')
  assert.equal(sms.displayTimestamp('2026-11-01 09:30:00'), '11/01/2026 01:30 am')
  assert.equal(sms.displayTimestamp(null), '-')
})
