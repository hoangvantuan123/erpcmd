import React, { useState } from 'react'
import { X, Copy, Info, Check, Lock, Users, Shield } from 'lucide-react'
import { PERMISSION_ROLES } from '@/features/spaces/data/spacesData'

const SharePermissionsModal = ({ isOpen, onClose, targetItem }) => {
  const [inviteInput, setInviteInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [defaultPermission, setDefaultPermission] = useState('full_edit')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  if (!isOpen || !targetItem) return null

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://taskhub.app/s/${targetItem.id || 'share-link'}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectedRole = Object.values(PERMISSION_ROLES).find(r => r.id === defaultPermission) || PERMISSION_ROLES.FULL_EDIT

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs select-none">
      <div className="w-[520px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              Share this {targetItem.type === 'doc' ? 'Doc' : 'List'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sharing {targetItem.type === 'doc' ? 'Doc' : 'List'} with all views <span className="font-semibold text-slate-800 dark:text-slate-200">{targetItem.name}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invite Input */}
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
            placeholder="Invite by name or email"
            className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <button
            disabled={!inviteInput.trim()}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 rounded-xl transition-all disabled:opacity-40"
          >
            Invite
          </button>
        </div>

        {/* Private Link */}
        <div className="flex items-center justify-between py-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Private link</span>
            <Info className="w-3.5 h-3.5 text-slate-400" title="Anyone with link can access" />
          </div>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy link'}</span>
          </button>
        </div>

        {/* Default permission & Menu Dropdown */}
        <div className="relative mb-5">
          <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Default permission</span>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200/80 transition-colors"
            >
              <span>{selectedRole.name}</span>
              <span className="text-[10px]">▼</span>
            </button>
          </div>

          {/* Role selector popover matching screenshot */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-11 z-50 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 space-y-1 animate-in fade-in zoom-in-95">
              {Object.values(PERMISSION_ROLES).map((role) => (
                <div
                  key={role.id}
                  onClick={() => {
                    setDefaultPermission(role.id)
                    setIsDropdownOpen(false)
                  }}
                  className={`p-2.5 rounded-xl cursor-pointer transition-colors ${
                    defaultPermission === role.id 
                      ? 'bg-slate-100 dark:bg-slate-800 font-semibold' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100">
                    <span>{role.name}</span>
                    {defaultPermission === role.id && <Check className="w-3.5 h-3.5 text-slate-900 dark:text-slate-100" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug font-normal">
                    {role.description}
                  </p>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <a href="#" className="text-[11px] text-slate-500 hover:underline">Learn more about permissions.</a>
              </div>
            </div>
          )}
        </div>

        {/* Share With */}
        <div className="space-y-3 mb-6">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Share with</div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Team Space</span>
            </div>
            <span className="text-xs text-slate-500 font-medium">Full edit</span>
          </div>

          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pt-2">1 Person</div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold">
                T
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Me</span>
                <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 px-1.5 py-0.5 rounded-md">
                  Workspace Owner
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Make Private</span>
        </button>
      </div>
    </div>
  )
}

export default SharePermissionsModal
