import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FolderTree,
  Layers,
  Plus,
  Repeat,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onCreateFirstTask?: () => void
}

interface OnboardingStep {
  id: string
  eyebrow: string
  title: string
  description: string
  tips: string[]
  preview: 'overview' | 'workspaces' | 'create' | 'views' | 'manage'
}

const STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    eyebrow: 'Step 1 of 5 · Welcome',
    title: 'Your offline-first command center',
    description:
      'DewTask keeps your tasks, folders, schedules, and reminders organized in one fast workspace.',
    tips: [
      'Use the left Sidebar to jump between Overview, Today, Upcoming, Calendar, and your Workspaces.',
      'Check the Bell icon in the top bar anytime to review due alerts and scheduled reminders.',
      'Collapse the sidebar anytime for a distraction-free focus view.',
    ],
    preview: 'overview',
  },
  {
    id: 'workspaces',
    eyebrow: 'Step 2 of 5 · Structure',
    title: 'Organize with Workspaces & Nested Folders',
    description:
      'Separate work, personal goals, and side projects into dedicated Workspaces with unlimited sub-categories.',
    tips: [
      'Click + New Workspace in the top bar to create a color-coded space.',
      'Inside any workspace, use Manage Categories to nest folders and sub-folders.',
      'Use Tags to cross-reference tasks across different folders.',
    ],
    preview: 'workspaces',
  },
  {
    id: 'create',
    eyebrow: 'Step 3 of 5 · Creating Tasks',
    title: 'Create tasks, reminders & recurring schedules',
    description:
      'Click + New Task in the top bar (or click any time slot on the Calendar) to add a task.',
    tips: [
      'Set a Due Date and Reminder to get desktop, mobile, or in-app alerts.',
      'Enable Repeat Schedule (Daily, Weekly, Monthly, Yearly) so completing a task automatically creates the next one.',
      'Turn on Auto-Progression to automatically complete timed tasks when their window ends.',
    ],
    preview: 'create',
  },
  {
    id: 'views',
    eyebrow: 'Step 4 of 5 · Workflows',
    title: 'Switch between List, Kanban Board & Calendar',
    description:
      'View the exact same tasks in whichever layout fits your workflow best.',
    tips: [
      'List View: Compact table with quick checkboxes, progress bars, and tag filters.',
      'Kanban Board: Drag and drop cards across To Do, In Progress, and Completed columns.',
      'Calendar View: Visualize deadlines and time-block your week.',
    ],
    preview: 'views',
  },
  {
    id: 'manage',
    eyebrow: 'Step 5 of 5 · Editing & Deleting',
    title: 'Complete, edit, or delete tasks cleanly',
    description:
      'Everything you need to update or clean up tasks is one click away.',
    tips: [
      'Complete a task: Click the circle checkbox on the left of any task, or drag it to Completed on the board.',
      'Edit details: Click any task title to open the Task Details drawer for checklists, tags, and schedule edits.',
      'Delete a task: Hover over a task row and click the red Trash icon (or click Delete task at the bottom of the details drawer).',
    ],
    preview: 'manage',
  },
]

