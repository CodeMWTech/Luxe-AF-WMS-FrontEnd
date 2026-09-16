export const idKey = value => value == null ? '' : String(value)
export const timeLabel = value => String(value || '').slice(0, 5)
export const isActiveOperator = employee => employee.visible !== false && employee.employeeStatus != null && [0, 1].includes(Number(employee.employeeStatus)) &&
  Array.isArray(employee.positions) && employee.positions.some(position => ['运营', '直播运营'].includes(position))

function assignments(row) {
  return [...(row.operatorAssignments || [])].filter(a => a.employeeId != null && a.startTime && a.endTime)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

function partition(row, start, end) {
  if (!start || !end || start >= end) return []
  const operators = assignments(row)
  const points = [...new Set([start, end, ...operators.flatMap(a => [a.startTime, a.endTime]).filter(t => t > start && t < end)])].sort()
  return points.slice(0, -1).map((point, index) => {
    const next = points[index + 1]
    const operator = operators.find(a => a.startTime <= point && a.endTime >= next)
    return { row, operator, startTime: point, endTime: next }
  })
}

export function scheduleSegments(row, view) {
  // 单运营覆盖全场时，主播到岗前后也保持同一颜色，无需额外运营时段。
  const assigned = assignments(row)
  if (assigned.length === 1 && assigned[0].startTime <= row.startTime && assigned[0].endTime >= row.endTime) {
    return [{ row, operator: assigned[0], startTime: view === 'host' ? row.hostStartTime || row.startTime : row.startTime,
      endTime: view === 'host' ? row.hostEndTime || row.endTime : row.endTime, key: `${idKey(row.id)}:${view}:0` }]
  }
  let entries
  if (view === 'operator') {
    entries = assignments(row).map(operator => ({ row, operator, startTime: operator.startTime, endTime: operator.endTime }))
    entries.push(...partition(row, row.startTime, row.endTime).filter(segment => !segment.operator))
  } else {
    entries = partition(row, view === 'host' ? row.hostStartTime || row.startTime : row.startTime,
      view === 'host' ? row.hostEndTime || row.endTime : row.endTime)
  }
  return entries.map((entry, index) => ({ ...entry, key: `${idKey(row.id)}:${view}:${index}` }))
}

export function scheduleGroups(rows, view, operators = [], accounts = [], employees = []) {
  const groups = new Map()
  const addGroup = (id, label, secondary = '') => {
    const key = idKey(id)
    if (!groups.has(key)) groups.set(key, { id: key, label, secondary, entries: [] })
    return groups.get(key)
  }
  if (view === 'operator') operators.filter(isActiveOperator).forEach(o => addGroup(o.employeeId, o.name))
  for (const row of rows) {
    for (const segment of scheduleSegments(row, view)) {
      let group
      if (view === 'operator') {
        const operator = segment.operator
        const person = operator && operators.find(o => idKey(o.employeeId) === idKey(operator.employeeId))
        group = operator ? addGroup(operator.employeeId, person?.name || operator.employeeName || '-')
          : addGroup('unassigned', '待配运营')
      } else if (view === 'host') {
        const employee = employees.find(e => idKey(e.value) === idKey(row.employeeId))
        group = addGroup(row.employeeId, row.employeeName || employee?.label || '-')
      } else {
        const account = accounts.find(a => idKey(a.id) === idKey(row.accountId))
        group = addGroup(row.accountId, account?.accountCode || row.accountLabel || '-', account?.displayName || row.platform)
      }
      group.entries.push(segment)
    }
  }
  return [...groups.values()].map(group => ({ ...group, entries: group.entries.sort((a, b) =>
    a.row.scheduleDate.localeCompare(b.row.scheduleDate) || a.startTime.localeCompare(b.startTime) || a.key.localeCompare(b.key)) }))
}

export function conflictingSchedules(rows) {
  const duties = rows.filter(row => row.scheduleStatus !== 'CANCELLED').flatMap(row => [
    { scheduleId: idKey(row.id), date: row.scheduleDate, employeeId: idKey(row.employeeId), start: row.hostStartTime || row.startTime, end: row.hostEndTime || row.endTime },
    ...assignments(row).map(a => ({ scheduleId: idKey(row.id), date: row.scheduleDate, employeeId: idKey(a.employeeId), start: a.startTime, end: a.endTime }))
  ])
  const result = new Set()
  for (let i = 0; i < duties.length; i++) for (let j = i + 1; j < duties.length; j++) {
    const a = duties[i], b = duties[j]
    if (a.scheduleId !== b.scheduleId && a.employeeId && a.employeeId === b.employeeId && a.date === b.date && a.start < b.end && b.start < a.end) {
      result.add(a.scheduleId); result.add(b.scheduleId)
    }
  }
  return result
}

export function operatorColorStyle(color) {
  const value = /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#9CA3AF'
  return { '--operator-color': value, '--operator-fill': `${value}22` }
}

export function assignmentSummary(row) {
  return [...new Set(assignments(row).map(a => a.employeeName || '-'))].join('; ')
}
