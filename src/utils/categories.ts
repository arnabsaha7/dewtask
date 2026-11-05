
import type { Category } from '../types'

export interface CategoryNode extends Category {
  children: CategoryNode[]
}

export function buildCategoryTree(
  categories: Category[],
  workspaceId: string,
): CategoryNode[] {
  const workspaceCategories = categories.filter(
    (category) => category.workspaceId === workspaceId,
  )

  const nodes = new Map<string, CategoryNode>()

  for (const category of workspaceCategories) {
    nodes.set(category.id, {
      ...category,
      children: [],
    })
  }

  const roots: CategoryNode[] = []

  for (const node of nodes.values()) {
    if (!node.parentId) {
      roots.push(node)
      continue
    }

    const parent = nodes.get(node.parentId)

    if (parent) {
      parent.children.push(node)
    } else {
      // Keep orphaned categories visible rather than losing them.
      roots.push(node)
    }
  }

  const sortNodes = (items: CategoryNode[]) => {
    items.sort((a, b) => a.order - b.order)

    for (const item of items) {
      sortNodes(item.children)
    }
  }

  sortNodes(roots)

  return roots
}

export function getCategoryPath(
  categories: Category[],
  categoryId: string,
): Category[] {
  const path: Category[] = []
  let current = categories.find((item) => item.id === categoryId)

  while (current) {
    path.unshift(current)

    current = current.parentId
      ? categories.find((item) => item.id === current!.parentId)
      : undefined
  }

  return path
}

export function getDescendantIds(
  categories: Category[],
  categoryId: string,
): string[] {
  const result: string[] = []

  const visit = (parentId: string) => {
    const children = categories.filter(
      (category) => category.parentId === parentId,
    )

    for (const child of children) {
      result.push(child.id)
      visit(child.id)
    }
  }

  visit(categoryId)

  return result
}
