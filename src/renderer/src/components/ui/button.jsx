import React from 'react'

export const Button = React.forwardRef(({ children, variant = 'default', size = 'default', className = '', ...props }, ref) => {
  const getVariant = () => {
    switch (variant) {
      case 'outline':
        return 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
      case 'ghost':
        return 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
      case 'secondary':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
      case 'black':
        return 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90 shadow-2xs font-bold'
      case 'purple':
        return 'bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-2xs'
      case 'default':
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-2xs'
    }
  }

  const getSize = () => {
    switch (size) {
      case 'sm':
        return 'px-2.5 py-1 text-xs'
      case 'lg':
        return 'px-4 py-2 text-sm'
      case 'icon':
        return 'p-1.5'
      case 'default':
      default:
        return 'px-3 py-1.5 text-xs'
    }
  }

  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-md font-semibold transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${getVariant()} ${getSize()} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
})

Button.displayName = 'Button'
export default Button
