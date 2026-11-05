
import { usePersistentValue } from './usePersistentValue'
import type { Tag } from '../types'

const DEFAULT_TAG_COLOR = '#6366f1'


export function useTags() {
  const [tags, setTags] = usePersistentValue<Tag[]>('tasknest_tags', [])

  // Add a new tag
  const addTag = (data: {
    name: string
    workspaceId: string
    color?: string
  }): Tag | null => {
    const name = data.name.trim()

    if (!name) return null

    const duplicate = tags.some(
      (tag) =>
        tag.workspaceId === data.workspaceId &&
        tag.name.toLowerCase() === name.toLowerCase()
    )

    if (duplicate) return null

    const now = new Date().toISOString()

    const newTag: Tag = {
      id: crypto.randomUUID(),
      name,
      workspaceId: data.workspaceId,
      color: data.color ?? DEFAULT_TAG_COLOR,
      createdAt: now,
      updatedAt: now,
    }

    setTags((current) => [...current, newTag])

    return newTag
  }

  // Update an existing tag
  const updateTag = (
    id: string,
    updates: Partial<Pick<Tag, 'name' | 'color'>>
  ): boolean => {
    const existingTag = tags.find((tag) => tag.id === id)

    if (!existingTag) return false

    const updatedName = updates.name?.trim()

    if (updates.name !== undefined && !updatedName) {
      return false
    }

    const duplicate = tags.some(
      (tag) =>
        tag.id !== id &&
        tag.workspaceId === existingTag.workspaceId &&
        tag.name.toLowerCase() ===
          (updatedName ?? existingTag.name).toLowerCase()
    )

    if (duplicate) return false

    setTags((current) =>
      current.map((tag) =>
        tag.id === id
          ? {
              ...tag,
              ...updates,
              name: updatedName ?? tag.name,
              updatedAt: new Date().toISOString(),
            }
          : tag
      )
    )

    return true
  }

  // Delete a tag
  const deleteTag = (id: string) => {
    setTags((current) => current.filter((tag) => tag.id !== id))
  }

  return {
    tags,
    setTags,
    addTag,
    updateTag,
    deleteTag,
  }
}
