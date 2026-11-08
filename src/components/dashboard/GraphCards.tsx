import { useMemo } from 'react'
import type { Category, Task } from '../../types'

interface Props {
  tasks: Task[]
  allTasks: Task[]
  categories: Category[]
  range: 'week' | 'month' | 'all'
  rangeLabel: string
}

const chartColors = [
  'var(--tn-chart-category-1)',
  'var(--tn-chart-category-2)',
  'var(--tn-chart-category-3)',
  'var(--tn-chart-category-4)',
  'var(--tn-chart-category-5)',
  'var(--tn-chart-category-6)',
]

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

export default function GraphCards({ tasks, allTasks, categories, range, rangeLabel }: Props) {
  const completionTrend = useMemo(() => {
    const now = new Date()
    const buckets: { key: string; label: string; count: number }[] = []
    const completedDates = allTasks
      .filter((task) => task.status === 'Completed')
      .map((task) => task.completedAt || task.updatedAt)
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))

    if (range === 'all') {
      if (!completedDates.length) return buckets
      const firstDate = completedDates.reduce((min, date) => date < min ? date : min, completedDates[0])
      const cursor = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 1)
      while (cursor <= end) {
        buckets.push({
          key: monthKey(cursor),
          label: cursor.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
          count: 0,
        })
        cursor.setMonth(cursor.getMonth() + 1)
      }
      completedDates.forEach((date) => {
        const bucket = buckets.find((item) => item.key === monthKey(date))
        if (bucket) bucket.count += 1
      })
      return buckets
    }

    const start = range === 'week'
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
      : new Date(now.getFullYear(), now.getMonth(), 1)
    const count = range === 'week' ? 7 : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    for (let i = 0; i < count; i += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      buckets.push({
        key: dayKey(date),
        label: range === 'week' ? date.toLocaleDateString(undefined, { weekday: 'short' }) : String(date.getDate()),
        count: 0,
      })
    }
    completedDates.forEach((date) => {
      const bucket = buckets.find((item) => item.key === dayKey(date))
      if (bucket) bucket.count += 1
    })
    return buckets
  }, [allTasks, range])

  const categoryBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    tasks.forEach((task) => counts.set(task.categoryId || '', (counts.get(task.categoryId || '') ?? 0) + 1))
    return Array.from(counts, ([id, count]) => ({
      id,
      count,
      name: categories.find((category) => category.id === id)?.name ?? 'Uncategorized',
    })).sort((a, b) => b.count - a.count)
  }, [tasks, categories])

  const maxCount = Math.max(1, ...completionTrend.map((item) => item.count))
  const totalTasks = categoryBreakdown.reduce((sum, item) => sum + item.count, 0)

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-2" aria-label="Task analytics">
      <article className="min-w-0 rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-5">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--tn-text)]">Completed tasks</h3>
            <p className="mt-1 text-xs text-[var(--tn-text-subtle)]">Completion trend · {rangeLabel}</p>
          </div>
          <span className="text-xs text-[var(--tn-text-muted)]">{completionTrend.reduce((sum, item) => sum + item.count, 0)} completed</span>
        </div>
        {completionTrend.length === 0 ? (
          <div className="flex h-44 items-center justify-center text-xs text-[var(--tn-text-subtle)]">No completed tasks to chart yet.</div>
        ) : (
          <div className="flex h-44 items-end gap-1.5" role="img" aria-label={`Completed tasks ${rangeLabel}: ${completionTrend.map((item) => `${item.label}: ${item.count}`).join(', ')}`}>
            {completionTrend.map((item) => (
              <div key={item.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[10px] tabular-nums text-[var(--tn-text-muted)]">{item.count || ''}</span>
                <div className="flex h-32 w-full items-end overflow-hidden rounded-t-md bg-[var(--tn-surface-muted)]">
                  <div className="w-full rounded-t-md transition-all" style={{ height: `${item.count ? Math.max(5, item.count / maxCount * 100) : 0}%`, backgroundColor: 'var(--tn-chart-category-2)' }} />
                </div>
                <span className="max-w-full truncate text-[10px] text-[var(--tn-text-subtle)]">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="min-w-0 rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-5">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[var(--tn-text)]">Tasks by category</h3>
          <p className="mt-1 text-xs text-[var(--tn-text-subtle)]">Current task distribution · {rangeLabel}</p>
        </div>
        {categoryBreakdown.length === 0 ? (
          <div className="flex h-44 items-center justify-center text-xs text-[var(--tn-text-subtle)]">No tasks in this period.</div>
        ) : (
          <div className="space-y-4">
            {categoryBreakdown.slice(0, 6).map((item, index) => {
              const percentage = totalTasks ? item.count / totalTasks * 100 : 0
              const color = chartColors[index % chartColors.length]
              return (
                <div key={item.id || 'uncategorized'}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="flex min-w-0 items-center gap-2 text-[var(--tn-text)]">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[var(--tn-text-muted)]">{item.count} · {Math.round(percentage)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--tn-surface-muted)]">
                    <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: color }} />
                  </div>
                </div>
              )
            })}
            {categoryBreakdown.length > 6 && <p className="pt-1 text-[11px] text-[var(--tn-text-subtle)]">+{categoryBreakdown.length - 6} more categories</p>}
          </div>
        )}
      </article>
    </section>
  )
}
