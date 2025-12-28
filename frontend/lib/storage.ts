/**
 * Утилиты для работы с localStorage
 * Сохранение и загрузка анализов AHP
 */

export interface SavedAnalysis {
  id: string
  timestamp: number
  goal: string
  criteria: string[]
  alternatives: string[]
  results: {
    criteriaConsistency: any
    alternativeConsistencies: any[]
    globalPriorities: Array<{
      name: string
      priority: number
      rank: number
    }>
    alternativePrioritiesByCriteria: number[][]
    criteriaPriorities: number[]
  }
  criteriaMatrix: number[][]
  alternativeMatrices: number[][][]
}

const STORAGE_KEY = 'mpriority_analyses'

/**
 * Получить все сохраненные анализы
 */
export function getSavedAnalyses(): SavedAnalysis[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    return JSON.parse(data)
  } catch (error) {
    console.error('Ошибка при загрузке анализов из localStorage:', error)
    return []
  }
}

/**
 * Сохранить анализ
 */
export function saveAnalysis(analysis: Omit<SavedAnalysis, 'id' | 'timestamp'>): string {
  try {
    const analyses = getSavedAnalyses()
    const newAnalysis: SavedAnalysis = {
      ...analysis,
      id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }
    
    analyses.unshift(newAnalysis) // Добавляем в начало списка
    
    // Ограничиваем количество сохраненных анализов (последние 50)
    const limitedAnalyses = analyses.slice(0, 50)
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedAnalyses))
    return newAnalysis.id
  } catch (error) {
    console.error('Ошибка при сохранении анализа в localStorage:', error)
    throw error
  }
}

/**
 * Удалить анализ по ID
 */
export function deleteAnalysis(id: string): boolean {
  try {
    const analyses = getSavedAnalyses()
    const filtered = analyses.filter(a => a.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error('Ошибка при удалении анализа из localStorage:', error)
    return false
  }
}

/**
 * Получить анализ по ID
 */
export function getAnalysisById(id: string): SavedAnalysis | null {
  try {
    const analyses = getSavedAnalyses()
    return analyses.find(a => a.id === id) || null
  } catch (error) {
    console.error('Ошибка при получении анализа из localStorage:', error)
    return null
  }
}

/**
 * Очистить всю историю
 */
export function clearAllAnalyses(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch (error) {
    console.error('Ошибка при очистке истории:', error)
    return false
  }
}

/**
 * Проверить доступность localStorage
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}
