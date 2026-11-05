
import { useEffect, useId, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

import {
  BookOpen, Bookmark, Box, Brain, Briefcase, Camera, Car, ChevronDown,
  Code, Coffee, Compass, Cpu, Database, Dumbbell, Film, Flag, Folder,
  Gamepad2, Gift, Globe, GraduationCap, Hammer, Heart, Layers, Leaf,
  Lightbulb, Mail, Music, Package, Palette, PenTool, Plane, Rocket,
  Search, Shield, ShoppingCart, Smile, Sparkles, Star, Swords, Sun,
  Target, Terminal, Trophy, User, Wallet, Wrench, X, Zap, ImagePlus,
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'
import type { Workspace } from '../../types'

export interface WorkspaceFormData {
  name: string
  description: string
  icon: string
  color: string
  coverImage?: string
}

interface Props {
  workspace?: Workspace
  onClose: () => void
  onSave: (data: WorkspaceFormData) => void
}

const workspaceIcons: Record<string, LucideIcon> = {
  Folder, Briefcase, Code, Gamepad2, BookOpen, User, Heart, Star, Rocket,
  Lightbulb, Palette, Music, Camera, Film, Dumbbell, ShoppingCart, Plane,
  Car, Coffee, Wallet, GraduationCap, Globe, Mail, Brain, Sparkles, Flag,
  Layers, Box, Zap, Wrench, Hammer, Leaf, Sun, Bookmark, Trophy, Swords,
  Shield, Gift, Compass, Cpu, Database, Terminal, PenTool, Package, Smile,
  Target,
}

const iconEntries = Object.entries(workspaceIcons)

const colorOptions = [
  { value: 'violet', dot: 'bg-violet-400' },
  { value: 'sky', dot: 'bg-sky-400' },
  { value: 'amber', dot: 'bg-amber-400' },
  { value: 'emerald', dot: 'bg-emerald-400' },
  { value: 'rose', dot: 'bg-rose-400' },
  { value: 'indigo', dot: 'bg-indigo-400' },
]

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tn-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tn-surface)]'

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const image = new Image()

      image.onload = () => {
        const maxWidth = 1400
        const scale = Math.min(1, maxWidth / image.width)

        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)

        const context = canvas.getContext('2d')

        if (!context) {
          return reject(new Error('Unable to process image.'))
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }

      image.onerror = () => reject(new Error('Unable to load image.'))
      image.src = reader.result as string
    }

    reader.onerror = () => reject(new Error('Unable to read image.'))
    reader.readAsDataURL(file)
  })
}

function IconPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')

  const SelectedIcon = workspaceIcons[value] ?? Folder
  const query = search.toLowerCase().replace(/\s+/g, '')

  const filteredIcons = iconEntries.filter(([name]) =>
    name.toLowerCase().includes(query),
  )

  const close = () => {
    setIsOpen(false)
    setSearch('')
  }

  const pick = (name: string) => {
    onChange(name)
    close()
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Choose workspace icon"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={`flex h-10 items-center gap-2 rounded-md px-2.5 text-[var(--tn-text-muted)] transition hover:bg-[var(--tn-surface-hover)] hover:text-[var(--tn-text)] ${focusRing}`}
      >
        <SelectedIcon size={19} />
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close icon picker"
            className="fixed inset-0 z-[70] cursor-default"
            onClick={close}
          />

          <div
            role="dialog"
            aria-label="Choose an icon"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation()
                close()
              }
            }}
            className="absolute left-0 top-[46px] z-[80] w-[300px] rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-3 shadow-2xl"
          >
            <div className="relative mb-3">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tn-text-subtle)]"
              />

              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    if (filteredIcons[0]) {
                      pick(filteredIcons[0][0])
                    }
                  }
                }}
                placeholder="Search icons..."
                aria-label="Search icons"
                className="w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] py-2 pl-9 pr-3 text-sm text-[var(--tn-text)] outline-none focus:border-[var(--tn-primary)]"
              />
            </div>

            <div className="grid max-h-[230px] grid-cols-6 gap-1 overflow-y-auto">
              {filteredIcons.map(([name, Icon]) => (
                <button
                  key={name}
                  type="button"
                  title={name}
                  aria-label={`Select ${name} icon`}
                  aria-pressed={value === name}
                  onClick={() => pick(name)}
                  className={`flex h-10 items-center justify-center rounded-lg transition ${focusRing} ${
                    value === name
                      ? 'bg-[var(--tn-primary-soft)] text-[var(--tn-primary)] ring-1 ring-[var(--tn-primary)]'
                      : 'text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)]'
                  }`}
                >
                  <Icon size={19} />
                </button>
              ))}
            </div>

            {filteredIcons.length === 0 && (
              <p className="py-5 text-center text-xs text-[var(--tn-text-muted)]">
                No matching icons found.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function WorkspaceEditorModal({
  workspace,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState(workspace?.name ?? '')
  const [description, setDescription] = useState(
    workspace?.description ?? '',
  )
  const [icon, setIcon] = useState(workspace?.icon ?? 'Folder')
  const [color, setColor] = useState(workspace?.color ?? 'violet')
  const [coverImage, setCoverImage] = useState(
    workspace?.coverImage ?? '',
  )
  const [imageError, setImageError] = useState('')
  const [processing, setProcessing] = useState(false)

  const titleId = useId()
  const nameId = useId()
  const descriptionId = useId()
  const colorId = useId()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const handleImageUpload = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setImageError('Please select a valid image file.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setImageError('Image must be smaller than 10 MB.')
      return
    }

    try {
      setImageError('')
      setProcessing(true)
      setCoverImage(await compressImage(file))
    } catch {
      setImageError('Unable to process this image.')
    } finally {
      setProcessing(false)
      event.target.value = ''
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!name.trim() || processing) return

    onSave({
      name: name.trim(),
      description: description.trim(),
      icon,
      color,
      coverImage: coverImage || undefined,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--tn-overlay)] p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2
              id={titleId}
              className="text-lg font-semibold text-[var(--tn-text)]"
            >
              {workspace ? 'Edit workspace' : 'Create workspace'}
            </h2>

            <p className="mt-1 text-xs text-[var(--tn-text-muted)]">
              {workspace
                ? 'Update your workspace details and card appearance.'
                : 'Create a space to organise your work.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Workspace name */}
          <div>
            <label
              htmlFor={nameId}
              className="mb-2 block text-xs font-medium text-[var(--tn-text-muted)]"
            >
              Workspace name
            </label>

            <div className="flex h-[46px] items-center rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-1.5 transition focus-within:border-[var(--tn-primary)] focus-within:ring-2 focus-within:ring-[var(--tn-primary)]/20">
              <IconPicker value={icon} onChange={setIcon} />

              <div className="mx-1 h-5 w-px shrink-0 bg-[var(--tn-border)]" />

              <input
                id={nameId}
                autoFocus
                required
                maxLength={40}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Work, Gaming, Projects"
                className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm text-[var(--tn-text)] placeholder:text-[var(--tn-text-subtle)] focus:!outline-none focus:!ring-0 focus:!shadow-none"
                style={{ outline: 'none', boxShadow: 'none' }}
              />
            </div>

            <p className="mt-1.5 text-right text-[11px] text-[var(--tn-text-subtle)]">
              {name.length}/40
            </p>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor={descriptionId}
              className="mb-2 block text-xs font-medium text-[var(--tn-text-muted)]"
            >
              Description
              <span className="ml-1 font-normal text-[var(--tn-text-subtle)]">
                (optional)
              </span>
            </label>

            <textarea
              id={descriptionId}
              rows={3}
              maxLength={200}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this workspace for?"
              className="w-full resize-none rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3 py-2.5 text-sm text-[var(--tn-text)] outline-none focus:border-[var(--tn-primary)]"
            />

            <p className="mt-1.5 text-right text-[11px] text-[var(--tn-text-subtle)]">
              {description.length}/200
            </p>
          </div>

          {/* Accent colour */}
          <div>
            <p
              id={colorId}
              className="mb-2.5 text-xs font-medium text-[var(--tn-text-muted)]"
            >
              Accent colour
            </p>

            <div
              role="radiogroup"
              aria-labelledby={colorId}
              className="flex flex-wrap items-center gap-3"
            >
              {colorOptions.map((option) => {
                const isSelected = color === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={option.value}
                    title={option.value}
                    onClick={() => setColor(option.value)}
                    className={`
                      h-9 w-9 rounded-full transition-all duration-200
                      ${option.dot}
                      ${
                        isSelected
                          ? 'scale-110 ring-[3px] ring-[var(--tn-primary)] ring-offset-[3px] ring-offset-[var(--tn-surface)]'
                          : 'opacity-80 hover:scale-110 hover:opacity-100'
                      }
                    `}
                  />
                )
              })}
            </div>
          </div>

          {/* Card background image */}
          <div>
            <p className="mb-2.5 text-xs font-medium text-[var(--tn-text-muted)]">
              Card background image
            </p>

            {coverImage ? (
              <div className="relative h-32 overflow-hidden rounded-xl border border-[var(--tn-border)]">
                <img
                  src={coverImage}
                  alt="Workspace background preview"
                  className="h-full w-full object-cover"
                />

                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  aria-label="Remove background image"
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white hover:bg-black/80"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--tn-border)] text-[var(--tn-text-muted)] transition hover:border-[var(--tn-primary)] hover:bg-[var(--tn-surface-hover)]">
                {processing ? (
                  <span className="text-xs">Processing image...</span>
                ) : (
                  <>
                    <ImagePlus size={22} />
                    <span className="text-xs">
                      Upload background image
                    </span>
                  </>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={processing}
                  className="hidden"
                />
              </label>
            )}

            {imageError && (
              <p className="mt-2 text-xs text-red-500">{imageError}</p>
            )}

            <p className="mt-2 text-xs text-[var(--tn-text-subtle)]">
              Optional. Images are compressed before being saved.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-7 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-[var(--tn-text-muted)] hover:bg-[var(--tn-surface-hover)]"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={!name.trim() || processing}
            className="rounded-lg bg-[var(--tn-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--tn-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {workspace ? 'Save changes' : 'Create workspace'}
          </button>
        </div>
      </form>
    </div>
  )
}
