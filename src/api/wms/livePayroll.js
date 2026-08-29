import request from '@/utils/request'

const base = '/wms/live'

export function getLiveOptions(includeDisabledAccounts = false) {
  return Promise.all([
    request({ url: `${base}/options/employees`, method: 'get' }),
    request({ url: `${base}/options/accounts`, method: 'get', params: { includeDisabled: includeDisabledAccounts } }),
    request({ url: `${base}/options/rate-types`, method: 'get' }),
    request({ url: `${base}/options/special-types`, method: 'get' })
  ]).then(([employees, accounts, rateTypes, specialTypes]) => ({
    employees: employees.data || [],
    accounts: accounts.data || [],
    rateTypes: rateTypes.data || [],
    specialTypes: specialTypes.data || []
  }))
}

export const getDashboard = params => request({ url: `${base}/dashboard`, method: 'get', params })
export const importAttendance = data => request({
  url: `${base}/attendance/import`,
  method: 'post',
  data,
  headers: { 'Content-Type': 'multipart/form-data' }
})

export const listSchedules = params => request({ url: `${base}/schedules/list`, method: 'get', params })
export const listScheduleCalendar = params => request({ url: `${base}/schedules/calendar`, method: 'get', params })
export const addSchedule = data => request({ url: `${base}/schedules`, method: 'post', data })
export const updateSchedule = data => request({ url: `${base}/schedules`, method: 'put', data })
export const deleteSchedule = id => request({ url: `${base}/schedules/${id}`, method: 'delete' })

export const listStreams = params => request({ url: `${base}/streams/list`, method: 'get', params })
export const addStream = data => request({ url: `${base}/streams`, method: 'post', data })
export const updateStream = data => request({ url: `${base}/streams`, method: 'put', data })
export const deleteStream = id => request({ url: `${base}/streams/${id}`, method: 'delete' })

export const listCommissions = params => request({ url: `${base}/commissions/list`, method: 'get', params })
export const addCommission = data => request({ url: `${base}/commissions`, method: 'post', data })
export const updateCommission = data => request({ url: `${base}/commissions`, method: 'put', data })
export const deleteCommission = id => request({ url: `${base}/commissions/${id}`, method: 'delete' })

export const listAccounts = params => request({ url: `${base}/accounts/list`, method: 'get', params })
export const addAccount = data => request({ url: `${base}/accounts`, method: 'post', data })
export const updateAccount = data => request({ url: `${base}/accounts`, method: 'put', data })
export const deleteAccount = id => request({ url: `${base}/accounts/${id}`, method: 'delete' })
export const syncAccounts = () => request({ url: `${base}/accounts/sync-shops`, method: 'post' })

export const listRates = params => request({ url: `${base}/rates/list`, method: 'get', params })
export const addRate = data => request({ url: `${base}/rates`, method: 'post', data })
export const updateRate = data => request({ url: `${base}/rates`, method: 'put', data })
export const deleteRate = id => request({ url: `${base}/rates/${id}`, method: 'delete' })
export const recalculateStreams = params => request({ url: `${base}/rates/recalculate`, method: 'post', params })
export const listRateAccountGroups = employeeId => request({ url: `${base}/rates/account-groups`, method: 'get', params: { employeeId } })
export const updateRateAccountGroupStatus = data => request({ url: `${base}/rates/account-groups/status`, method: 'put', data })
export const updateAllRateAccountGroupStatuses = params => request({ url: `${base}/rates/account-groups/status/all`, method: 'put', params })
export const syncRateAccountGroup = data => request({ url: `${base}/rates/account-groups/sync`, method: 'post', data })
export const deleteRateAccountGroup = params => request({ url: `${base}/rates/account-groups`, method: 'delete', params })

export const listRateTypes = () => request({ url: `${base}/settings/rate-types`, method: 'get' })
export const addRateType = data => request({ url: `${base}/settings/rate-types`, method: 'post', data })
export const updateRateType = data => request({ url: `${base}/settings/rate-types`, method: 'put', data })
export const deleteRateType = id => request({ url: `${base}/settings/rate-types/${id}`, method: 'delete' })
export const listSpecialTypes = () => request({ url: `${base}/settings/special-types`, method: 'get' })
export const addSpecialType = data => request({ url: `${base}/settings/special-types`, method: 'post', data })
export const updateSpecialType = data => request({ url: `${base}/settings/special-types`, method: 'put', data })
export const deleteSpecialType = id => request({ url: `${base}/settings/special-types/${id}`, method: 'delete' })
