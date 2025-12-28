/**
 * Утилиты для работы с API и localStorage
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
 * Получить URL API
 */
function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
}

/**
 * Получить все сохраненные анализы (из API с fallback на localStorage)
 */
export async function getSavedAnalyses(): Promise<SavedAnalysis[]> {
  try {
    // Пытаемся загрузить из API
    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/api/analyses?limit=100`)
    
    if (response.ok) {
      const data = await response.json()
      // Синхронизируем с localStorage для офлайн-режима
      if (data.analyses && data.analyses.length > 0) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.analyses))
        } catch (e) {
          // Игнорируем ошибки localStorage
        }
        return data.analyses.map((a: any) => ({
          id: a.id,
          timestamp: a.timestamp,
          goal: a.goal,
          criteria: a.criteria,
          alternatives: a.alternatives,
          criteriaMatrix: a.criteriaMatrix,
          alternativeMatrices: a.alternativeMatrices,
          results: a.results
        }))
      }
    }
  } catch (error) {
    console.warn('Не удалось загрузить анализы из API, используем localStorage:', error)
  }
  
  // Fallback на localStorage
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
 * Сохранить анализ (в API с fallback на localStorage)
 */
export async function saveAnalysis(analysis: Omit<SavedAnalysis, 'id' | 'timestamp'>): Promise<string> {
  const newAnalysis: SavedAnalysis = {
    ...analysis,
    id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now()
  }
  
  try {
    // Пытаемся сохранить в API
    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/api/analyses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        goal: newAnalysis.goal,
        criteria: newAnalysis.criteria,
        alternatives: newAnalysis.alternatives,
        criteriaMatrix: newAnalysis.criteriaMatrix,
        alternativeMatrices: newAnalysis.alternativeMatrices,
        results: newAnalysis.results
      }),
    })
    
    if (response.ok) {
      const data = await response.json()
      // Обновляем ID, если сервер вернул другой
      if (data.id) {
        newAnalysis.id = data.id
      }
      if (data.timestamp) {
        newAnalysis.timestamp = data.timestamp
      }
    }
  } catch (error) {
    console.warn('Не удалось сохранить анализ в API, используем localStorage:', error)
  }
  
  // Всегда сохраняем в localStorage для офлайн-режима
  try {
    const analyses = await getSavedAnalyses()
    analyses.unshift(newAnalysis) // Добавляем в начало списка
    
    // Ограничиваем количество сохраненных анализов (последние 50)
    const limitedAnalyses = analyses.slice(0, 50)
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedAnalyses))
  } catch (error) {
    console.error('Ошибка при сохранении анализа в localStorage:', error)
    throw error
  }
  
  return newAnalysis.id
}

/**
 * Удалить анализ по ID (из API с fallback на localStorage)
 */
export async function deleteAnalysis(id: string): Promise<boolean> {
  try {
    // Пытаемся удалить из API
    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/api/analyses/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      console.warn('Не удалось удалить анализ из API, удаляем из localStorage')
    }
  } catch (error) {
    console.warn('Ошибка при удалении анализа из API, удаляем из localStorage:', error)
  }
  
  // Всегда удаляем из localStorage
  try {
    const analyses = await getSavedAnalyses()
    const filtered = analyses.filter(a => a.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error('Ошибка при удалении анализа из localStorage:', error)
    return false
  }
}

/**
 * Получить анализ по ID (из API с fallback на localStorage)
 */
export async function getAnalysisById(id: string): Promise<SavedAnalysis | null> {
  try {
    // Пытаемся загрузить из API
    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/api/analyses/${id}`)
    
    if (response.ok) {
      const data = await response.json()
      return {
        id: data.id,
        timestamp: data.timestamp,
        goal: data.goal,
        criteria: data.criteria,
        alternatives: data.alternatives,
        criteriaMatrix: data.criteriaMatrix,
        alternativeMatrices: data.alternativeMatrices,
        results: data.results
      }
    }
  } catch (error) {
    console.warn('Не удалось загрузить анализ из API, используем localStorage:', error)
  }
  
  // Fallback на localStorage
  try {
    const analyses = await getSavedAnalyses()
    return analyses.find(a => a.id === id) || null
  } catch (error) {
    console.error('Ошибка при получении анализа из localStorage:', error)
    return null
  }
}

/**
 * Очистить всю историю (только localStorage, API не очищается массово)
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
