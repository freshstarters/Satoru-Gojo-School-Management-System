import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState.tsx'

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  empty,
}: {
  columns: { key: string; header: string; render: (row: T) => ReactNode; numeric?: boolean }[]
  rows: T[]
  empty: string
}) {
  if (rows.length === 0) return <EmptyState>{empty}</EmptyState>
  return (
    <div className="crm-card overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[11px] uppercase text-sub">
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-2 font-medium">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t crm-border">
              {columns.map((column) => (
                <td key={column.key} className={`px-4 py-3 text-body ${column.numeric ? 'num-tabular' : ''}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