function StepIllustration({ kind }: { kind: OnboardingStep['preview'] }) {
  if (kind === 'overview') {
    return (
      <div className="grid grid-cols-[120px_1fr] gap-3 rounded-xl border border-[var(--tn-border)] bg-[var(--tn-bg)] p-3.5 text-xs">
        <div className="space-y-1.5 border-r border-[var(--tn-border)] pr-3">
          <div className="rounded-md bg-[var(--tn-primary)]/15 px-2.5 py-1.5 font-medium text-[var(--tn-primary)]">
            Overview
          </div>
          <div className="rounded-md px-2.5 py-1.5 text-[var(--tn-text-muted)]">
            Calendar
          </div>
          <div className="rounded-md px-2.5 py-1.5 text-[var(--tn-text-muted)]">
            Workspaces
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] px-3 py-2">
            <span className="font-medium text-[var(--tn-text)]">Top Bar Actions</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--tn-primary)] px-2 py-0.5 text-[10px] font-semibold text-white">
              <Plus size={10} /> New Task
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] p-2.5">
              <p className="text-[10px] text-[var(--tn-text-subtle)]">Today</p>
              <p className="mt-0.5 text-sm font-semibold text-[var(--tn-text)]">4 Tasks</p>
            </div>
            <div className="rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] p-2.5">
              <p className="text-[10px] text-[var(--tn-text-subtle)]">Reminders</p>
              <p className="mt-0.5 text-sm font-semibold text-[var(--tn-primary)]">Active</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'workspaces') {
    return (
      <div className="rounded-xl border border-[var(--tn-border)] bg-[var(--tn-bg)] p-3.5 text-xs">
        <div className="flex items-center gap-2 font-medium text-[var(--tn-text)]">
          <FolderTree size={15} className="text-[var(--tn-primary)]" />
          <span>Engineering Workspace</span>
        </div>
        <div className="mt-2.5 space-y-1.5 pl-4 border-l border-[var(--tn-border)] ml-1.5">
          <div className="rounded-md bg-[var(--tn-surface)] px-2.5 py-1.5 text-[var(--tn-text-muted)]">
            📁 Mobile App
          </div>
          <div className="ml-4 rounded-md bg-[var(--tn-primary)]/10 px-2.5 py-1.5 font-medium text-[var(--tn-primary)]">
            📂 Release v2.0 · #priority
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'create') {
    return (
      <div className="space-y-2 rounded-xl border border-[var(--tn-border)] bg-[var(--tn-bg)] p-3.5 text-xs">
        <div className="flex items-center justify-between rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] px-3 py-2">
          <span className="font-medium text-[var(--tn-text)]">Weekly Sprint Sync</span>
          <span className="inline-flex items-center gap-1 rounded bg-[var(--tn-primary)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--tn-primary)]">
            <Repeat size={10} /> Weekly (Mon)
          </span>
        </div>
        <div className="flex items-center justify-between px-1 text-[11px] text-[var(--tn-text-subtle)]">
          <span>🔔 Reminder: 09:00 AM</span>
          <span>Auto-shifts on completion</span>
        </div>
      </div>
    )
  }

  if (kind === 'views') {
    return (
      <div className="grid grid-cols-3 gap-2 rounded-xl border border-[var(--tn-border)] bg-[var(--tn-bg)] p-3.5 text-xs">
        <div className="rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] p-2.5">
          <p className="font-semibold text-[var(--tn-text)]">To Do</p>
          <div className="mt-2 rounded bg-[var(--tn-surface-muted)] p-1.5 text-[10px] text-[var(--tn-text-muted)]">
            Draft specs
          </div>
        </div>
        <div className="rounded-lg border border-[var(--tn-primary)]/50 bg-[var(--tn-primary)]/8 p-2.5">
          <p className="font-semibold text-[var(--tn-primary)]">In Progress</p>
          <div className="mt-2 rounded bg-[var(--tn-surface)] p-1.5 text-[10px] text-[var(--tn-text)] shadow-sm">
            Build UI ⇄
          </div>
        </div>
        <div className="rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] p-2.5">
          <p className="font-semibold text-emerald-400">Completed</p>
          <div className="mt-2 rounded bg-[var(--tn-surface-muted)] p-1.5 text-[10px] text-[var(--tn-text-subtle)] line-through">
            Setup repo
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-xl border border-[var(--tn-border)] bg-[var(--tn-bg)] p-3.5 text-xs">
      <div className="flex items-center justify-between rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check size={10} />
          </span>
          <span className="text-[var(--tn-text-subtle)] line-through">
            Click circle to complete
          </span>
        </div>
        <span className="text-[10px] text-emerald-400">Done</span>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] px-3 py-2.5">
        <span className="font-medium text-[var(--tn-text)]">
          Click title to edit · Hover right to delete
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-400">
          <Trash2 size={11} /> Delete
        </span>
      </div>
    </div>
  )
}

export default function OnboardingModal({
  open,
  onClose,
  onCreateFirstTask,
}: Props) {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') {
        setStepIndex((prev) => Math.min(STEPS.length - 1, prev + 1))
      }
      if (event.key === 'ArrowLeft') {
        setStepIndex((prev) => Math.max(0, prev - 1))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const step = STEPS[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--tn-overlay)] p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-step-title"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--tn-border)] bg-[var(--tn-surface-elevated)] shadow-2xl"
      >
        {/* Top progress bar */}
        <div className="h-1 w-full bg-[var(--tn-surface-muted)]">
          <div
            className="h-full bg-[var(--tn-primary)] transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--tn-border)] px-6 py-5">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--tn-primary)]">
              <Sparkles size={13} />
              {step.eyebrow}
            </span>
            <h2
              id="onboarding-step-title"
              className="mt-1.5 text-lg font-semibold text-[var(--tn-text)]"
            >
              {step.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className="rounded-lg p-2 text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]"
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          <p className="text-sm leading-relaxed text-[var(--tn-text-muted)]">
            {step.description}
          </p>

          <StepIllustration kind={step.preview} />

          <ul className="space-y-2.5">
            {step.tips.map((tip) => (
              <li
                key={tip}
                className="flex items-start gap-2.5 text-xs leading-5 text-[var(--tn-text-muted)]"
              >
                <CheckCircle2
                  size={15}
                  className="mt-0.5 shrink-0 text-[var(--tn-primary)]"
                />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Step dots + Footer navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--tn-border)] bg-[var(--tn-surface)] px-6 py-4">
          <div className="flex items-center gap-1.5">
            {STEPS.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Go to step ${idx + 1}`}
                onClick={() => setStepIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === stepIndex
                    ? 'w-6 bg-[var(--tn-primary)]'
                    : 'w-2 bg-[var(--tn-border)] hover:bg-[var(--tn-text-subtle)]'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst ? (
              <button
                type="button"
                onClick={() => setStepIndex((prev) => prev - 1)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--tn-border)] px-3.5 py-2 text-xs font-medium text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]"
              >
                <ArrowLeft size={14} />
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3.5 py-2 text-xs font-medium text-[var(--tn-text-subtle)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)]"
              >
                Skip tour
              </button>
            )}

            {!isLast ? (
              <button
                type="button"
                onClick={() => setStepIndex((prev) => prev + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--tn-primary)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--tn-primary-hover)]"
              >
                Next
                <ArrowRight size={14} />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {onCreateFirstTask && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      onCreateFirstTask()
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--tn-primary)]/40 bg-[var(--tn-primary)]/10 px-3.5 py-2 text-xs font-semibold text-[var(--tn-primary)] transition hover:bg-[var(--tn-primary)]/20"
                  >
                    <Plus size={14} />
                    Create a task
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--tn-primary)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--tn-primary-hover)]"
                >
                  <Layers size={14} />
                  Get started
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}