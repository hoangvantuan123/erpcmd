import React from 'react'

export const Badge = ({ children, variant = 'default', className = '', ...props }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
      case 'outline':
        return 'bg-transparent border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
      case 'destructive':
        return 'bg-red-500 text-white border-transparent'
      case 'purple':
        return 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
      case 'amber':
        return 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
      case 'blue':
        return 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
      case 'default':
      default:
        return 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent'
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${getVariantStyles()} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}

export default Badge
