import { useMemo, useState } from 'react'
import type { Category, Task } from '../../types'

interface Props {
  tasks: Task[]
  categories: Category[]
}

const categoryPalette = [
  'var(--tn-primary)',
  'var(--tn-status-completed)',
  'var(--tn-status-progress)',
  'var(--tn-status-todo)',
  'var(--tn-danger)',
  'var(--tn-text-subtle)',
]

const numberFormat = new Intl.NumberFormat()
function CompletedTrend({ tasks }: { tasks: Task[] }) {
  const [now] = useState(() => new Date())
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const daily = useMemo(() => {
    const counts = Array.from({ length: daysInMonth }, () => 0)
    tasks.forEach((task) => {
      if (task.status !== 'Completed') return
      const completedDate = task.completedAt || task.updatedAt
      if (!completedDate) return
      const date = new Date(completedDate)
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month) return
      counts[date.getDate() - 1] += 1
    })
    return counts
  }, [tasks, daysInMonth, year, month])

  const total = daily.reduce((sum, value) => sum + value, 0)
  const max = Math.max(1, ...daily)
  const width = 720
  const height = 220
  const left = 34
  const right = 12
  const top = 16
  const bottom = 28
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const x = (index: number) => left + (daysInMonth <= 1 ? 0 : (index / (daysInMonth - 1)) * plotWidth)
  const y = (value: number) => top + plotHeight - (value / max) * plotHeight
  const points = daily.map((value, index) => `${x(index)},${y(value)}`).join(' ')
  const area = `${left},${top + plotHeight} ${points} ${x(daysInMonth - 1)},${top + plotHeight}`
  const tickDays = Array.from(new Set([1,  Math.ceil(daysInMonth / 4), Math.ceil(daysInMonth / 2), Math.ceil((daysInMonth * 3) / 4), daysInMonth]))

  return (
    <article className="min-w-0 rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--tn-text)]">Tasks completed</h3>
          <p className="mt-1 text-xs text-[var(--tn-text-subtle)]">Daily completion trend · {monthName}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold leading-none tracking-tight tabular-nums text-[var(--tn-text)]">{numberFormat.format(total)}</p>
          <p className="mt-1 text-[11px] text-[var(--tn-text-muted)]">completed this month</p>
        </div>
      </div>

      <div className="mt-5 w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Daily tasks completed in ${monthName}. ${total} tasks completed so far.`} className="block h-auto w-full overflow-visible">
          {[0, 1, 2, 3].map((step) => {
            const value = (max * step) / 3
            const lineY = y(value)
            return <g key={step}>
              <line x1={left} x2={width - right} y1={lineY} y2={lineY} stroke="var(--tn-border)" strokeDasharray="3 5" />
              <text x={left - 9} y={lineY + 4} textAnchor="end" fontSize="10" fill="var(--tn-text-subtle)">{Math.round(value)}</text>
            </g>
          })}
          <polygon points={area} fill="var(--tn-primary)" opacity="0.10" />
          <polyline points={points} fill="none" stroke="var(--tn-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {daily.map((value, index) => value > 0 ? <circle key={index} cx={x(index)} cy={y(value)} r="3.5" fill="var(--tn-primary)" stroke="var(--tn-surface)" strokeWidth="2" /> : null)}
          {tickDays.map((day) => <text key={day} x={x(day - 1)} y={height - 7} textAnchor="middle" fontSize="10" fill="var(--tn-text-subtle)">{day}</text>)}
        </svg>
      </div>
      {total === 0 && <p className="-mt-1 text-center text-xs text-[var(--tn-text-subtle)]">No tasks completed yet this month.</p>}
    </article>
  )
}

