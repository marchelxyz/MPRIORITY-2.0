'use client'

import { useState } from 'react'
import HierarchyBuilder from '@/components/HierarchyBuilder'
import PairwiseComparison from '@/components/PairwiseComparison'
import Results from '@/components/Results'
import { CheckCircle2 } from 'lucide-react'

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

  const reset = () => {
    setStep('hierarchy')
    setHierarchy({ goal: '', criteria: [], alternatives: [] })
    setCriteriaMatrix([])
    setAlternativeMatrices([])
    setResults(null)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            MPRIORITY 2.0
          </h1>
          <p className="text-gray-600">
            Метод анализа иерархий (МАИ/AHP) для принятия решений
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${step === 'hierarchy' ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step === 'hierarchy' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step !== 'hierarchy' ? <CheckCircle2 size={20} /> : '1'}
              </div>
              <span className="ml-2 font-medium">Иерархия</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${step === 'criteria' || step === 'alternatives' || step === 'results' ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step === 'criteria' ? 'bg-primary-600 text-white' : (step === 'alternatives' || step === 'results') ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {(step === 'alternatives' || step === 'results') ? <CheckCircle2 size={20} /> : '2'}
              </div>
              <span className="ml-2 font-medium">Критерии</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${step === 'alternatives' || step === 'results' ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step === 'alternatives' ? 'bg-primary-600 text-white' : step === 'results' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step === 'results' ? <CheckCircle2 size={20} /> : '3'}
              </div>
              <span className="ml-2 font-medium">Альтернативы</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${step === 'results' ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step === 'results' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                4
              </div>
              <span className="ml-2 font-medium">Результаты</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-xl p-6">
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
              onReset={reset}
            />
          )}
        </div>
      </div>
    </main>
  )
}
