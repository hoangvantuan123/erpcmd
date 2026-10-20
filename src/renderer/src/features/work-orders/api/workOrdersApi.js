import { request } from '@/shared/api/request'

export const getWorkOrders = () => request('/api/work-orders')
export const searchWorkOrders = (keyword) => request(`/api/work-orders?search=${encodeURIComponent(keyword)}`)
export const getCachedWorkOrders = () => request('/api/work-orders?cache_only=true')
export const getWorkOrderFilters = () => request('/api/cache?key=work_orders_filters')
export const saveWorkOrderFilters = (value) => request('/api/cache', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'work_orders_filters', value }),
})
export const getWorkOrderDetails = (stt) => request(`/api/work-orders/details?stt=${encodeURIComponent(stt)}`)
export const settleWorkOrder = (payload) => request('/api/settle', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
