import React, { memo } from 'react'
import { Flag } from 'lucide-react'

export const PriorityBadge = memo(({ priority }) => {
  if (!priority) return null

  switch (priority) {
    case 'Urgent':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
          <Flag className="w-3.5 h-3.5 fill-red-500 text-red-500" />
          <span>Urgent</span>
        </span>
      )
    case 'High':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500">
          <Flag className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
          <span>High</span>
        </span>
      )
    case 'Normal':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-500">
          <Flag className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />
          <span>Normal</span>
        </span>
      )
    case 'Low':
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
          <Flag className="w-3.5 h-3.5 text-slate-400" />
          <span>Low</span>
        </span>
      )
  }
})

PriorityBadge.displayName = 'PriorityBadge'
export default PriorityBadge