function CategoryDistribution({ tasks, categories }: Props) {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const data = useMemo(() => {
    const grouped = new Map<string, { id: string; name: string; created: number; completed: number; open: number }>()
    tasks.forEach((task) => {
      const category = categories.find((item) => item.id === task.categoryId)
      const id = category?.id ?? 'uncategorized'
      const current = grouped.get(id) ?? { id, name: category?.name ?? 'Uncategorized', created: 0, completed: 0, open: 0 }
      current.created += 1
      if (task.status === 'Completed') current.completed += 1
      else current.open += 1
      grouped.set(id, current)
    })
    return [...grouped.values()].sort((a, b) => b.created - a.created || a.name.localeCompare(b.name))
  }, [tasks, categories])

  const total = data.reduce((sum, item) => sum + item.created, 0)
  const active = data.find((item) => item.id === activeKey) ?? null
  const radius = 72
  const circumference = 2 * Math.PI * radius
  const segments = data.map((item, index) => {
    const length = total ? (item.created / total) * circumference : 0
    const offset = data.slice(0, index).reduce((sum, previous) => sum + (total ? (previous.created / total) * circumference : 0), 0)
    return { item, index, length, dashOffset: -offset }
  })

  return (
    <article className="min-w-0 rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--tn-text)]">Category distribution</h3>
          <p className="mt-1 text-xs text-[var(--tn-text-subtle)]">Tasks created, completed and remaining by category</p>
        </div>
        <span className="rounded-md bg-[var(--tn-surface-muted)] px-2 py-1 text-[10px] font-medium text-[var(--tn-text-muted)]">All time</span>
      </div>

      {data.length === 0 ? (
        <div className="flex min-h-[220px] items-center justify-center text-center text-xs text-[var(--tn-text-subtle)]">Category insights will appear once you create tasks.</div>
      ) : (
        <div className="mt-5 grid items-center gap-5 sm:grid-cols-[minmax(150px,0.9fr)_minmax(0,1.1fr)]">
          <div className="relative mx-auto aspect-square w-full max-w-[210px]" onPointerLeave={() => setActiveKey(null)}>
            <svg viewBox="0 0 200 200" role="img" aria-label={`Donut chart showing ${total} tasks across ${data.length} categories.`} className="h-full w-full -rotate-90">
              <circle cx="100" cy="100" r={radius} fill="none" stroke="var(--tn-surface-muted)" strokeWidth="25" />
              {segments.map(({ item, index, length, dashOffset }) => (
                <circle key={item.id} cx="100" cy="100" r={radius} fill="none" stroke={categoryPalette[index % categoryPalette.length]} strokeWidth={activeKey === item.id ? 30 : 25} strokeDasharray={`${Math.max(0, length - 2)} ${circumference}`} strokeDashoffset={dashOffset} strokeLinecap="butt" className="cursor-pointer transition-all duration-150" opacity={activeKey && activeKey !== item.id ? 0.25 : 1} onPointerEnter={() => setActiveKey(item.id)} />
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] text-[var(--tn-text-subtle)]">{active?.name ?? 'Created tasks'}</span>
              <strong className="mt-1 text-3xl font-semibold leading-none tracking-tight tabular-nums text-[var(--tn-text)]">{numberFormat.format(active?.created ?? total)}</strong>
              <span className="mt-1 text-[11px] text-[var(--tn-text-muted)]">{active ? `${Math.round((active.created / total) * 100)}% of tasks` : 'across categories'}</span>
              {active && <span className="mt-1 text-[10px] font-medium text-[var(--tn-status-completed)]">{active.completed} completed</span>}
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-2 grid grid-cols-[minmax(0,1fr)_48px_58px_42px_58px] gap-1.5 border-b border-[var(--tn-border)] pb-2 text-[10px] font-medium uppercase tracking-wide text-[var(--tn-text-subtle)]">
              <span>Category</span>
              <span className="text-right">Created</span>
              <span className="text-right">Completed</span>
              <span className="text-right">Open</span>
              <span className="text-right">Rate</span>
            </div>
            <div className="max-h-[220px] space-y-0.5 overflow-y-auto">
              {data.map((item, index) => (
                <button key={item.id} type="button" onPointerEnter={() => setActiveKey(item.id)} onFocus={() => setActiveKey(item.id)} onBlur={() => setActiveKey(null)} onClick={() => setActiveKey(activeKey === item.id ? null : item.id)} className={`grid w-full grid-cols-[minmax(0,1fr)_48px_58px_42px_58px] items-center gap-1.5 rounded-md px-2 py-2 text-left text-xs transition-colors ${activeKey === item.id ? 'bg-[var(--tn-surface-muted)]' : 'hover:bg-[var(--tn-surface-muted)]'}`}>
                  <span className="flex min-w-0 items-center gap-2 font-medium text-[var(--tn-text)]"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: categoryPalette[index % categoryPalette.length] }} /><span className="truncate">{item.name}</span></span>
                  <span className="text-right tabular-nums text-[var(--tn-text)]">{item.created}</span>
                  <span className="text-right tabular-nums text-[var(--tn-status-completed)]">{item.completed}</span>
                  <span className="text-right tabular-nums text-[var(--tn-text-muted)]">{item.open}</span>
                  <span className="text-right tabular-nums text-[var(--tn-primary)]">{Math.round((item.completed / item.created) * 100)}%</span>
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_48px_58px_42px_58px] gap-1.5 border-t border-[var(--tn-border)] pt-3 text-xs font-semibold text-[var(--tn-text)]">
              <span>Total</span>
              <span className="text-right tabular-nums">{total}</span>
              <span className="text-right tabular-nums text-[var(--tn-status-completed)]">{data.reduce((sum, item) => sum + item.completed, 0)}</span>
              <span className="text-right tabular-nums text-[var(--tn-text-muted)]">{data.reduce((sum, item) => sum + item.open, 0)}</span>
              <span className="text-right tabular-nums text-[var(--tn-primary)]">{total ? Math.round((data.reduce((sum, item) => sum + item.completed, 0) / total) * 100) : 0}%</span>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

export default function GraphCards({ tasks, categories }: Props) {
  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-2" aria-label="Task analytics">
      <CompletedTrend tasks={tasks} />
      <CategoryDistribution tasks={tasks} categories={categories} />
    </section>
  )
}
