import { useState, useMemo, useEffect } from 'react'
import { initialSpaces } from '../data/spacesData'
import { initialNotesData } from '../data/notesData'

// Global Navigation Titles Map
const NAVIGATION_NAMES = {
  'home': { title: 'Overview', parentTitle: null, type: 'home' },
  'notifications': { title: 'Thông Báo', parentTitle: null, type: 'notifications' },
  'settle-logs': { title: 'Nhật ký', parentTitle: null, type: 'logs' },
  'api-logs': { title: 'Nhật ký', parentTitle: null, type: 'logs' },
  'settle-process': { title: 'Quyết toán lệnh công đoạn', parentTitle: 'Quyết toán lệnh', type: 'settle-process' },
  'settle-step': { title: 'Quyết toán lệnh thao tác', parentTitle: 'Quyết toán lệnh', type: 'settle-step' },
  'all-tasks': { title: 'Quyết toán lệnh công đoạn', parentTitle: 'Quyết toán lệnh', type: 'settle-process' }
}

export const useSpaces = () => {
  const [spaces, setSpaces] = useState(initialSpaces)
  const [activeItem, setActiveItemState] = useState(() => {
    try {
      return localStorage.getItem('erpsyn-active-item') || 'home'
    } catch {
      return 'home'
    }
  })
  const [notesMap, setNotesMap] = useState(initialNotesData)
  const [selectedNoteId, setSelectedNoteId] = useState('1783924896')

  useEffect(() => {
    try {
      localStorage.setItem('erpsyn-active-item', activeItem)
    } catch {
      // Navigation still works when browser storage is unavailable.
    }
  }, [activeItem])

  // Find navigation & space details for current activeItem
  const activeNavInfo = useMemo(() => {
    // 1. Check if it's a global navigation view (Inbox, Calendar, etc.)
    if (NAVIGATION_NAMES[activeItem]) {
      const view = NAVIGATION_NAMES[activeItem]
      const notes = notesMap[activeItem] || []
      const currentNote = notes.find(n => n.id === selectedNoteId) || notes[0] || null

      return {
        id: activeItem,
        title: view.title,
        parentTitle: view.parentTitle,
        type: view.type,
        iconColor: 'bg-indigo-600',
        notes,
        currentNote
      }
    }

    // 2. Check if activeItem matches a top-level Space
    const matchedSpace = spaces.find(s => s.id === activeItem)
    if (matchedSpace) {
      const notes = notesMap[activeItem] || [
        {
          id: `default-${activeItem}`,
          title: `Tổng quan ${matchedSpace.name}`,
          content: `Tài liệu và công việc thuộc Space: ${matchedSpace.name}`,
          modifiedDate: 'Hôm nay',
          createdDate: 'Tạo hôm nay'
        }
      ]
      const currentNote = notes.find(n => n.id === selectedNoteId) || notes[0] || null

      return {
        id: activeItem,
        title: matchedSpace.name,
        parentTitle: 'Spaces',
        type: 'space',
        iconColor: matchedSpace.iconColor || 'bg-emerald-600',
        privacy: matchedSpace.privacy,
        accessControl: matchedSpace.accessControl,
        subItems: matchedSpace.subItems || [],
        notes,
        currentNote
      }
    }

    // 3. Check if activeItem matches a SubItem / Project under any Space
    for (const space of spaces) {
      if (space.subItems) {
        const matchedSub = space.subItems.find(sub => sub.id === activeItem)
        if (matchedSub) {
          const notes = notesMap[activeItem] || [
            {
              id: `default-${activeItem}`,
              title: `${matchedSub.name} - Tổng quan`,
              content: `Nhiệm vụ và tài liệu thuộc dự án ${matchedSub.name} (${space.name}).`,
              modifiedDate: 'Hôm nay',
              createdDate: 'Tạo hôm nay'
            }
          ]
          const currentNote = notes.find(n => n.id === selectedNoteId) || notes[0] || null

          return {
            id: activeItem,
            parentId: space.id,
            title: matchedSub.name,
            parentTitle: space.name,
            type: matchedSub.type || 'list',
            iconColor: space.iconColor || 'bg-blue-600',
            privacy: space.privacy,
            notes,
            currentNote
          }
        }
      }
    }

    // Fallback default
    const notes = notesMap[activeItem] || []
    return {
      id: activeItem,
      title: 'Note Workspace',
      parentTitle: 'Spaces',
      type: 'space',
      iconColor: 'bg-slate-600',
      notes,
      currentNote: notes[0] || null
    }
  }, [activeItem, spaces, notesMap, selectedNoteId])

  // Select Item on Sidebar (automatically selects first note of that item)
  const selectItem = (itemId) => {
    setActiveItemState(itemId)
    const itemNotes = notesMap[itemId] || []
    if (itemNotes.length > 0) {
      setSelectedNoteId(itemNotes[0].id)
    } else {
      setSelectedNoteId(`default-${itemId}`)
    }
  }

  // Select specific note within active item
  const selectNote = (noteId) => {
    setSelectedNoteId(noteId)
  }

  // Create new note under current activeItem
  const addNote = (newNoteData) => {
    const noteId = `note-${Date.now()}`
    const newNote = {
      id: noteId,
      title: newNoteData?.title || `Untitled Note ${Date.now().toString().slice(-6)}`,
      content: newNoteData?.content || '',
      modifiedDate: 'Hôm nay',
      createdDate: 'Tạo hôm nay'
    }

    setNotesMap(prev => ({
      ...prev,
      [activeItem]: [newNote, ...(prev[activeItem] || [])]
    }))
    setSelectedNoteId(noteId)
    return newNote
  }

  // Add new Space
  const addSpace = (newSpace) => {
    setSpaces(prev => [newSpace, ...prev])
    selectItem(newSpace.id)
  }

  return {
    spaces,
    activeItem,
    activeNavInfo,
    selectedNoteId,
    selectItem,
    selectNote,
    addNote,
    addSpace
  }
}
