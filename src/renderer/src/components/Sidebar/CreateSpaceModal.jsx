import React, { useState } from 'react'
import { X, Info } from 'lucide-react'
import { PERMISSION_ROLES } from '../../data/spacesData'

const COLOR_OPTIONS = [
  'bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 
  'bg-rose-600', 'bg-amber-600', 'bg-indigo-600', 
  'bg-cyan-600', 'bg-teal-600', 'bg-sky-600'
]

const CreateSpaceModal = ({ isOpen, onClose, onCreateSpace }) => {
  const [spaceName, setSpaceName] = useState('')
  const [description, setDescription] = useState('')
  const [defaultPermission, setDefaultPermission] = useState('full_edit')
  const [isPrivate, setIsPrivate] = useState(false)
  const [selectedColor, setSelectedColor] = useState('bg-indigo-600')

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!spaceName.trim()) return

    const newSpace = {
      id: `space-${Date.now()}`,
      name: spaceName.trim(),
      description: description.trim(),
      iconColor: selectedColor,
      privacy: isPrivate ? 'private' : 'workspace',
      accessControl: {
        isPrivate,
        defaultPermission,
        privateLink: { enabled: false, url: '', permission: 'view_only' },
        teams: [],
        members: [
          { id: 'me', name: 'Me', avatar: 'T', role: 'Workspace Owner', permission: 'full_edit', isOwner: true }
        ]
      },
      subItems: []
    }

    onCreateSpace(newSpace)
    setSpaceName('')
    setDescription('')
    setIsPrivate(false)
    onClose()
  }

  const iconLetter = spaceName.trim() ? spaceName.trim().charAt(0).toUpperCase() : 'S'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs select-none">
      <div className="w-[580px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create a Space</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              A Space represents teams, departments, or groups, each with its own Lists, workflows, and settings.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Icon & Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Icon & name
            </label>
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-lg ${selectedColor} text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs`}>
                {iconLetter}
              </div>
              <input
                type="text"
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                placeholder="e.g. Marketing, Engineering, HR"
                autoFocus
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Default permission */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Default permission</span>
              <Info className="w-3.5 h-3.5 text-slate-400" title="Default permission for workspace members" />
            </div>

            <select
              value={defaultPermission}
              onChange={(e) => setDefaultPermission(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
            >
              {Object.values(PERMISSION_ROLES).map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {/* Make Private Toggle */}
          <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Make Private</div>
              <div className="text-[11px] text-slate-400">Only you and invited members have access</div>
            </div>

            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isPrivate ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-900 shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isPrivate ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

      
        </form>
      </div>
    </div>
  )
}

export default CreateSpaceModal
