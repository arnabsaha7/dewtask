import { useMemo, useState } from 'react'
import {
  ChevronLeft, ChevronRight, SlidersHorizontal, PanelLeftClose,
  PanelLeftOpen, CheckCircle2, Circle,
} from 'lucide-react'
import type { Category, Task, Workspace } from '../../types'
import AutoProgressIndicator from '../tasks/AutoProgressIndicator'

type ViewMode = 'Week' | 'Month' | 'Day' | 'Agenda'

interface Props {
  tasks: Task[]
  workspaces: Workspace[]
  categories: Category[]
  onSelectTask: (task: Task) => void
  onUpdateTask: (id: string, updates: Partial<Task>) => void
  onToggleTask: (id: string) => void
  onCreateTask: (date: string, scheduledStart?: string | null, scheduledEnd?: string | null) => void
}

const pad = (value: number) => String(value).padStart(2, '0')
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const addDays = (date: Date, amount: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}
const startOfWeek = (date: Date) => {
  const result = startOfDay(date)
  result.setDate(result.getDate() - result.getDay())
  return result
}
const formatMonth = (date: Date) => date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
const formatShortDate = (date: Date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const calendarStart = (task: Task) =>
  task.autoProgressionEnabled && task.autoProgressionStartAt
    ? task.autoProgressionStartAt
    : task.scheduledStart
const taskDate = (task: Task) => {
  const start = calendarStart(task)
  return start ? dateKey(new Date(start)) : task.dueDate
}

function taskSurface(task: Task) {
  if (task.status === 'Completed') return 'border-[var(--tn-status-completed)]/40 bg-[var(--tn-status-completed-soft)]'
  if (task.priority === 'Critical') return 'border-[var(--tn-danger)]/35 bg-[var(--tn-danger-soft)]'
  if (task.priority === 'High') return 'border-[var(--tn-warning)]/35 bg-[var(--tn-warning-soft)]'
  return 'border-[var(--tn-primary)]/30 bg-[var(--tn-primary-soft)]'
}

export default function CalendarPage({
  tasks, workspaces, categories, onSelectTask, onUpdateTask, onToggleTask, onCreateTask,
}: Props) {
  const [today] = useState(() => startOfDay(new Date()))
  const [cursor, setCursor] = useState(() => startOfDay(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const [view, setView] = useState<ViewMode>('Week')
  const [workspaceFilter, setWorkspaceFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showCompleted, setShowCompleted] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [miniMonth, setMiniMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  const visibleTasks = useMemo(() => tasks.filter(task =>
    (workspaceFilter === 'all' || task.workspaceId === workspaceFilter) &&
    (categoryFilter === 'all' || task.categoryId === categoryFilter) &&
    (showCompleted || task.status !== 'Completed')
  ), [tasks, workspaceFilter, categoryFilter, showCompleted])

  const selected = new Date(`${selectedDate}T12:00:00`)
  const weekStart = startOfWeek(cursor)
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const monthGridStart = startOfWeek(monthStart)
  const monthDays = Array.from({ length: 42 }, (_, index) => addDays(monthGridStart, index))
  const dayTasks = visibleTasks.filter(task => taskDate(task) === selectedDate)
  const inboxTasks = visibleTasks.filter(task => !taskDate(task))
  const todayKey = dateKey(today)

  const navigate = (direction: number) => {
    const next = new Date(cursor)
    if (view === 'Month') next.setMonth(next.getMonth() + direction)
    else if (view === 'Day') next.setDate(next.getDate() + direction)
    else next.setDate(next.getDate() + direction * 7)
    setCursor(next)
    setSelectedDate(dateKey(next))
    setMiniMonth(new Date(next.getFullYear(), next.getMonth(), 1))
  }

  const jumpToDate = (date: Date) => {
    setCursor(startOfDay(date))
    setSelectedDate(dateKey(date))
    setMiniMonth(new Date(date.getFullYear(), date.getMonth(), 1))
  }

  const handleDrop = (event: React.DragEvent, date: Date) => {
    event.preventDefault()
    const taskId = event.dataTransfer.getData('text/tasknest-task')
    const task = tasks.find(item => item.id === taskId)
    if (!task) return
    const targetDate = dateKey(date)
    if (task.scheduledStart) {
      const oldStart = new Date(task.scheduledStart)
      const oldEnd = task.scheduledEnd ? new Date(task.scheduledEnd) : null
      const nextStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), oldStart.getHours(), oldStart.getMinutes())
      const duration = oldEnd ? oldEnd.getTime() - oldStart.getTime() : 60 * 60 * 1000
      onUpdateTask(task.id, {
        scheduledStart: nextStart.toISOString(),
        scheduledEnd: new Date(nextStart.getTime() + duration).toISOString(),
      })
    } else {
      onUpdateTask(task.id, { dueDate: targetDate })
    }
  }

  const taskChip = (task: Task, compact = false) => (
    <div key={task.id} className="min-w-0">
      <button
        type="button"
        draggable
        onDragStart={event => event.dataTransfer.setData('text/tasknest-task', task.id)}
        onClick={(event) => { event.stopPropagation(); onSelectTask(task) }}
        className={`flex w-full min-w-0 items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition hover:border-[var(--tn-primary)] hover:brightness-105 ${taskSurface(task)}`}
        title={task.title}
      >
        {task.status === 'Completed'
          ? <CheckCircle2 size={12} className="shrink-0 text-[var(--tn-status-completed)]" />
          : <Circle size={12} className="shrink-0 text-[var(--tn-text-muted)]" />}
        <span className={`min-w-0 flex-1 truncate font-medium ${task.status === 'Completed' ? 'text-[var(--tn-status-completed)]' : 'text-[var(--tn-text)]'} ${compact ? 'text-[10px]' : 'text-xs'}`}>{task.title}</span>
        <AutoProgressIndicator task={task} compact />
      </button>
    </div>
  )

  const dateCell = (date: Date, compact = false) => {
    const key = dateKey(date)
    const dateTasks = visibleTasks.filter(task => taskDate(task) === key)
    const isCurrentMonth = date.getMonth() === cursor.getMonth()
    return (
      <div
        key={key}
        onDragOver={event => event.preventDefault()}
        onDrop={event => handleDrop(event, date)}
        onClick={() => jumpToDate(date)}
        className={`min-h-[104px] cursor-pointer border-b border-r border-[var(--tn-border)] p-2 transition hover:bg-[var(--tn-surface-hover)] ${!isCurrentMonth && compact ? 'opacity-45' : ''} ${key === todayKey ? 'bg-[var(--tn-primary-soft)]/40' : ''} ${key === selectedDate ? 'ring-1 ring-inset ring-[var(--tn-primary)]' : ''}`}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs ${key === todayKey ? 'bg-[var(--tn-primary)] font-semibold text-[var(--tn-bg)]' : 'text-[var(--tn-text-muted)]'}`}>{date.getDate()}</span>
          {dateTasks.length > 0 && <span className="text-[10px] text-[var(--tn-text-subtle)]">{dateTasks.length}</span>}
        </div>
        <div className="space-y-1">
          {dateTasks.slice(0, compact ? 2 : 3).map(task => taskChip(task, true))}
          {dateTasks.length > (compact ? 2 : 3) && <span className="block px-1 text-[10px] text-[var(--tn-text-muted)]">+{dateTasks.length - (compact ? 2 : 3)} more</span>}
        </div>
      </div>
    )
  }

  const monthPicker = (
    <div className="rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--tn-text)]">{formatMonth(miniMonth)}</span>
        <div className="flex gap-1">
          <button type="button" aria-label="Previous month" onClick={() => setMiniMonth(new Date(miniMonth.getFullYear(), miniMonth.getMonth()-1, 1))} className="rounded-lg p-1.5 text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)]"><ChevronLeft size={15}/></button>
          <button type="button" aria-label="Next month" onClick={() => setMiniMonth(new Date(miniMonth.getFullYear(), miniMonth.getMonth()+1, 1))} className="rounded-lg p-1.5 text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)]"><ChevronRight size={15}/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {['S','M','T','W','T','F','S'].map((day, index) => <span key={`${day}-${index}`} className="py-1 text-[10px] font-medium text-[var(--tn-text-subtle)]">{day}</span>)}
        {Array.from({ length: 42 }, (_, index) => addDays(startOfWeek(new Date(miniMonth.getFullYear(), miniMonth.getMonth(), 1)), index)).map(date => {
          const key = dateKey(date)
          const hasTasks = visibleTasks.some(task => taskDate(task) === key)
          return <button key={key} type="button" onClick={() => jumpToDate(date)} className={`relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] transition ${date.getMonth() !== miniMonth.getMonth() ? 'text-[var(--tn-text-subtle)]/50' : 'text-[var(--tn-text)]'} ${key === todayKey ? 'bg-[var(--tn-primary)] font-semibold text-[var(--tn-bg)]' : ''} ${key === selectedDate && key !== todayKey ? 'ring-1 ring-[var(--tn-primary)]' : ''} hover:bg-[var(--tn-surface-hover)]`}>
            {date.getDate()}
            {hasTasks && <span className="absolute bottom-0 h-1 w-1 rounded-full bg-[var(--tn-primary)]"/>}
          </button>
        })}
      </div>
    </div>
  )

  const headerRange = view === 'Month'
    ? formatMonth(cursor)
    : view === 'Day'
      ? selected.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : `${formatShortDate(weekDays[0])} – ${formatShortDate(weekDays[6])}, ${weekDays[6].getFullYear()}`

  const timeGrid = (days: Date[]) => {
    const hours = Array.from({ length: 15 }, (_, index) => index + 7)
    const columns = days.length
    return (
      <div className="min-w-[760px]">
        <div className="grid border-b border-[var(--tn-border)]" style={{ gridTemplateColumns: `58px repeat(${columns}, minmax(0, 1fr))` }}>
          <div className="border-r border-[var(--tn-border)]"/>
          {days.map(date => <button key={dateKey(date)} type="button" onClick={() => jumpToDate(date)} className={`border-r border-[var(--tn-border)] px-2 py-3 text-center hover:bg-[var(--tn-surface-hover)] ${dateKey(date) === todayKey ? 'bg-[var(--tn-primary-soft)]/40' : ''}`}>
            <span className="block text-[10px] uppercase text-[var(--tn-text-subtle)]">{date.toLocaleDateString(undefined,{weekday:'short'})}</span>
            <span className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${dateKey(date) === todayKey ? 'bg-[var(--tn-primary)] text-[var(--tn-bg)]' : 'text-[var(--tn-text)]'}`}>{date.getDate()}</span>
          </button>)}
        </div>
        <div className="grid" style={{ gridTemplateColumns: `58px repeat(${columns}, minmax(0, 1fr))` }}>
          <div>{hours.map(hour => <div key={hour} className="h-16 border-b border-[var(--tn-border)] pr-2 pt-1 text-right text-[10px] text-[var(--tn-text-subtle)]">{hour === 12 ? '12 PM' : hour > 12 ? `${hour-12} PM` : `${hour} AM`}</div>)}</div>
          {days.map(date => {
            const key = dateKey(date)
            const scheduled = visibleTasks.filter(task => {
              const start = calendarStart(task)
              return start && dateKey(new Date(start)) === key
            })
            const allDay = visibleTasks.filter(task => task.dueDate === key && !calendarStart(task))
            return <div key={key} className={`relative border-l border-[var(--tn-border)] ${key === todayKey ? 'bg-[var(--tn-primary-soft)]/20' : ''}`} onDragOver={event => event.preventDefault()} onDrop={event => handleDrop(event,date)}>
              <div className="absolute inset-x-1 top-1 z-10 space-y-1">{allDay.map(task => taskChip(task,true))}</div>
              {hours.map(hour => <button key={hour} type="button" aria-label={`Create task ${hour}:00 on ${key}`} onClick={() => {
                const start = new Date(date.getFullYear(),date.getMonth(),date.getDate(),hour)
                const end = new Date(start.getTime()+60*60*1000)
                onCreateTask(key,start.toISOString(),end.toISOString())
              }} className="block h-16 w-full border-b border-dashed border-[var(--tn-border)]/80 text-left hover:bg-[var(--tn-primary-soft)]/30"/> )}
              {scheduled.map(task => {
                const startValue = calendarStart(task)!
                const start = new Date(startValue)
                const endValue = task.autoProgressionEnabled && task.autoProgressionEndAt
                  ? task.autoProgressionEndAt
                  : task.scheduledEnd
                const end = endValue ? new Date(endValue) : new Date(start.getTime()+60*60*1000)
                const top = ((start.getHours()-7)*60+start.getMinutes())/60*64
                const height = Math.max(34,Math.min(15*64-top,((end.getTime()-start.getTime())/60000)/60*64))
                return <div key={task.id} style={{top:`${top}px`}} className="absolute left-1 right-1 z-20 overflow-visible">
                  <button type="button" draggable onDragStart={event=>event.dataTransfer.setData('text/tasknest-task',task.id)} onClick={()=>onSelectTask(task)} style={{height:`${height}px`}} className={`flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border px-2 py-1.5 text-left shadow-sm ${taskSurface(task)}`}>
                    <span className={`min-w-0 flex-1 truncate text-[11px] font-semibold ${task.status === 'Completed' ? 'text-[var(--tn-status-completed)]' : 'text-[var(--tn-text)]'}`}>{task.title}</span>
                    <AutoProgressIndicator task={task} compact />
                  </button>
                </div>
              })}
            </div>
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] min-w-0 flex-col bg-[var(--tn-bg)] text-[var(--tn-text)]">
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-[var(--tn-border)] px-5 py-3 lg:px-7">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setSidebarOpen(value => !value)} aria-label={sidebarOpen ? 'Collapse calendar sidebar' : 'Expand calendar sidebar'} className="rounded-lg border border-[var(--tn-border)] p-2 text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)]">
            {sidebarOpen ? <PanelLeftClose size={16}/> : <PanelLeftOpen size={16}/>}
          </button>
          <div className="min-w-0"><p className="text-sm font-medium text-[var(--tn-text)]">{headerRange}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => jumpToDate(new Date())} className="rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] px-3 py-2 text-xs font-medium text-[var(--tn-text)] transition hover:bg-[var(--tn-surface-hover)]">Today</button>
          <div className="flex items-center rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] p-0.5">
            <button type="button" aria-label="Previous period" onClick={()=>navigate(-1)} className="rounded-md p-1.5 hover:bg-[var(--tn-surface-hover)]"><ChevronLeft size={16}/></button>
            <button type="button" aria-label="Next period" onClick={()=>navigate(1)} className="rounded-md p-1.5 hover:bg-[var(--tn-surface-hover)]"><ChevronRight size={16}/></button>
          </div>
          <div className="flex rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] p-0.5">
            {(['Month','Week','Day','Agenda'] as ViewMode[]).map(item=><button key={item} type="button" onClick={()=>setView(item)} className={`rounded-md px-2.5 py-1.5 text-xs transition ${view===item?'bg-[var(--tn-nav-active-bg)] font-semibold text-[var(--tn-nav-active-text)]':'text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]'}`}>{item}</button>)}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {sidebarOpen && <aside className="hidden w-[270px] shrink-0 flex-col gap-4 border-r border-[var(--tn-border)] bg-[var(--tn-bg)] p-4 xl:flex">
          {monthPicker}
          <div className="space-y-2">
            <div className="flex items-center justify-between"><h2 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--tn-text-subtle)]">Task filters</h2><SlidersHorizontal size={13} className="text-[var(--tn-text-subtle)]"/></div>
            <label className="block text-[11px] text-[var(--tn-text-muted)]">Workspace</label>
            <select
              value={workspaceFilter}
              onChange={event => setWorkspaceFilter(event.target.value)}
              className="w-full appearance-none rounded-lg border border-[var(--tn-border)] bg-[var(--tn-input)] px-2.5 py-2 text-xs text-[var(--tn-text)] outline-none transition focus:border-[var(--tn-primary)] focus:ring-2 focus:ring-[var(--tn-primary)]/20"
              style={{ colorScheme: 'normal', accentColor: 'var(--tn-primary)' }}
            >
              <option value="all" style={{ backgroundColor: 'var(--tn-surface)', color: 'var(--tn-text)' }}>All workspaces</option>
              {workspaces.map(workspace => (
                <option key={workspace.id} value={workspace.id} style={{ backgroundColor: 'var(--tn-surface)', color: 'var(--tn-text)' }}>
                  {workspace.name}
                </option>
              ))}
            </select>
            <label className="block pt-1 text-[11px] text-[var(--tn-text-muted)]">Category</label>
            <select
              value={categoryFilter}
              onChange={event => setCategoryFilter(event.target.value)}
              className="w-full appearance-none rounded-lg border border-[var(--tn-border)] bg-[var(--tn-input)] px-2.5 py-2 text-xs text-[var(--tn-text)] outline-none transition focus:border-[var(--tn-primary)] focus:ring-2 focus:ring-[var(--tn-primary)]/20"
              style={{ colorScheme: 'normal', accentColor: 'var(--tn-primary)' }}
            >
              <option value="all" style={{ backgroundColor: 'var(--tn-surface)', color: 'var(--tn-text)' }}>All categories</option>
              {categories
                .filter(category => workspaceFilter === 'all' || category.workspaceId === workspaceFilter)
                .map(category => (
                  <option key={category.id} value={category.id} style={{ backgroundColor: 'var(--tn-surface)', color: 'var(--tn-text)' }}>
                    {category.name}
                  </option>
                ))}
            </select>
            <label className="flex cursor-pointer items-center gap-2 pt-2 text-xs text-[var(--tn-text-muted)]"><input type="checkbox" checked={showCompleted} onChange={event=>setShowCompleted(event.target.checked)}/> Show completed tasks</label>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            <div className="flex items-center justify-between"><h2 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--tn-text-subtle)]">Inbox · Unscheduled</h2><span className="text-[10px] text-[var(--tn-text-subtle)]">{inboxTasks.length}</span></div>
            {inboxTasks.slice(0,12).map(task=><div key={task.id}>{taskChip(task)}</div>)}
            {inboxTasks.length===0 && <p className="rounded-lg border border-dashed border-[var(--tn-border)] p-3 text-xs text-[var(--tn-text-subtle)]">No unscheduled tasks.</p>}
            <div className="pt-3"><h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--tn-text-subtle)]">Selected date · {formatShortDate(selected)}</h2>
              {dayTasks.map(task=><div key={task.id} className="mb-1">{taskChip(task)}</div>)}
              {dayTasks.length===0 && <p className="text-xs text-[var(--tn-text-subtle)]">Nothing planned for this date.</p>}
            </div>
          </div>
        </aside>}

        <section className="min-w-0 flex-1 overflow-auto p-4 lg:p-5">
          {view==='Week' && <div className="overflow-x-auto rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)]">{timeGrid(weekDays)}</div>}
          {view==='Day' && <div className="overflow-x-auto rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)]">{timeGrid([selected])}</div>}
          {view==='Month' && <div className="overflow-hidden rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)]">
            <div className="grid grid-cols-7 border-b border-[var(--tn-border)]">{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day=><div key={day} className="px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--tn-text-subtle)]">{day.slice(0,3)}</div>)}</div>
            <div className="grid grid-cols-7">{monthDays.map(date=>dateCell(date,true))}</div>
          </div>}
          {view==='Agenda' && <div className="mx-auto max-w-3xl space-y-3">
            {Array.from({length:30},(_,index)=>addDays(today,index)).map(date=>{
              const key=dateKey(date); const items=visibleTasks.filter(task=>taskDate(task)===key)
              if(!items.length) return null
              return <div key={key} className="rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-4">
                <h3 className="mb-3 text-sm font-semibold">{date.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}</h3>
                <div className="space-y-2">{items.map(task=><div key={task.id} className="flex items-center gap-2">{taskChip(task)}<button type="button" title={task.status==='Completed'?'Mark incomplete':'Mark complete'} onClick={()=>onToggleTask(task.id)} className="rounded-lg p-2 text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)]">{task.status==='Completed'?<CheckCircle2 size={16}/>:<Circle size={16}/>}</button></div>)}</div>
              </div>
            })}
            {!visibleTasks.some(task=>taskDate(task)) && <div className="rounded-xl border border-dashed border-[var(--tn-border)] p-10 text-center text-sm text-[var(--tn-text-muted)]">No dated tasks yet. Add a due date or schedule a task to see it here.</div>}
          </div>}
        </section>
      </div>
    </div>
  )
}
