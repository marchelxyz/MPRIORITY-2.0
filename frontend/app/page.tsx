'use client'

import { useState } from 'react'
import HierarchyBuilder from '@/components/HierarchyBuilder'
import PairwiseComparison from '@/components/PairwiseComparison'
import Results from '@/components/Results'
import History from '@/components/History'
import { CheckCircle2, History as HistoryIcon } from 'lucide-react'
import { SavedAnalysis, saveAnalysis } from '@/lib/storage'

type Step = 'hierarchy' | 'criteria' | 'alternatives' | 'results'

interface HierarchyLevel {
  name: string
  items: string[]
}

export default function Home() {
  const [step, setStep] = useState<Step>('hierarchy')
  const [hierarchy, setHierarchy] = useState({
    goal: '',
    criteria: [] as string[],
    alternatives: [] as string[],
    levels: undefined as HierarchyLevel[] | undefined,
    isMultiLevel: false
  })
  const [criteriaMatrix, setCriteriaMatrix] = useState<number[][]>([])
  const [alternativeMatrices, setAlternativeMatrices] = useState<number[][][]>([])
  const [multiLevelMatrices, setMultiLevelMatrices] = useState<Record<string, number[][] | number[][][]>>({})
  const [currentComparisonLevel, setCurrentComparisonLevel] = useState(0)
  const [results, setResults] = useState<any>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null)

  // Автоматическое сохранение в базу данных на каждом этапе
  const autoSave = async (
    hierarchyData: typeof hierarchy,
    criteriaMatrixData?: number[][],
    alternativeMatricesData?: number[][][],
    resultsData?: any,
    includeResults = false
  ) => {
    try {
      // Проверяем, что есть минимальные данные для сохранения
      if (!hierarchyData.goal) {
        return
      }
      
      if (hierarchyData.isMultiLevel) {
        if (!hierarchyData.levels || hierarchyData.levels.length === 0) {
          return
        }
      } else {
        if (hierarchyData.criteria.length === 0 || hierarchyData.alternatives.length === 0) {
          return
        }
      }

      const savedId = await saveAnalysis({
        id: currentAnalysisId || undefined,
        timestamp: currentAnalysisId ? undefined : Date.now(),
        goal: hierarchyData.goal,
        criteria: hierarchyData.criteria,
        alternatives: hierarchyData.alternatives,
        levels: hierarchyData.levels,
        isMultiLevel: hierarchyData.isMultiLevel,
        criteriaMatrix: criteriaMatrixData && criteriaMatrixData.length > 0 ? criteriaMatrixData : undefined,
        alternativeMatrices: alternativeMatricesData && alternativeMatricesData.length > 0 ? alternativeMatricesData : undefined,
        multiLevelMatrices: hierarchyData.isMultiLevel ? multiLevelMatrices : undefined,
        results: includeResults && resultsData ? resultsData : undefined
      })

      if (savedId && !currentAnalysisId) {
        setCurrentAnalysisId(savedId)
      }

      console.log('✅ Автоматическое сохранение выполнено:', { id: savedId, step })
    } catch (error) {
      console.error('❌ Ошибка автоматического сохранения:', error)
      // Не показываем ошибку пользователю, так как это автоматическое сохранение
    }
  }

  const handleHierarchyComplete = async (data: any) => {
    setHierarchy(data)
    
    if (data.isMultiLevel && data.levels) {
      // Многоуровневая иерархия
      const levels = data.levels
      const matrices: Record<string, number[][] | number[][][]> = {}
      
      // Инициализируем матрицы для каждого уровня
      for (let i = 0; i < levels.length; i++) {
        const level = levels[i]
        const n = level.items.length
        
        if (i === 0) {
          // Первый уровень - одна матрица сравнения элементов
          const matrix = Array(n).fill(null).map(() => Array(n).fill(1))
          for (let j = 0; j < n; j++) {
            matrix[j][j] = 1
          }
          matrices[`level-${i}`] = matrix
        } else {
          // Последующие уровни - матрицы для каждого элемента родительского уровня
          const parentLevel = levels[i - 1]
          const matricesForLevel = Array(parentLevel.items.length).fill(null).map(() => {
            const matrix = Array(n).fill(null).map(() => Array(n).fill(1))
            for (let j = 0; j < n; j++) {
              matrix[j][j] = 1
            }
            return matrix
          })
          matrices[`level-${i}`] = matricesForLevel
        }
      }
      
      setMultiLevelMatrices(matrices)
      setCurrentComparisonLevel(0)
      setStep('criteria') // Используем тот же шаг для сравнения
    } else {
      // Классическая 3-уровневая иерархия
      const n = data.criteria.length
      const m = data.alternatives.length
      
      const initCriteriaMatrix = Array(n).fill(null).map(() => Array(n).fill(1))
      for (let i = 0; i < n; i++) {
        initCriteriaMatrix[i][i] = 1
      }
      
      const initAlternativeMatrices = Array(n).fill(null).map(() => {
        const matrix = Array(m).fill(null).map(() => Array(m).fill(1))
        for (let i = 0; i < m; i++) {
          matrix[i][i] = 1
        }
        return matrix
      })
      
      setCriteriaMatrix(initCriteriaMatrix)
      setAlternativeMatrices(initAlternativeMatrices)
      setStep('criteria')
      
      // Автоматическое сохранение после создания иерархии
      await autoSave(data, initCriteriaMatrix, initAlternativeMatrices, undefined, false)
    }
  }

  const handleCriteriaComplete = async (matrix: number[][] | number[][][]) => {
    if (hierarchy.isMultiLevel && hierarchy.levels) {
      // Многоуровневая иерархия
      const levels = hierarchy.levels
      const updatedMatrices = { ...multiLevelMatrices }
      
      if (currentComparisonLevel === 0) {
        // Первый уровень - одна матрица
        updatedMatrices[`level-${currentComparisonLevel}`] = matrix as number[][]
        setMultiLevelMatrices(updatedMatrices)
        
        // Автоматическое сохранение после заполнения первого уровня
        await autoSave(hierarchy, undefined, undefined, undefined, false)
        
        if (levels.length > 1) {
          // Переходим к следующему уровню
          setCurrentComparisonLevel(1)
        } else {
          // Это был последний уровень, переходим к расчету
          calculateMultiLevelResults(updatedMatrices)
        }
      } else {
        // Промежуточные уровни - массивы матриц
        updatedMatrices[`level-${currentComparisonLevel}`] = matrix as number[][][]
        setMultiLevelMatrices(updatedMatrices)
        
        // Автоматическое сохранение после заполнения уровня
        await autoSave(hierarchy, undefined, undefined, undefined, false)
        
        if (currentComparisonLevel < levels.length - 1) {
          // Переходим к следующему уровню
          setCurrentComparisonLevel(currentComparisonLevel + 1)
        } else {
          // Это был последний уровень, переходим к расчету
          calculateMultiLevelResults(updatedMatrices)
        }
      }
    } else {
      // Классическая 3-уровневая иерархия
      const criteriaMatrixData = matrix as number[][]
      setCriteriaMatrix(criteriaMatrixData)
      setStep('alternatives')
      
      // Автоматическое сохранение после заполнения матрицы критериев
      await autoSave(hierarchy, criteriaMatrixData, alternativeMatrices, undefined, false)
    }
  }

  const handleAlternativesComplete = async (matrices: number[][] | number[][][]) => {
    // Для альтернатив всегда передается number[][][]
    const alternativeMatricesData = matrices as number[][][]
    setAlternativeMatrices(alternativeMatricesData)
    
    // Автоматическое сохранение после заполнения матриц альтернатив
    await autoSave(hierarchy, criteriaMatrix, alternativeMatricesData, undefined, false)
    
    // Передаем матрицы напрямую, чтобы избежать проблемы с асинхронным обновлением состояния
    calculateResultsWithMatrices(criteriaMatrix, alternativeMatricesData)
  }

  const calculateMultiLevelResults = async (matrices?: Record<string, number[][] | number[][][]>) => {
    const matricesToUse = matrices || multiLevelMatrices
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/calculate-global-priorities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hierarchy: {
            goal: hierarchy.goal,
            levels: hierarchy.levels,
            criteria: hierarchy.criteria,
            alternatives: hierarchy.alternatives
          },
          criteriaMatrix: matricesToUse, // Для многоуровневой иерархии передаем объект с матрицами
          alternativeMatrices: null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Ошибка расчета')
      }

      const data = await response.json()
      setResults(data)
      setStep('results')
      
      // Автоматическое сохранение после расчета результатов
      await autoSave(hierarchy, criteriaMatrix, alternativeMatrices, data, true)
    } catch (error) {
      console.error('❌ Ошибка при расчете результатов:', error)
      alert(`Ошибка при расчете результатов:\n\n${error instanceof Error ? error.message : 'Проверьте подключение к серверу'}`)
    }
  }

  const calculateResults = async () => {
    if (hierarchy.isMultiLevel) {
      await calculateMultiLevelResults()
    } else {
      calculateResultsWithMatrices(criteriaMatrix, alternativeMatrices)
    }
  }

  const calculateResultsWithMatrices = async (
    criteriaMatrixData: number[][],
    alternativeMatricesData: number[][][]
  ) => {
    try {
      // Валидация входных данных
      if (!criteriaMatrixData || criteriaMatrixData.length === 0) {
        throw new Error('Матрица критериев не заполнена')
      }
      if (!alternativeMatricesData || alternativeMatricesData.length === 0) {
        throw new Error('Матрицы альтернатив не заполнены')
      }
      
      // Логируем данные для отладки
      console.log('📊 Расчет результатов с матрицами:', {
        goal: hierarchy.goal,
        criteriaCount: hierarchy.criteria.length,
        alternativesCount: hierarchy.alternatives.length,
        criteriaMatrixSize: criteriaMatrixData.length,
        criteriaMatrixSample: criteriaMatrixData.length > 0 ? criteriaMatrixData[0] : [],
        alternativeMatricesCount: alternativeMatricesData.length,
        alternativeMatricesSample: alternativeMatricesData.length > 0 && alternativeMatricesData[0].length > 0 
          ? alternativeMatricesData[0][0] : []
      })
      
      // Проверка заполненности матриц перед расчетом
      const isCriteriaMatrixUnfilled = criteriaMatrixData.length > 0 && 
        criteriaMatrixData.every((row, i) => 
          row.every((val, j) => i === j || val === 1)
        )
      
      const isAlternativeMatricesUnfilled = alternativeMatricesData.length > 0 &&
        alternativeMatricesData.some(matrix =>
          matrix.length > 0 &&
          matrix.every((row, i) => 
            row.every((val, j) => i === j || val === 1)
          )
        )
      
      if (isCriteriaMatrixUnfilled) {
        console.warn('⚠️ Матрица критериев не заполнена (все значения = 1)')
        const proceed = confirm(
          '⚠️ Внимание: Матрица критериев не заполнена (все значения = 1).\n\n' +
          'Это приведет к равным приоритетам всех критериев (50/50 или равномерное распределение).\n\n' +
          'Продолжить расчет?'
        )
        if (!proceed) return
      }
      
      if (isAlternativeMatricesUnfilled) {
        console.warn('⚠️ Одна или несколько матриц альтернатив не заполнены (все значения = 1)')
        const proceed = confirm(
          '⚠️ Внимание: Одна или несколько матриц альтернатив не заполнены (все значения = 1).\n\n' +
          'Это приведет к равным приоритетам альтернатив по соответствующим критериям.\n\n' +
          'Продолжить расчет?'
        )
        if (!proceed) return
      }
      
      // Детальное логирование матриц для отладки
      console.log('📋 Детали матрицы критериев:', {
        size: `${criteriaMatrixData.length}x${criteriaMatrixData[0]?.length || 0}`,
        matrix: criteriaMatrixData,
        hasNonOneValues: criteriaMatrixData.some((row, i) => 
          row.some((val, j) => i !== j && val !== 1)
        )
      })
      
      console.log('📋 Детали матриц альтернатив:', {
        count: alternativeMatricesData.length,
        matrices: alternativeMatricesData.map((matrix, idx) => ({
          criterion: hierarchy.criteria[idx],
          size: `${matrix.length}x${matrix[0]?.length || 0}`,
          matrix: matrix,
          hasNonOneValues: matrix.some((row, i) => 
            row.some((val, j) => i !== j && val !== 1)
          )
        }))
      })
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/calculate-global-priorities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hierarchy,
          criteriaMatrix: criteriaMatrixData,
          alternativeMatrices: alternativeMatricesData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Ошибка расчета')
      }

      const data = await response.json()
      console.log('✅ Результаты рассчитаны:', {
        globalPriorities: data.globalPriorities,
        criteriaPriorities: data.criteriaPriorities
      })
      setResults(data)
      setStep('results')
      
      // Автоматическое сохранение после расчета результатов
      await autoSave(hierarchy, criteriaMatrixData, alternativeMatricesData, data, true)
    } catch (error) {
      console.error('❌ Ошибка при расчете результатов:', error)
      alert(`Ошибка при расчете результатов:\n\n${error instanceof Error ? error.message : 'Проверьте подключение к серверу'}`)
    }
  }

  const reset = () => {
    setStep('hierarchy')
    setHierarchy({ goal: '', criteria: [], alternatives: [], levels: undefined, isMultiLevel: false })
    setCriteriaMatrix([])
    setAlternativeMatrices([])
    setMultiLevelMatrices({})
    setCurrentComparisonLevel(0)
    setResults(null)
    setCurrentAnalysisId(null)
  }

  const handleLoadAnalysis = (analysis: SavedAnalysis) => {
    const loadedHierarchy = {
      goal: analysis.goal,
      criteria: analysis.criteria,
      alternatives: analysis.alternatives,
      levels: analysis.levels,
      isMultiLevel: analysis.isMultiLevel || false
    }
    
    setHierarchy(loadedHierarchy)
    setCriteriaMatrix(analysis.criteriaMatrix || [])
    setAlternativeMatrices(analysis.alternativeMatrices || [])
    if (analysis.multiLevelMatrices) {
      setMultiLevelMatrices(analysis.multiLevelMatrices)
      // Определяем текущий уровень сравнения на основе заполненных матриц
      if (loadedHierarchy.isMultiLevel && loadedHierarchy.levels) {
        let lastFilledLevel = -1
        for (let i = 0; i < loadedHierarchy.levels.length; i++) {
          if (analysis.multiLevelMatrices[`level-${i}`]) {
            lastFilledLevel = i
          }
        }
        // Если все уровни заполнены, переходим к результатам, иначе к следующему незаполненному
        if (lastFilledLevel === loadedHierarchy.levels.length - 1 && analysis.results) {
          setCurrentComparisonLevel(0) // Не важно, так как перейдем к результатам
        } else {
          setCurrentComparisonLevel(Math.max(0, lastFilledLevel + 1))
        }
      }
    } else {
      setCurrentComparisonLevel(0)
    }
    setCurrentAnalysisId(analysis.id)
    
    // Если есть результаты, загружаем их
    if (analysis.results) {
      setResults(analysis.results)
      setStep('results')
    } else {
      // Вычисляем результаты сразу, используя загруженные данные напрямую
      if (loadedHierarchy.isMultiLevel && analysis.multiLevelMatrices) {
        // Проверяем, все ли уровни заполнены
        const allLevelsFilled = loadedHierarchy.levels?.every((_, i) => 
          analysis.multiLevelMatrices?.[`level-${i}`]
        )
        if (allLevelsFilled) {
          calculateMultiLevelResults(analysis.multiLevelMatrices)
        } else {
          // Не все уровни заполнены, переходим к сравнению
          setStep('criteria')
        }
      } else {
        calculateResultsWithMatrices(analysis.criteriaMatrix || [], analysis.alternativeMatrices || [])
      }
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1"></div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                MPRIORITY 2.0
              </h1>
              <p className="text-gray-600">
                Метод анализа иерархий (МАИ/AHP) для принятия решений
              </p>
            </div>
            <div className="flex-1 flex justify-end">
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                title="История анализов"
              >
                <HistoryIcon size={20} />
                <span className="hidden sm:inline">История</span>
              </button>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${step === 'hierarchy' ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step === 'hierarchy' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step !== 'hierarchy' ? <CheckCircle2 size={20} /> : '1'}
              </div>
              <span className="ml-2 font-medium text-gray-900">Иерархия</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${step === 'criteria' || step === 'alternatives' || step === 'results' ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step === 'criteria' ? 'bg-primary-600 text-white' : (step === 'alternatives' || step === 'results') ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {(step === 'alternatives' || step === 'results') ? <CheckCircle2 size={20} /> : '2'}
              </div>
              <span className="ml-2 font-medium text-gray-900">Критерии</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${step === 'alternatives' || step === 'results' ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step === 'alternatives' ? 'bg-primary-600 text-white' : step === 'results' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step === 'results' ? <CheckCircle2 size={20} /> : '3'}
              </div>
              <span className="ml-2 font-medium text-gray-900">Альтернативы</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${step === 'results' ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step === 'results' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                4
              </div>
              <span className="ml-2 font-medium text-gray-900">Результаты</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-xl p-6 text-gray-900">
          {step === 'hierarchy' && (
            <HierarchyBuilder onComplete={handleHierarchyComplete} />
          )}
          
          {step === 'criteria' && (
            <>
              {hierarchy.isMultiLevel && hierarchy.levels ? (
                <PairwiseComparison
                  title={`Сравнение элементов уровня: "${hierarchy.levels[currentComparisonLevel]?.name || `Уровень ${currentComparisonLevel + 1}`}"`}
                  items={hierarchy.levels[currentComparisonLevel]?.items || []}
                  matrix={currentComparisonLevel === 0 
                    ? (multiLevelMatrices[`level-${currentComparisonLevel}`] as number[][]) || []
                    : undefined}
                  matrices={currentComparisonLevel > 0
                    ? (multiLevelMatrices[`level-${currentComparisonLevel}`] as number[][][]) || []
                    : undefined}
                  criteria={currentComparisonLevel > 0 
                    ? hierarchy.levels[currentComparisonLevel - 1]?.items || []
                    : undefined}
                  onComplete={handleCriteriaComplete}
                  onBack={() => {
                    if (currentComparisonLevel > 0) {
                      setCurrentComparisonLevel(currentComparisonLevel - 1)
                    } else {
                      setStep('hierarchy')
                    }
                  }}
                />
              ) : (
                <PairwiseComparison
                  title="Сравнение критериев"
                  items={hierarchy.criteria}
                  matrix={criteriaMatrix}
                  onComplete={handleCriteriaComplete}
                  onBack={() => setStep('hierarchy')}
                />
              )}
            </>
          )}
          
          {step === 'alternatives' && (
            <PairwiseComparison
              title="Сравнение альтернатив"
              items={hierarchy.alternatives}
              matrices={alternativeMatrices}
              criteria={hierarchy.criteria}
              onComplete={handleAlternativesComplete}
              onBack={() => setStep('criteria')}
            />
          )}
          
          {step === 'results' && results && (
            <Results
              hierarchy={hierarchy}
              results={results}
              criteriaMatrix={criteriaMatrix}
              alternativeMatrices={alternativeMatrices}
              multiLevelMatrices={hierarchy.isMultiLevel ? multiLevelMatrices : undefined}
              onReset={reset}
            />
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <History
          onLoadAnalysis={handleLoadAnalysis}
          onClose={() => setShowHistory(false)}
        />
      )}
    </main>
  )
}
