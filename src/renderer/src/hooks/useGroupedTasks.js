import { useState, useCallback, useEffect, useMemo } from 'react'

export const useGroupedTasks = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState({})
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [latency, setLatency] = useState('')

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/work-orders')
      const json = await res.json()
      if (json.success) {
        setOrders(json.data || [])
        setLatency(json.latency || '')
      } else {
        setError(json.error || 'Không tải được danh sách lệnh sản xuất')
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối khi gọi API Lệnh sản xuất')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkOrders()
  }, [fetchWorkOrders])

  // Filter orders by search term
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders
    const term = searchTerm.toLowerCase().trim()
    return orders.filter(wo => {
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
  }, [orders, searchTerm])

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
        icon: wo.doc_status === 2 ? '🟢' : wo.doc_status === 1 ? '🟣' : '⚙️',
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
    refetch: fetchWorkOrders,
    searchTerm,
    setSearchTerm,
    toggleGroup,
    toggleTaskCompleted,
    addTaskToGroup,
    selectedOrder,
    setSelectedOrder
  }
}

export default useGroupedTasks
