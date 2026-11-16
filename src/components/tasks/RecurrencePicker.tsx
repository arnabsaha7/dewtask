import { Repeat } from 'lucide-react'
import type {
  RecurrenceEndType,
  RecurrenceFrequency,
  RecurrenceRule,
} from '../../types'
import { formatRecurrenceLabel, getNextDueDate } from '../../utils/recurrence'

interface Props {
  value: RecurrenceRule | null
  dueDate: string
  onChange: (next: RecurrenceRule | null) => void
  onEnsureDueDate?: () => void
}

const PRESETS: { label: string; frequency: RecurrenceFrequency | 'none' }[] = [
  { label: 'Does not repeat', frequency: 'none' },
  { label: 'Daily', frequency: 'daily' },
  { label: 'Weekly', frequency: 'weekly' },
  { label: 'Monthly', frequency: 'monthly' },
  { label: 'Yearly', frequency: 'yearly' },
]

const WEEKDAYS = [
  { label: 'S', value: 0, title: 'Sunday' },
  { label: 'M', value: 1, title: 'Monday' },
  { label: 'T', value: 2, title: 'Tuesday' },
  { label: 'W', value: 3, title: 'Wednesday' },
  { label: 'T', value: 4, title: 'Thursday' },
  { label: 'F', value: 5, title: 'Friday' },
  { label: 'S', value: 6, title: 'Saturday' },
]

export default function RecurrencePicker({
  value,
  dueDate,
  onChange,
  onEnsureDueDate,
}: Props) {
  const activeFrequency = value?.frequency ?? 'none'

  const handleFrequencyChange = (freq: RecurrenceFrequency | 'none') => {
    if (freq === 'none') {
      onChange(null)
      return
    }

    onEnsureDueDate?.()
    const anchorDay = dueDate
      ? new Date(`${dueDate}T12:00:00`).getDay()
      : new Date().getDay()

    onChange({
      frequency: freq,
      interval: value?.interval ?? 1,
      daysOfWeek: freq === 'weekly' ? (value?.daysOfWeek?.length ? value.daysOfWeek : [anchorDay]) : undefined,
      endType: value?.endType ?? 'never',
      endDate: value?.endDate ?? null,
      maxOccurrences: value?.maxOccurrences ?? 10,
      occurrenceCount: value?.occurrenceCount ?? 1,
    })
  }

  const toggleWeekday = (day: number) => {
    if (!value) return
    const current = value.daysOfWeek ?? []
    const exists = current.includes(day)
    const nextDays = exists
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b)

    if (nextDays.length === 0) return // require at least one day
    onChange({ ...value, daysOfWeek: nextDays })
  }

  return (
    <section className="rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] p-4">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs font-medium text-[var(--tn-text-muted)]">
          <Repeat size={14} className="text-[var(--tn-primary)]" />
          Repeat schedule
        </label>
        {value && (
          <span className="rounded-md bg-[var(--tn-primary)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--tn-primary)]">
            {formatRecurrenceLabel(value)}
          </span>
        )}
      </div>

      {/* Frequency selector */}
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {PRESETS.map((preset) => {
          const selected = activeFrequency === preset.frequency
          return (
            <button
              key={preset.frequency}
              type="button"
              aria-pressed={selected}
              onClick={() => handleFrequencyChange(preset.frequency)}
              className={`rounded-lg border px-2 py-2 text-[11px] font-medium transition ${
                selected
                  ? 'border-[var(--tn-primary)] bg-[var(--tn-primary)]/12 text-[var(--tn-primary)]'
                  : 'border-[var(--tn-border)] text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)]'
              }`}
            >
              {preset.frequency === 'none' ? 'None' : preset.label}
            </button>
          )
        })}
      </div>

      {value && (
        <div className="mt-4 space-y-3 border-t border-[var(--tn-border)] pt-4">
          {/* Interval */}
          <div className="flex items-center gap-2.5 text-xs text-[var(--tn-text-muted)]">
            <span>Every</span>
            <input
              type="number"
              min={1}
              max={365}
              value={value.interval}
              onChange={(e) =>
                onChange({
                  ...value,
                  interval: Math.max(1, parseInt(e.target.value, 10) || 1),
                })
              }
              className="w-16 rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] px-2.5 py-1.5 text-center text-xs font-medium text-[var(--tn-text)] outline-none focus:border-[var(--tn-primary)]"
            />
            <span>
              {value.frequency === 'daily'
                ? value.interval === 1 ? 'day' : 'days'
                : value.frequency === 'weekly'
                  ? value.interval === 1 ? 'week' : 'weeks'
                  : value.frequency === 'monthly'
                    ? value.interval === 1 ? 'month' : 'months'
                    : value.interval === 1 ? 'year' : 'years'}
            </span>
          </div>

          {/* Weekday pills for weekly recurrence */}
          {value.frequency === 'weekly' && (
            <div>
              <span className="mb-1.5 block text-[11px] text-[var(--tn-text-subtle)]">
                Repeat on
              </span>
              <div className="flex gap-1.5">
                {WEEKDAYS.map((day) => {
                  const active = (value.daysOfWeek ?? []).includes(day.value)
                  return (
                    <button
                      key={day.value}
                      type="button"
                      title={day.title}
                      aria-pressed={active}
                      onClick={() => toggleWeekday(day.value)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold transition ${
                        active
                          ? 'border-[var(--tn-primary)] bg-[var(--tn-primary)] text-white'
                          : 'border-[var(--tn-border)] bg-[var(--tn-surface)] text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)]'
                      }`}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* End condition */}
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-[11px] text-[var(--tn-text-subtle)]">
              Ends
              <select
                value={value.endType}
                onChange={(e) =>
                  onChange({
                    ...value,
                    endType: e.target.value as RecurrenceEndType,
                  })
                }
                className="mt-1 h-9 w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] px-2.5 text-xs text-[var(--tn-text)] outline-none focus:border-[var(--tn-primary)]"
              >
                <option value="never">Never</option>
                <option value="onDate">On date</option>
                <option value="afterCount">After occurrences</option>
              </select>
            </label>

            {value.endType === 'onDate' && (
              <label className="block text-[11px] text-[var(--tn-text-subtle)]">
                End date
                <input
                  type="date"
                  min={dueDate || undefined}
                  value={value.endDate ?? ''}
                  onChange={(e) =>
                    onChange({ ...value, endDate: e.target.value || null })
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] px-2.5 text-xs text-[var(--tn-text)] outline-none focus:border-[var(--tn-primary)]"
                />
              </label>
            )}

            {value.endType === 'afterCount' && (
              <label className="block text-[11px] text-[var(--tn-text-subtle)]">
                Total occurrences
                <input
                  type="number"
                  min={2}
                  max={999}
                  value={value.maxOccurrences ?? 10}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      maxOccurrences: Math.max(2, parseInt(e.target.value, 10) || 2),
                    })
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] px-2.5 text-xs text-[var(--tn-text)] outline-none focus:border-[var(--tn-primary)]"
                />
              </label>
            )}
          </div>

          <p className="text-[11px] text-[var(--tn-text-subtle)]">
            Next occurrence: <span className="font-medium text-[var(--tn-text-muted)]">{getNextDueDate(dueDate || null, value)}</span>
            {' · '}Reminders automatically shift with each cycle.
          </p>
        </div>
      )}
    </section>
  )
}