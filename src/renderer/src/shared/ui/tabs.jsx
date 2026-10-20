import React, { createContext, useContext } from 'react'

const TabsContext = createContext({ value: '', onValueChange: () => {} })

export const Tabs = ({ value, onValueChange, defaultValue, children, className = '' }) => {
  const [currentValue, setCurrentValue] = React.useState(defaultValue || value || '')
  
  const selectedValue = value !== undefined ? value : currentValue
  const handleValueChange = (val) => {
    if (onValueChange) onValueChange(val)
    setCurrentValue(val)
  }

  return (
    <TabsContext.Provider value={{ value: selectedValue, onValueChange: handleValueChange }}>
      <div className={`w-full ${className}`}>{children}</div>
    </TabsContext.Provider>
  )
}

export const TabsList = ({ children, className = '' }) => {
  return (
    <div className={`inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 ${className}`}>
      {children}
    </div>
  )
}

export const TabsTrigger = ({ value, children, className = '' }) => {
  const { value: activeValue, onValueChange } = useContext(TabsContext)
  const isActive = activeValue === value

  return (
    <button
      type="button"
      onClick={() => onValueChange(value)}
      className={`px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer border-b-2 ${
        isActive
          ? 'text-purple-600 dark:text-purple-400 border-purple-600 dark:border-purple-400 font-bold bg-slate-50/80 dark:bg-slate-900/60'
          : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export const TabsContent = ({ value, children, className = '' }) => {
  const { value: activeValue } = useContext(TabsContext)
  if (activeValue !== value) return null

  return <div className={`flex-1 w-full h-full ${className}`}>{children}</div>
}

export default Tabs
