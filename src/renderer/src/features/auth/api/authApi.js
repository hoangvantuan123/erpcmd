import { request } from '@/shared/api/request'

export const login = (credentials) => request('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(credentials),
})
