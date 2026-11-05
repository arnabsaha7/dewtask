import type { Category } from '../types'
import { initialCategories } from '../data/initialData'
import { usePersistentValue } from './usePersistentValue'

export function useCategories() {
  const [categories, setCategories] = usePersistentValue<Category[]>('tasknest_categories', initialCategories)
  return { categories, setCategories }
}
