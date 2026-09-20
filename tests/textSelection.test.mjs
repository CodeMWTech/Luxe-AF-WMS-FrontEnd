import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const moduleSource = await readFile(
  new URL('../src/utils/textSelection.js', import.meta.url),
  'utf8'
)
const moduleUrl = `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
const { insertTextAtSelection } = await import(moduleUrl)

test('inserts text at the current caret position', () => {
  assert.deepEqual(insertTextAtSelection('Gucci Bag', '{brand}', 6, 6), {
    value: 'Gucci {brand}Bag',
    cursor: 13
  })
})

test('replaces the current selection', () => {
  assert.deepEqual(insertTextAtSelection('Gucci Bag', '{itemName}', 6, 9), {
    value: 'Gucci {itemName}',
    cursor: 16
  })
})

test('appends text when no valid selection is available', () => {
  assert.deepEqual(insertTextAtSelection('Gucci Bag', '{year}'), {
    value: 'Gucci Bag{year}',
    cursor: 15
  })
})
