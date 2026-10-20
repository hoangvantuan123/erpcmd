import { request } from '@/shared/api/request'

export const getSystemStatus = () => request('/api/status')
export const getSystemConfig = () => request('/api/config')
export const saveSystemConfig = (config) => request('/api/config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(config),
})
export const windowAction = (action, winId) => request(`/api/window/${action}${winId ? `?win_id=${encodeURIComponent(winId)}` : ''}`, { method: 'POST' })
export const openSettingsWindow = () => windowAction('settings')
export const resizeMainWindow = () => windowAction('main')
export const closeSettingsWindow = () => request('/api/window/settings/close', { method: 'POST' })
export const createViewWindow = (view) => request(`/api/window/new-view?view=${encodeURIComponent(view)}`, { method: 'POST' })
export const resizeWindowEdge = (edge, winId) => request(`/api/window/resize-edge?edge=${encodeURIComponent(edge)}&win_id=${encodeURIComponent(winId)}`, { method: 'POST' })
