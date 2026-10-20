import React from 'react'
import { Folder } from 'lucide-react'
import SpaceProjectCard from './SpaceProjectCard'

export const SpaceProjectsSection = ({ subItems, onSelectItem }) => {
  if (!subItems || subItems.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-emerald-500" />
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Dự án & Danh sách trực thuộc ({subItems.length})
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {subItems.map((sub) => (
          <SpaceProjectCard key={sub.id} sub={sub} onSelectItem={onSelectItem} />
        ))}
      </div>
    </div>
  )
}

export default SpaceProjectsSection
