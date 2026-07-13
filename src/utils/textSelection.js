export function insertTextAtSelection(value, text, selectionStart, selectionEnd) {
  const currentValue = value || ''
  const insertedText = text || ''
  const valueLength = currentValue.length
  const start = normalizeOffset(selectionStart, valueLength, valueLength)
  const end = normalizeOffset(selectionEnd, valueLength, start)
  const selectionFrom = Math.min(start, end)
  const selectionTo = Math.max(start, end)

  return {
    value: currentValue.slice(0, selectionFrom) + insertedText + currentValue.slice(selectionTo),
    cursor: selectionFrom + insertedText.length
  }
}

export function insertTextIntoEditor(editor, text) {
  if (!editor) {
    return false
  }

  const range = editor.getSelection() || editor.selection?.savedRange
  const contentEnd = Math.max(0, editor.getLength() - 1)
  const index = Math.max(0, Math.min(range?.index ?? contentEnd, contentEnd))
  const selectionLength = Math.max(
    0,
    Math.min(range?.length || 0, contentEnd - index)
  )

  if (selectionLength > 0) {
    editor.deleteText(index, selectionLength, 'user')
  }
  editor.insertText(index, text, 'user')
  editor.focus()
  editor.setSelection(index + text.length, 0, 'silent')
  return true
}

function normalizeOffset(offset, max, fallback) {
  if (!Number.isInteger(offset)) {
    return fallback
  }
  return Math.min(Math.max(offset, 0), max)
}
