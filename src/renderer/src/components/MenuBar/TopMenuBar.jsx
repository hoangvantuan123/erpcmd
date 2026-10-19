import React from 'react'

const TopMenuBar = () => {
  const isElectron = typeof window !== 'undefined' && (!!window.electron || !!window.api)
  const isMac = typeof navigator !== 'undefined' && (/Mac|iPod|iPhone|iPad/.test(navigator.platform || '') || /Macintosh|Mac OS X/.test(navigator.userAgent || ''))

  if (!isElectron) return null

  return (
    <div
      className={`w-full select-none shrink-0 border-b border-gray-200 bg-white flex items-center justify-between app-region-drag ${
        isMac ? 'pl-20 pr-4' : 'pl-4 pr-36'
      }`}
      style={{
        height: '32px',
        minHeight: '32px',
        WebkitAppRegion: 'drag'
      }}
    >
      {/* Central Drag Handle Area */}
      <div className="flex-1 h-full app-region-drag" />
    </div>
  )
}

export default TopMenuBar
