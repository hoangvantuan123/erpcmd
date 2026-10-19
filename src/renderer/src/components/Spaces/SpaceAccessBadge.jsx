import React from 'react'
import { Lock, Link2, Globe, Shield } from 'lucide-react'

export const SpaceAccessBadge = ({ privacy, permission }) => {
  if (!privacy && !permission) return null

  const getPrivacyBadge = () => {
    switch (privacy) {
      case 'private':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50">
            <Lock className="w-3 h-3" />
            <span>Private</span>
          </span>
        )
      case 'shared':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-900/50">
            <Link2 className="w-3 h-3" />
            <span>Shared</span>
          </span>
        )
      case 'workspace':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <Globe className="w-3 h-3" />
            <span>Workspace</span>
          </span>
        )
    }
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {getPrivacyBadge()}
      {permission && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/50">
          <Shield className="w-3 h-3" />
          <span className="capitalize">{permission.replace('_', ' ')}</span>
        </span>
      )}
    </div>
  )
}

export default SpaceAccessBadge
