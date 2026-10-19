import React from 'react'

export const Table = React.forwardRef(({ className = '', ...props }, ref) => (
  <div className="relative w-full overflow-auto custom-scrollbar">
    <table
      ref={ref}
      className={`w-full caption-bottom text-xs border-collapse ${className}`}
      {...props}
    />
  </div>
))
Table.displayName = 'Table'

export const TableHeader = React.forwardRef(({ className = '', ...props }, ref) => (
  <thead ref={ref} className={`[&_tr]:border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-20 ${className}`} {...props} />
))
TableHeader.displayName = 'TableHeader'

export const TableBody = React.forwardRef(({ className = '', ...props }, ref) => (
  <tbody
    ref={ref}
    className={`[&_tr:last-child]:border-0 divide-y divide-slate-100 dark:divide-slate-900 ${className}`}
    {...props}
  />
))
TableBody.displayName = 'TableBody'

export const TableFooter = React.forwardRef(({ className = '', ...props }, ref) => (
  <tfoot
    ref={ref}
    className={`border-t bg-slate-100/50 font-medium [&>tr]:last:border-b-0 dark:bg-slate-800/50 ${className}`}
    {...props}
  />
))
TableFooter.displayName = 'TableFooter'

export const TableRow = React.forwardRef(({ className = '', ...props }, ref) => (
  <tr
    ref={ref}
    className={`border-b border-slate-100 dark:border-slate-900/80 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/50 data-[state=selected]:bg-slate-100 dark:data-[state=selected]:bg-slate-800 ${className}`}
    {...props}
  />
))
TableRow.displayName = 'TableRow'

export const TableHead = React.forwardRef(({ className = '', ...props }, ref) => (
  <th
    ref={ref}
    className={`h-9 px-3 text-left align-middle font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider [&:has([role=checkbox])]:pr-0 ${className}`}
    {...props}
  />
))
TableHead.displayName = 'TableHead'

export const TableCell = React.forwardRef(({ className = '', ...props }, ref) => (
  <td
    ref={ref}
    className={`p-2.5 align-middle [&:has([role=checkbox])]:pr-0 font-medium text-slate-800 dark:text-slate-200 ${className}`}
    {...props}
  />
))
TableCell.displayName = 'TableCell'

export const TableCaption = React.forwardRef(({ className = '', ...props }, ref) => (
  <caption
    ref={ref}
    className={`mt-4 text-xs text-slate-500 dark:text-slate-400 ${className}`}
    {...props}
  />
))
TableCaption.displayName = 'TableCaption'
