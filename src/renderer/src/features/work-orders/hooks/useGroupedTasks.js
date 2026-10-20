import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { searchWorkOrders, getWorkOrderFilters, saveWorkOrderFilters } from '../api/workOrdersApi'

export const useGroupedTasks = () => {
  const [remoteOrders, setRemoteOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [latency, setLatency] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState({})
  const [selectedOrder, setSelectedOrder] = useState(null)

  // Standard persistent query filters (matching ERP filter form layout)
  const [filterFactory, setFilterFactory] = useState('')
  const [filterDocNo, setFilterDocNo] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterStatus, setFilterStatus] = useState('') // '', '0', '1', '2'
  const [filterCreatedBy, setFilterCreatedBy] = useState('')
  const [filterProcess, setFilterProcess] = useState('')
  const [filterItemCode, setFilterItemCode] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchRequest, setSearchRequest] = useState({ keyword: '', id: 0 })
  const orders = remoteOrders

  // Dynamic filters generated via Ctrl + F on any column
  // [{ id: 'itemName', title: 'Tên Sản Phẩm', value: '...' }]
  const [dynamicFilters, setDynamicFilters] = useState([])
  const isLoadedFromCache = useRef(false)

  // Load saved filters, but wait for an explicit search before querying work orders.
  useEffect(() => {
    getWorkOrderFilters()
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          try {
            const saved = JSON.parse(json.data)
            if (saved.filterFactory !== undefined) setFilterFactory(saved.filterFactory)
            if (saved.filterDocNo !== undefined) setFilterDocNo(saved.filterDocNo)
            if (saved.dateFrom !== undefined) setDateFrom(saved.dateFrom)
            if (saved.dateTo !== undefined) setDateTo(saved.dateTo)
            if (saved.filterStatus !== undefined) setFilterStatus(saved.filterStatus)
            if (saved.filterCreatedBy !== undefined) setFilterCreatedBy(saved.filterCreatedBy)
            if (saved.filterProcess !== undefined) setFilterProcess(saved.filterProcess)
            if (saved.filterItemCode !== undefined) setFilterItemCode(saved.filterItemCode)
            if (saved.searchTerm !== undefined) setSearchTerm(saved.searchTerm)
            if (Array.isArray(saved.dynamicFilters)) setDynamicFilters(saved.dynamicFilters)
          } catch {
            // ignore JSON parse error
          }
        }
        isLoadedFromCache.current = true
      })
      .catch(() => {
        isLoadedFromCache.current = true
      })
  }, [])

  // Search only after Enter or the explicit query button is pressed.
  const serverSearchTerm = searchRequest.keyword
  const submitSearch = useCallback(() => {
    const keyword = filterDocNo.trim() || searchTerm.trim()
    if (!keyword) return
    setSearchRequest(prev => ({ keyword, id: prev.id + 1 }))
  }, [searchTerm, filterDocNo])

  useEffect(() => {
    let active = true
    if (!serverSearchTerm) {
      setRemoteOrders([])
      return () => { active = false }
    }

    setRemoteOrders([])
    setLoading(true)
    setError(null)
    const runSearch = async () => {
      try {
        const res = await searchWorkOrders(serverSearchTerm)
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || 'Không thể tra cứu trực tiếp từ Bravo')
        if (active) {
          setRemoteOrders(Array.isArray(json.data) ? json.data : [])
          setLatency(json.latency || '')
        }
      } catch (err) {
        if (active) setError(err.message || 'Lỗi khi tra cứu trực tiếp từ Bravo')
      } finally {
        if (active) setLoading(false)
      }
    }
    runSearch()

    return () => {
      active = false
    }
  }, [serverSearchTerm, searchRequest.id])

  // 3. Persist query filter preferences into SQLite (Debounced)
  useEffect(() => {
    if (!isLoadedFromCache.current) return
    const timer = setTimeout(() => {
      const payload = {
        filterFactory,
        filterDocNo,
        dateFrom,
        dateTo,
        filterStatus,
        filterCreatedBy,
        filterProcess,
        filterItemCode,
        searchTerm,
        dynamicFilters
      }
      saveWorkOrderFilters(JSON.stringify(payload)).catch(() => {})
    }, 400)
    return () => clearTimeout(timer)
  }, [
    filterFactory,
    filterDocNo,
    dateFrom,
    dateTo,
    filterStatus,
    filterCreatedBy,
    filterProcess,
    filterItemCode,
    searchTerm,
    dynamicFilters
  ])

  // Extract unique filter lists
  const uniqueProcesses = useMemo(() => {
    const set = new Set()
    orders.forEach(o => {
      if (o.process_code) set.add(o.process_code.trim())
    })
    return Array.from(set).sort()
  }, [orders])

  const uniqueFactories = useMemo(() => {
    const set = new Set()
    orders.forEach(o => {
      if (o.factory_name) set.add(o.factory_name.trim())
    })
    return Array.from(set).sort()
  }, [orders])

  // Dynamic filter helpers (Ctrl + F generator)
  const addOrFocusDynamicFilter = useCallback((colId, colTitle, initialVal = '') => {
    // If it is one of the standard fields, set it directly
    if (colId === 'docNo') {
      if (initialVal) setFilterDocNo(initialVal)
      return { type: 'standard', id: 'filter-docNo' }
    }
    if (colId === 'processCode') {
      if (initialVal) setFilterProcess(initialVal)
      return { type: 'standard', id: 'filter-process' }
    }
    if (colId === 'factoryName') {
      if (initialVal) setFilterFactory(initialVal)
      return { type: 'standard', id: 'filter-factory' }
    }
    if (colId === 'createdByName') {
      if (initialVal) setFilterCreatedBy(initialVal)
      return { type: 'standard', id: 'filter-createdBy' }
    }
    if (colId === 'itemCode' || colId === 'itemName') {
      if (initialVal) setFilterItemCode(initialVal)
      return { type: 'standard', id: 'filter-itemCode' }
    }
    if (colId === 'status') {
      return { type: 'standard', id: 'filter-status' }
    }

    // Otherwise, generate a dynamic filter entry
    setDynamicFilters(prev => {
      const idx = prev.findIndex(df => df.id === colId)
      if (idx >= 0) {
        if (initialVal) {
          const next = [...prev]
          next[idx] = { ...next[idx], value: initialVal }
          return next
        }
        return prev
      }
      return [...prev, { id: colId, title: colTitle || colId, value: initialVal || '' }]
    })

    return { type: 'dynamic', id: `dyn-filter-${colId}` }
  }, [])

  const setDynamicFilterValue = useCallback((colId, value) => {
    setDynamicFilters(prev => 
      prev.map(df => df.id === colId ? { ...df, value } : df)
    )
  }, [])

  const removeDynamicFilter = useCallback((colId) => {
    setDynamicFilters(prev => prev.filter(df => df.id !== colId))
  }, [])

  const resetFilters = useCallback(() => {
    setSearchTerm('')
    setFilterProcess('')
    setFilterFactory('')
    setFilterDocNo('')
    setFilterStatus('')
    setFilterCreatedBy('')
    setFilterItemCode('')
    setDateFrom('')
    setDateTo('')
    setDynamicFilters([])
    setRemoteOrders([])
    setSearchRequest(prev => ({ keyword: '', id: prev.id + 1 }))
  }, [])

  // Filter orders by search term, grid fields and dynamic filters
  const filteredOrders = useMemo(() => {
    const sourceOrders = serverSearchTerm ? remoteOrders : []
    return sourceOrders.filter(wo => {
      // 1. Factory filter
      if (filterFactory && wo.factory_name !== filterFactory) {
        return false
      }

      // 2. DocNo filter
      if (filterDocNo && !serverSearchTerm) {
        const term = filterDocNo.toLowerCase().trim()
        if (!wo.doc_no || !wo.doc_no.toLowerCase().includes(term)) return false
      }

      // 3. Process filter
      if (filterProcess && wo.process_code !== filterProcess) {
        return false
      }

      // 4. Status filter
      if (filterStatus !== '') {
        const s = Number(filterStatus)
        if (wo.doc_status !== s) return false
      }

      // 5. Created by filter
      if (filterCreatedBy) {
        const term = filterCreatedBy.toLowerCase().trim()
        if (!wo.created_by_name || !wo.created_by_name.toLowerCase().includes(term)) return false
      }

      // 6. Item code / Item name filter
      if (filterItemCode) {
        const term = filterItemCode.toLowerCase().trim()
        const code = (wo.item_code || '').toLowerCase()
        const name = (wo.item_name || '').toLowerCase()
        if (!code.includes(term) && !name.includes(term)) return false
      }

      // 7. Date range filter (supports DD/MM/YYYY or YYYY-MM-DD)
      if (dateFrom || dateTo) {
        const rawDate = wo.doc_date || ''
        let itemDateStr = ''
        if (rawDate.includes('/')) {
          const parts = rawDate.split('/')
          if (parts.length === 3) {
            itemDateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
          }
        } else if (rawDate.length >= 10) {
          itemDateStr = rawDate.substring(0, 10)
        }

        if (itemDateStr) {
          if (dateFrom && itemDateStr < dateFrom) return false
          if (dateTo && itemDateStr > dateTo) return false
        }
      }

      // 8. Dynamic filters generated by Ctrl + F
      for (const df of dynamicFilters) {
        if (!df.value || !df.value.trim()) continue
        const term = df.value.toLowerCase().trim()
        let val = ''
        switch (df.id) {
          case 'stt': val = wo.stt || ''; break
          case 'docDate': val = wo.doc_date || ''; break
          case 'processCode': val = wo.process_code || ''; break
          case 'itemCode': val = wo.item_code || ''; break
          case 'itemName': val = wo.item_name || ''; break
          case 'description': val = wo.description || ''; break
          case 'quantity': val = String(wo.quantity || ''); break
          case 'factoryName': val = wo.factory_name || ''; break
          case 'createdByName': val = wo.created_by_name || ''; break
          case 'status': val = wo.status_text || ''; break
          default: val = String(wo[df.id] || '')
        }
        if (!val.toLowerCase().includes(term)) {
          return false
        }
      }

      // 9. Global Search term filter
      if (!searchTerm.trim() || serverSearchTerm) return true
      const term = searchTerm.toLowerCase().trim()
      return (
        (wo.doc_no && wo.doc_no.toLowerCase().includes(term)) ||
        (wo.stt && wo.stt.toLowerCase().includes(term)) ||
        (wo.item_code && wo.item_code.toLowerCase().includes(term)) ||
        (wo.item_name && wo.item_name.toLowerCase().includes(term)) ||
        (wo.description && wo.description.toLowerCase().includes(term)) ||
        (wo.created_by_name && wo.created_by_name.toLowerCase().includes(term)) ||
        (wo.factory_name && wo.factory_name.toLowerCase().includes(term)) ||
        (wo.process_code && wo.process_code.toLowerCase().includes(term))
      )
    })
  }, [
    remoteOrders,
    serverSearchTerm,
    filterFactory, 
    filterDocNo, 
    filterProcess, 
    filterStatus, 
    filterCreatedBy, 
    filterItemCode, 
    dateFrom, 
    dateTo, 
    dynamicFilters, 
    searchTerm
  ])

  // Format into ClickUp/Taskhub grouped structure for Glide Data Grid & views
  const groups = useMemo(() => {
    const runningTasks = []
    const pendingTasks = []
    const completedTasks = []

    filteredOrders.forEach((wo, idx) => {
      const task = {
        id: wo.stt || `wo-${idx}`,
        name: wo.doc_no,
        docNo: wo.doc_no,
        stt: wo.stt,
        docDate: wo.doc_date || '-',
        processCode: wo.process_code || '-',
        itemCode: wo.item_code || '-',
        itemName: wo.item_name || '',
        description: wo.description || wo.item_name || '-',
        quantity: wo.quantity || 0,
        factoryName: wo.factory_name || '-',
        createdByName: wo.created_by_name || '-',
        status: wo.status_text || 'Chờ thực hiện',
        docStatus: wo.doc_status,
        dueDate: wo.doc_date || 'Today',
        priority: wo.doc_status === 1 ? 'High' : wo.doc_status === 2 ? 'Normal' : 'Low',
        completed: wo.doc_status === 2,
        iconType: wo.doc_status === 2 ? 'completed' : wo.doc_status === 1 ? 'running' : 'pending',
        raw: wo
      }

      if (wo.doc_status === 1) {
        runningTasks.push(task)
      } else if (wo.doc_status === 2) {
        completedTasks.push(task)
      } else {
        pendingTasks.push(task)
      }
    })

    return [
      {
        id: 'RUNNING',
        name: 'ĐANG SẢN XUẤT',
        color: 'bg-purple-600 text-white',
        badgeBg: 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-300',
        collapsed: !!collapsedGroups['RUNNING'],
        tasks: runningTasks
      },
      {
        id: 'PENDING',
        name: 'CHỜ THỰC HIỆN',
        color: 'bg-amber-500 text-white',
        badgeBg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300',
        collapsed: !!collapsedGroups['PENDING'],
        tasks: pendingTasks
      },
      {
        id: 'COMPLETED',
        name: 'HOÀN THÀNH',
        color: 'bg-emerald-600 text-white',
        badgeBg: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300',
        collapsed: !!collapsedGroups['COMPLETED'],
        tasks: completedTasks
      }
    ]
  }, [filteredOrders, collapsedGroups])

  const toggleGroup = useCallback((groupId) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }, [])

  const toggleTaskCompleted = useCallback((groupId, taskId) => {
    // Read-only or status toggle
  }, [])

  const addTaskToGroup = useCallback((groupId, taskTitle) => {
    // Add task
  }, [])

  return {
    groups,
    rawOrders: orders,
    filteredOrders,
    loading,
    error,
    latency,
    refetch: submitSearch,
    submitSearch,
    hasSearched: Boolean(serverSearchTerm),
    searchTerm,
    setSearchTerm,
    filterProcess,
    setFilterProcess,
    filterFactory,
    setFilterFactory,
    filterDocNo,
    setFilterDocNo,
    filterStatus,
    setFilterStatus,
    filterCreatedBy,
    setFilterCreatedBy,
    filterItemCode,
    setFilterItemCode,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    dynamicFilters,
    setDynamicFilterValue,
    removeDynamicFilter,
    addOrFocusDynamicFilter,
    resetFilters,
    uniqueProcesses,
    uniqueFactories,
    toggleGroup,
    toggleTaskCompleted,
    addTaskToGroup,
    selectedOrder,
    setSelectedOrder
  }
}

export default useGroupedTasks
