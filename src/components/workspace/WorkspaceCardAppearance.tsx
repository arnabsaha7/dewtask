import { useRef, useState } from 'react'
import {
  ImagePlus,
  Palette,
  RotateCcw,
} from 'lucide-react'

import type { CardAppearance } from './workspace.types'

interface Props {
  value: CardAppearance | null
  onChange: (appearance: CardAppearance | null) => void
}

const solidColors = [
  '#304C64',
  '#26788E',
  '#631B08',
  '#475569',
  '#365B49',
  '#70513B',
  '#51446F',
  '#7C4545',
]

export default function WorkspaceCardAppearance({
  value,
  onChange,
}: Props) {
  const [imageUrl, setImageUrl] = useState(
    value?.type === 'image' ? value.imageUrl : '',
  )

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUrl = () => {
    const trimmed = imageUrl.trim()

    if (!trimmed) return

    try {
      const url = new URL(trimmed)

      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return
      }

      onChange({
        type: 'image',
        imageUrl: url.toString(),
      })
    } catch {
      // Invalid URL: leave the current appearance unchanged.
    }
  }

  const handleFileSelection = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange({
          type: 'image',
          imageUrl: reader.result,
        })
      }
    }

    reader.readAsDataURL(file)

    event.target.value = ''
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-4">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--tn-text)]">
          <Palette size={16} />
          Card appearance
        </h3>
        <p className="mt-1 text-xs text-[var(--tn-text-muted)]">
          Choose a solid background or use an image.
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-[var(--tn-text-muted)]">
          Solid colors
        </p>

        <div className="flex flex-wrap gap-2">
          {solidColors.map((color) => {
            const selected =
              value?.type === 'solid' && value.color === color

            return (
              <button
                key={color}
                type="button"
                onClick={() => onChange({ type: 'solid', color })}
                aria-label={`Use ${color} background`}
                aria-pressed={selected}
                className={`h-9 w-9 rounded-xl border-2 transition hover:scale-105 ${
                  selected
                    ? 'border-[var(--tn-primary)] ring-2 ring-[var(--tn-primary-soft)]'
                    : 'border-white/20'
                }`}
                style={{ backgroundColor: color }}
              />
            )
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-[var(--tn-text-muted)]">
          Image background
        </p>

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelection}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--tn-border)] px-3 py-2 text-xs text-[var(--tn-text)] transition hover:bg-[var(--tn-surface-hover)]"
          >
            <ImagePlus size={14} />
            Choose image
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <input
            type="url"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="Paste an image URL"
            className="min-w-0 flex-1 rounded-xl border border-[var(--tn-border)] bg-[var(--tn-input)] px-3 py-2 text-xs text-[var(--tn-text)] outline-none placeholder:text-[var(--tn-text-subtle)] focus:border-[var(--tn-primary)]"
          />

          <button
            type="button"
            onClick={handleImageUrl}
            disabled={!imageUrl.trim()}
            className="rounded-xl bg-[var(--tn-primary)] px-3 py-2 text-xs font-medium text-white transition hover:bg-[var(--tn-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </div>

      {value && (
        <div className="flex items-center justify-between border-t border-[var(--tn-border)] pt-3">
          <span className="text-xs text-[var(--tn-text-muted)]">
            Custom appearance selected
          </span>

          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--tn-text-muted)] transition hover:text-red-400"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        </div>
      )}
    </section>
  )
}