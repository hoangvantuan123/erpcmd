import React, { useEffect, useRef } from 'react'
import { 
  Star, Edit3, Link2, Plus, Palette, Zap, 
  FormInput, Target, MoreHorizontal, Info, Box, Mail, 
  LogIn, Layout, ExternalLink, Copy, Archive, Trash2, ChevronRight
} from 'lucide-react'

const SpaceContextMenu = ({ 
  isOpen, 
  position, 
  onClose, 
  targetItem, 
  onOpenSharing 
}) => {
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen || !targetItem) return null

  // Calculate clamped positioning so menu doesn't overflow viewport bottom
  const topPos = Math.min(position?.y || 100, window.innerHeight - 520)
  const leftPos = Math.min(position?.x || 200, window.innerWidth - 260)

  return (
    <div 
      ref={menuRef}
      style={{ top: `${topPos}px`, left: `${leftPos}px` }}
      className="fixed z-50 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-1.5 text-[12px] text-slate-700 dark:text-slate-300 animate-in fade-in zoom-in-95 duration-100 select-none max-h-[90vh] overflow-y-auto custom-scrollbar"
    >
      {/* Group 1 */}
      <div className="space-y-0.5">
        <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors">
          <div className="flex items-center gap-2.5">
            <Star className="w-3.5 h-3.5 text-slate-400" />
            <span>Favorite</span>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-400" />
        </button>

        <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors">
          <Edit3 className="w-3.5 h-3.5 text-slate-400" />
          <span>Rename</span>
        </button>

        <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors">
          <Link2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Copy link</span>
        </button>
      </div>

      <hr className="border-slate-100 dark:border-slate-800 my-1" />

      {/* Group 2 */}
      <div className="space-y-0.5">
        <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors">
          <div className="flex items-center gap-2.5">
            <Plus className="w-3.5 h-3.5 text-slate-400" />
            <span>Create new</span>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-400" />
        </button>

        <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors">
          <div className="flex items-center gap-2.5">
            <Palette className="w-3.5 h-3.5 text-slate-400" />
            <span>Color & Icon</span>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-400" />
        </button>

        <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors">
          <Zap className="w-3.5 h-3.5 text-slate-400" />
          <span>Automations</span>
        </button>

        <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors">
          <FormInput className="w-3.5 h-3.5 text-slate-400" />
          <span>Custom Fields</span>
        </button>

        <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors">
          <Target className="w-3.5 h-3.5 text-slate-400" />
          <span>Task statuses</span>
        </button>

        <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors">
          <div className="flex items-center gap-2.5">
            <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>More</span>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      <hr className="border-slate-100 dark:border-slate-800 my-1" />

      {/* Group 3 */}
      <div className="space-y-0.5">
        <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>List Info</span>
        </button>

        <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors">
          <div className="flex items-center gap-2.5">
            <Box className="w-3.5 h-3.5 text-slate-400" />
            <span>Default task type</span>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-400" />
        </button>

        <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors">
          <Mail className="w-3.5 h-3.5 text-slate-400" />
          <span>Email to List</span>
        </button>
      </div>

      <hr className="border-slate-100 dark:border-slate-800 my-1" />

      {/* Group 4 */}
      <div className="space-y-0.5">
        <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors">
          <div className="flex items-center gap-2.5">
            <LogIn className="w-3.5 h-3.5 text-slate-400" />
            <span>Imports</span>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-400" />
        </button>

        <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors">
          <div className="flex items-center gap-2.5">
            <Layout className="w-3.5 h-3.5 text-slate-400" />
            <span>Templates</span>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      <hr className="border-slate-100 dark:border-slate-800 my-1" />

      {/* Group 5 */}
      <div className="space-y-0.5">
        <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors">
          <div className="flex items-center gap-2.5">
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>Move</span>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-400" />
        </button>

        <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors">
          <Copy className="w-3.5 h-3.5 text-slate-400" />
          <span>Duplicate</span>
        </button>

        <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors">
          <Archive className="w-3.5 h-3.5 text-slate-400" />
          <span>Archive</span>
        </button>

        <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-red-600 dark:text-red-400 text-left transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>
      </div>

      {/* Dark Footer Button - Sharing & Permissions */}
      <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => {
            onClose()
            onOpenSharing(targetItem)
          }}
          className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold rounded-xl text-xs text-center transition-colors shadow-xs"
        >
          Sharing & Permissions
        </button>
      </div>
    </div>
  )
}

export default SpaceContextMenu
