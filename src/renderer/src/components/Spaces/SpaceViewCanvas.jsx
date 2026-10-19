import React from 'react'
import { Users } from 'lucide-react'
import SpaceAccessBadge from './SpaceAccessBadge'
import SpaceProjectsSection from './SpaceProjectsSection'
import SpaceNotesSection from './SpaceNotesSection'

export const SpaceViewCanvas = ({ activeNavInfo, selectedNoteId, onSelectItem, onSelectNote, onAddNote }) => {
  if (!activeNavInfo) return null

  const { title, parentTitle, type, iconColor, privacy, accessControl, subItems, notes } = activeNavInfo

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* 1. Header Banner Area */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-black dark:to-indigo-950/20 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-xl ${iconColor || 'bg-indigo-600'} flex items-center justify-center text-white shadow-md shrink-0`}>
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {parentTitle || 'Space'}
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {title}
            </h1>
          </div>
        </div>

        <SpaceAccessBadge privacy={privacy} permission={accessControl?.defaultPermission} />
      </div>

      {/* 2. Sub-Projects & Lists Grid Section */}
      {subItems && subItems.length > 0 && (
        <SpaceProjectsSection subItems={subItems} onSelectItem={onSelectItem} />
      )}

      {/* 3. Notes & Documents Section */}
      <SpaceNotesSection
        notes={notes || []}
        selectedNoteId={selectedNoteId}
        onSelectNote={onSelectNote}
        onAddNote={onAddNote}
        title={title}
      />
    </div>
  )
}

export default SpaceViewCanvas
