import { request } from '@/shared/api/request'

export const getApiLogs = () => request('/api/logs')
