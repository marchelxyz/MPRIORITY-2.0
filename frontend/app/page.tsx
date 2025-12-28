'use client'

import { useState } from 'react'
import HierarchyBuilder from '@/components/HierarchyBuilder'
import PairwiseComparison from '@/components/PairwiseComparison'
import Results from '@/components/Results'
import History from '@/components/History'
import { CheckCircle2, History as HistoryIcon } from 'lucide-react'
import { SavedAnalysis } from '@/lib/storage'

type Step = 'hierarchy' | 'criteria' | 'alternatives' | 'results'

export default function Home() {
  const [step, setStep] = useState<Step>('hierarchy')
  const [hierarchy, setHierarchy] = useState({
    goal: '',
    criteria: [] as string[],
    alternatives: [] as string[]
  })
  const [criteriaMatrix, setCriteriaMatrix] = useState<number[][]>([])
  const [alternativeMatrices, setAlternativeMatrices] = useState<number[][][]>([])
  const [results, setResults] = useState<any>(null)
  const [showHistory, setShowHistory] = useState(false)

  const handleHierarchyComplete = (data: typeof hierarchy) => {
    setHierarchy(data)
    // Инициализируем матрицы единичными матрицами
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
  }

  const handleCriteriaComplete = (matrix: number[][] | number[][][]) => {
    // Для критериев всегда передается number[][]
    setCriteriaMatrix(matrix as number[][])
    setStep('alternatives')
  }

  const handleAlternativesComplete = (matrices: number[][] | number[][][]) => {
    // Для альтернатив всегда передается number[][][]
    setAlternativeMatrices(matrices as number[][][])
    calculateResults()
  }

  const calculateResults = async () => {
    try {
      // Простая проверка заполненности матриц перед расчетом
      const isCriteriaMatrixUnfilled = criteriaMatrix.length > 0 && 
        criteriaMatrix.every((row, i) => 
          row.every((val, j) => i === j || val === 1)
        )
      
      const isAlternativeMatricesUnfilled = alternativeMatrices.length > 0 &&
        alternativeMatrices.some(matrix =>
          matrix.length > 0 &&
          matrix.every((row, i) => 
            row.every((val, j) => i === j || val === 1)
          )
        )
      
      if (isCriteriaMatrixUnfilled) {
        const proceed = confirm(
          '⚠️ Внимание: Матрица критериев не заполнена (все значения = 1).\n\n' +
          'Это приведет к равным приоритетам всех критериев (50/50 или равномерное распределение).\n\n' +
          'Продолжить расчет?'
        )
        if (!proceed) return
      }
      
      if (isAlternativeMatricesUnfilled) {
        const proceed = confirm(
          '⚠️ Внимание: Одна или несколько матриц альтернатив не заполнены (все значения = 1).\n\n' +
          'Это приведет к равным приоритетам альтернатив по соответствующим критериям.\n\n' +
          'Продолжить расчет?'
        )
        if (!proceed) return
      }
      
      console.log('📊 Расчет результатов:', {
        goal: hierarchy.goal,
        criteriaCount: hierarchy.criteria.length,
        alternativesCount: hierarchy.alternatives.length,
        criteriaMatrixSize: criteriaMatrix.length,
        alternativeMatricesCount: alternativeMatrices.length
      })
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/calculate-global-priorities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hierarchy,
          criteriaMatrix,
          alternativeMatrices,
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
    } catch (error) {
      console.error('❌ Ошибка при расчете результатов:', error)
      alert(`Ошибка при расчете результатов:\n\n${error instanceof Error ? error.message : 'Проверьте подключение к серверу'}`)
    }
  }

  const reset = () => {
    setStep('hierarchy')
    setHierarchy({ goal: '', criteria: [], alternatives: [] })
    setCriteriaMatrix([])
    setAlternativeMatrices([])
    setResults(null)
  }

  const handleLoadAnalysis = (analysis: SavedAnalysis) => {
    setHierarchy({
      goal: analysis.goal,
      criteria: analysis.criteria,
      alternatives: analysis.alternatives
    })
    setCriteriaMatrix(analysis.criteriaMatrix)
    setAlternativeMatrices(analysis.alternativeMatrices)
    
    // Вычисляем результаты сразу
    calculateResultsFromSaved(analysis.criteriaMatrix, analysis.alternativeMatrices, {
      goal: analysis.goal,
      criteria: analysis.criteria,
      alternatives: analysis.alternatives
    })
  }

  const calculateResultsFromSaved = async (
    savedCriteriaMatrix: number[][],
    savedAlternativeMatrices: number[][][],
    savedHierarchy: typeof hierarchy
  ) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/calculate-global-priorities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hierarchy: savedHierarchy,
          criteriaMatrix: savedCriteriaMatrix,
          alternativeMatrices: savedAlternativeMatrices,
        }),
      })

      if (!response.ok) {
        throw new Error('Ошибка расчета')
      }

      const data = await response.json()
      setResults(data)
      setStep('results')
    } catch (error) {
      console.error('Ошибка:', error)
      alert('Ошибка при расчете результатов. Проверьте подключение к серверу.')
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
            <PairwiseComparison
              title="Сравнение критериев"
              items={hierarchy.criteria}
              matrix={criteriaMatrix}
              onComplete={handleCriteriaComplete}
              onBack={() => setStep('hierarchy')}
            />
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
