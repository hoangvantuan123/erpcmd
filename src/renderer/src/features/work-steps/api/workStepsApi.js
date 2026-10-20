import { request } from '@/shared/api/request'

export const findWorkSteps = (docNo) => request(`/api/work-steps?doc_no=${encodeURIComponent(docNo)}`)
