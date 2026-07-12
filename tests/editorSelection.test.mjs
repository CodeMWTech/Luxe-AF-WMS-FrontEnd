import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const moduleSource = await readFile(
  new URL('../src/utils/textSelection.js', import.meta.url),
  'utf8'
)
const moduleUrl = `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
const { insertTextIntoEditor } = await import(moduleUrl)

function createEditor({ range, savedRange, length = 12 }) {
  const calls = []
  return {
    calls,
    selection: { savedRange },
    getSelection: () => range,
    getLength: () => length,
    deleteText: (...args) => calls.push(['deleteText', ...args]),
    insertText: (...args) => calls.push(['insertText', ...args]),
    focus: () => calls.push(['focus']),
    setSelection: (...args) => calls.push(['setSelection', ...args])
  }
}

test('inserts into the editor at its current caret', () => {
  const editor = createEditor({ range: { index: 4, length: 0 } })

  assert.equal(insertTextIntoEditor(editor, '{brand}'), true)
  assert.deepEqual(editor.calls, [
    ['insertText', 4, '{brand}', 'user'],
    ['focus'],
    ['setSelection', 11, 0, 'silent']
  ])
})

test('replaces the editor selection and restores the caret', () => {
  const editor = createEditor({ range: { index: 2, length: 5 } })

  assert.equal(insertTextIntoEditor(editor, '{year}'), true)
  assert.deepEqual(editor.calls, [
    ['deleteText', 2, 5, 'user'],
    ['insertText', 2, '{year}', 'user'],
    ['focus'],
    ['setSelection', 8, 0, 'silent']
  ])
})

test('uses the editor saved range after focus leaves the editor', () => {
  const editor = createEditor({
    range: null,
    savedRange: { index: 6, length: 0 }
  })

  assert.equal(insertTextIntoEditor(editor, '{skuCode}'), true)
  assert.deepEqual(editor.calls, [
    ['insertText', 6, '{skuCode}', 'user'],
    ['focus'],
    ['setSelection', 15, 0, 'silent']
  ])
})

test('returns false when the editor is not available', () => {
  assert.equal(insertTextIntoEditor(null, '{brand}'), false)
})
