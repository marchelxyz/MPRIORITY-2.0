'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'

interface PairwiseComparisonProps {
  title: string
  items: string[]
  matrix?: number[][]
  matrices?: number[][][]
  criteria?: string[]
  onComplete: (matrix: number[][] | number[][][]) => void
  onBack: () => void
}

const COMPARISON_SCALE = [
  { value: 1, label: 'Равная важность' },
  { value: 2, label: 'Немного важнее' },
  { value: 3, label: 'Умеренно важнее' },
  { value: 4, label: 'Значительно важнее' },
  { value: 5, label: 'Существенно важнее' },
  { value: 6, label: 'Очень важнее' },
  { value: 7, label: 'Крайне важнее' },
  { value: 8, label: 'Очень сильно важнее' },
  { value: 9, label: 'Абсолютно важнее' },
]

export default function PairwiseComparison({
  title,
  items,
  matrix,
  matrices,
  criteria,
  onComplete,
  onBack
}: PairwiseComparisonProps) {
  const [currentMatrix, setCurrentMatrix] = useState<number[][]>([])
  const [currentMatrices, setCurrentMatrices] = useState<number[][][]>([])
  const [currentCriteriaIndex, setCurrentCriteriaIndex] = useState(0)
  const [consistency, setConsistency] = useState<any>(null)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    if (matrix && matrix.length > 0) {
      setCurrentMatrix(matrix)
    } else if (matrices && criteria && matrices.length > 0 && matrices[0]) {
      setCurrentMatrices(matrices)
      setCurrentMatrix(matrices[0] || [])
    } else if (items.length > 0) {
      // Инициализируем единичную матрицу, если матрица не передана
      const n = items.length
      const initMatrix = Array(n).fill(null).map(() => Array(n).fill(1))
      for (let i = 0; i < n; i++) {
        initMatrix[i][i] = 1
      }
      setCurrentMatrix(initMatrix)
    }
  }, [matrix, matrices, criteria, items])

  const updateMatrix = (i: number, j: number, value: number) => {
    // Проверяем, что матрица инициализирована
    let matrixToUpdate = currentMatrix
    if (!matrixToUpdate || matrixToUpdate.length === 0 || !matrixToUpdate[i]) {
      const n = items.length
      const initMatrix = Array(n).fill(null).map(() => Array(n).fill(1))
      for (let k = 0; k < n; k++) {
        initMatrix[k][k] = 1
      }
      matrixToUpdate = initMatrix
    }
    
    const newMatrix = matrixToUpdate.map(row => [...row])
    
    // Устанавливаем значение
    newMatrix[i][j] = value
    
    // Автоматически устанавливаем обратное значение
    if (i !== j) {
      const reciprocal = 1 / value
      // Округляем для красоты отображения
      newMatrix[j][i] = Math.round(reciprocal * 1000) / 1000
    }
    
    setCurrentMatrix(newMatrix)
    
    if (matrices && criteria) {
      const newMatrices = [...currentMatrices]
      newMatrices[currentCriteriaIndex] = newMatrix
      setCurrentMatrices(newMatrices)
    }
    
    // Сбрасываем проверку согласованности при изменении матрицы
    setConsistency(null)
  }

  const checkConsistency = async () => {
    setIsChecking(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/check-consistency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matrix: currentMatrix }),
      })

      if (response.ok) {
        const data = await response.json()
        setConsistency(data)
      }
    } catch (error) {
      console.error('Ошибка проверки согласованности:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const handleNext = () => {
    if (matrices && criteria && currentCriteriaIndex < criteria.length - 1) {
      const newIndex = currentCriteriaIndex + 1
      setCurrentCriteriaIndex(newIndex)
      const nextMatrix = currentMatrices[newIndex]
      if (nextMatrix && nextMatrix.length > 0) {
        setCurrentMatrix(nextMatrix)
      } else {
        // Инициализируем матрицу, если она не существует
        const n = items.length
        const initMatrix = Array(n).fill(null).map(() => Array(n).fill(1))
        for (let k = 0; k < n; k++) {
          initMatrix[k][k] = 1
        }
        setCurrentMatrix(initMatrix)
      }
      setConsistency(null)
    } else {
      if (matrices && criteria) {
        onComplete(currentMatrices)
      } else {
        onComplete(currentMatrix)
      }
    }
  }

  const handleBack = () => {
    if (matrices && criteria && currentCriteriaIndex > 0) {
      const newIndex = currentCriteriaIndex - 1
      setCurrentCriteriaIndex(newIndex)
      const prevMatrix = currentMatrices[newIndex]
      if (prevMatrix && prevMatrix.length > 0) {
        setCurrentMatrix(prevMatrix)
      } else {
        // Инициализируем матрицу, если она не существует
        const n = items.length
        const initMatrix = Array(n).fill(null).map(() => Array(n).fill(1))
        for (let k = 0; k < n; k++) {
          initMatrix[k][k] = 1
        }
        setCurrentMatrix(initMatrix)
      }
      setConsistency(null)
    } else {
      onBack()
    }
  }

  const currentTitle = matrices && criteria
    ? `${title} по критерию: "${criteria[currentCriteriaIndex]}"`
    : title

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentTitle}</h2>
        <p className="text-gray-600">
          Сравните элементы попарно. Выберите, насколько один элемент важнее другого по шкале от 1 до 9.
        </p>
        {matrices && criteria && (
          <p className="text-sm text-gray-500 mt-2">
            Критерий {currentCriteriaIndex + 1} из {criteria.length}
          </p>
        )}
      </div>

      {/* Comparison Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 bg-gray-50"></th>
              {items.map((item, index) => (
                <th key={index} className="border border-gray-300 p-2 bg-gray-50 text-sm font-medium text-center min-w-[120px]">
                  {item}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item1, i) => (
              <tr key={i}>
                <td className="border border-gray-300 p-2 bg-gray-50 font-medium">
                  {item1}
                </td>
                {items.map((item2, j) => (
                  <td key={j} className="border border-gray-300 p-2">
                    {i === j ? (
                      <div className="text-center text-gray-400">1</div>
                    ) : i < j ? (
                      <select
                        value={currentMatrix[i]?.[j] ?? 1}
                        onChange={(e) => updateMatrix(i, j, parseFloat(e.target.value))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        {COMPARISON_SCALE.map((scale) => (
                          <option key={scale.value} value={scale.value}>
                            {scale.value} - {scale.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-center text-gray-500">
                        {currentMatrix[j]?.[i] ? (1 / currentMatrix[j][i]).toFixed(3) : '1.000'}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Consistency Check */}
      <div className="flex items-center gap-4">
        <button
          onClick={checkConsistency}
          disabled={isChecking}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isChecking ? 'Проверка...' : 'Проверить согласованность'}
        </button>

        {consistency && (
          <div className={`flex items-center gap-2 ${consistency.isConsistent ? 'text-green-600' : 'text-orange-600'}`}>
            {consistency.isConsistent ? (
              <>
                <CheckCircle2 size={20} />
                <span>Согласованность приемлема (CR = {(consistency.cr * 100).toFixed(2)}%)</span>
              </>
            ) : (
              <>
                <AlertCircle size={20} />
                <span>Низкая согласованность (CR = {(consistency.cr * 100).toFixed(2)}%). Рекомендуется пересмотреть сравнения.</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={20} />
          Назад
        </button>
        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          {matrices && criteria && currentCriteriaIndex < criteria.length - 1 ? 'Следующий критерий' : 'Продолжить'}
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  )
}
