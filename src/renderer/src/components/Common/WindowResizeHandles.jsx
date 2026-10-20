import React from 'react'

const handleEdgeResize = (edge, winId) => (e) => {
  if (e.button !== 0) return
  e.preventDefault()
  e.stopPropagation()
  const targetWin = winId || 'main'
  fetch(`/api/window/resize-edge?edge=${encodeURIComponent(edge)}&win_id=${encodeURIComponent(targetWin)}`, {
    method: 'POST'
  }).catch(() => {})
}

export const WindowResizeHandles = ({ winId = 'main' }) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-[99999] overflow-hidden select-none">
      {/* 4 Cạnh */}
      <div
        className="pointer-events-auto absolute top-0 left-2 right-2 h-1.5 cursor-n-resize"
        onMouseDown={handleEdgeResize('top', winId)}
      />
      <div
        className="pointer-events-auto absolute bottom-0 left-2 right-2 h-1.5 cursor-s-resize"
        onMouseDown={handleEdgeResize('bottom', winId)}
      />
      <div
        className="pointer-events-auto absolute top-2 bottom-2 left-0 w-1.5 cursor-w-resize"
        onMouseDown={handleEdgeResize('left', winId)}
      />
      <div
        className="pointer-events-auto absolute top-2 bottom-2 right-0 w-1.5 cursor-e-resize"
        onMouseDown={handleEdgeResize('right', winId)}
      />

      {/* 4 Góc */}
      <div
        className="pointer-events-auto absolute top-0 left-0 w-2.5 h-2.5 cursor-nwse-resize"
        onMouseDown={handleEdgeResize('top-left', winId)}
      />
      <div
        className="pointer-events-auto absolute top-0 right-0 w-2.5 h-2.5 cursor-nesw-resize"
        onMouseDown={handleEdgeResize('top-right', winId)}
      />
      <div
        className="pointer-events-auto absolute bottom-0 left-0 w-2.5 h-2.5 cursor-nesw-resize"
        onMouseDown={handleEdgeResize('bottom-left', winId)}
      />
      <div
        className="pointer-events-auto absolute bottom-0 right-0 w-2.5 h-2.5 cursor-nwse-resize"
        onMouseDown={handleEdgeResize('bottom-right', winId)}
      />
    </div>
  )
}

export default WindowResizeHandles
