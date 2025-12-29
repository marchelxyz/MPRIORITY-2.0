/**
 * Утилиты для работы с API и базой данных
 * Сохранение и загрузка анализов AHP
 */

export interface ShortenedTexts {
  goal?: { original: string; shortened: string }
  criteria?: { original: string; shortened: string }[]
  alternatives?: { original: string; shortened: string }[]
  levels?: Array<{
    name: { original: string; shortened: string }
    items: { original: string; shortened: string }[]
  }>
}

export interface SavedAnalysis {
  id: string
  timestamp: number
  goal: string
  criteria: string[]
  alternatives: string[]
  levels?: Array<{ name: string; items: string[] }>
  isMultiLevel?: boolean
  results?: {
    criteriaConsistency: any
    alternativeConsistencies: any[]
    globalPriorities: Array<{
      name: string
      priority: number
      rank: number
    }>
    alternativePrioritiesByCriteria: number[][]
    criteriaPriorities: number[]
  } | null
  criteriaMatrix: number[][]
  alternativeMatrices: number[][][]
  multiLevelMatrices?: Record<string, number[][] | number[][][]>
  shortenedTexts?: ShortenedTexts
}

/**
 * Получить URL API
 */
function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
}

/**
 * Получить все сохраненные анализы из базы данных
 */
export async function getSavedAnalyses(): Promise<SavedAnalysis[]> {
  try {
    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/api/analyses?limit=100`)
    
    if (!response.ok) {
      if (response.status === 503) {
        throw new Error('База данных не доступна')
      }
      throw new Error(`Ошибка загрузки: ${response.status}`)
    }
    
    const data = await response.json()
    if (data.analyses && data.analyses.length > 0) {
      return data.analyses.map((a: any) => ({
        id: a.id,
        timestamp: a.timestamp,
        goal: a.goal,
        criteria: a.criteria,
        alternatives: a.alternatives,
        levels: a.levels,
        isMultiLevel: a.isMultiLevel,
        criteriaMatrix: a.criteriaMatrix,
        alternativeMatrices: a.alternativeMatrices,
        multiLevelMatrices: a.multiLevelMatrices,
        results: a.results,
        shortenedTexts: a.shortenedTexts
      }))
    }
    
    return []
  } catch (error) {
    console.error('Ошибка при загрузке анализов из базы данных:', error)
    throw error
  }
}

/**
 * Сохранить анализ в базу данных
 * Поддерживает сохранение промежуточных состояний и обновление существующих анализов
 */
export async function saveAnalysis(analysis: Partial<SavedAnalysis> & { goal: string; criteria: string[]; alternatives: string[] }): Promise<string> {
  try {
    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/api/analyses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: analysis.id,
        timestamp: analysis.timestamp,
        goal: analysis.goal,
        criteria: analysis.criteria,
        alternatives: analysis.alternatives,
        levels: analysis.levels,
        isMultiLevel: analysis.isMultiLevel,
        criteriaMatrix: analysis.criteriaMatrix,
        alternativeMatrices: analysis.alternativeMatrices,
        multiLevelMatrices: analysis.multiLevelMatrices,
        results: analysis.results,
        shortenedTexts: analysis.shortenedTexts
      }),
    })
    
    if (!response.ok) {
      if (response.status === 503) {
        throw new Error('База данных не доступна')
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Ошибка сохранения: ${response.status}`)
    }
    
    const data = await response.json()
    return data.id
  } catch (error) {
    console.error('Ошибка при сохранении анализа в базу данных:', error)
    throw error
  }
}

/**
 * Удалить анализ по ID из базы данных
 */
export async function deleteAnalysis(id: string): Promise<boolean> {
  try {
    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/api/analyses/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        return false // Анализ не найден
      }
      if (response.status === 503) {
        throw new Error('База данных не доступна')
      }
      throw new Error(`Ошибка удаления: ${response.status}`)
    }
    
    const data = await response.json()
    return data.success === true
  } catch (error) {
    console.error('Ошибка при удалении анализа из базы данных:', error)
    throw error
  }
}

/**
 * Получить анализ по ID из базы данных
 */
export async function getAnalysisById(id: string): Promise<SavedAnalysis | null> {
  try {
    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/api/analyses/${id}`)
    
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      if (response.status === 503) {
        throw new Error('База данных не доступна')
      }
      throw new Error(`Ошибка загрузки: ${response.status}`)
    }
    
    const data = await response.json()
    return {
      id: data.id,
      timestamp: data.timestamp,
      goal: data.goal,
      criteria: data.criteria,
      alternatives: data.alternatives,
      levels: data.levels,
      isMultiLevel: data.isMultiLevel,
      criteriaMatrix: data.criteriaMatrix,
      alternativeMatrices: data.alternativeMatrices,
      multiLevelMatrices: data.multiLevelMatrices,
      results: data.results,
      shortenedTexts: data.shortenedTexts
    }
  } catch (error) {
    console.error('Ошибка при получении анализа из базы данных:', error)
    throw error
  }
}

/**
 * Очистить всю историю анализов из базы данных
 */
export async function clearAllAnalyses(): Promise<boolean> {
  try {
    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/api/analyses`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      if (response.status === 503) {
        throw new Error('База данных не доступна')
      }
      throw new Error(`Ошибка очистки: ${response.status}`)
    }
    
    const data = await response.json()
    return data.success === true
  } catch (error) {
    console.error('Ошибка при очистке истории анализов:', error)
    throw error
  }
}
