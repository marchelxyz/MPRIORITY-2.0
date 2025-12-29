'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import HelpTooltip from './HelpTooltip'
import { decimalToFraction, fractionToDecimal } from '@/lib/fractions'

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
  { value: 1/9, label: '1/9 - Абсолютно менее важно' },
  { value: 1/8, label: '1/8 - Очень сильно менее важно' },
  { value: 1/7, label: '1/7 - Крайне менее важно' },
  { value: 1/6, label: '1/6 - Очень менее важно' },
  { value: 1/5, label: '1/5 - Существенно менее важно' },
  { value: 1/4, label: '1/4 - Значительно менее важно' },
  { value: 1/3, label: '1/3 - Умеренно менее важно' },
  { value: 1/2, label: '1/2 - Немного менее важно' },
  { value: 1, label: '1 - Равная важность' },
  { value: 2, label: '2 - Немного важнее' },
  { value: 3, label: '3 - Умеренно важнее' },
  { value: 4, label: '4 - Значительно важнее' },
  { value: 5, label: '5 - Существенно важнее' },
  { value: 6, label: '6 - Очень важнее' },
  { value: 7, label: '7 - Крайне важнее' },
  { value: 8, label: '8 - Очень сильно важнее' },
  { value: 9, label: '9 - Абсолютно важнее' },
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
  const [showFractions, setShowFractions] = useState(false)

  // Инициализация матриц только при изменении пропсов (не при изменении индекса)
  useEffect(() => {
    console.log('🔄 Инициализация компонента PairwiseComparison:', {
      hasMatrix: !!matrix,
      matrixSize: matrix?.length || 0,
      hasMatrices: !!matrices,
      matricesCount: matrices?.length || 0,
      hasCriteria: !!criteria,
      criteriaCount: criteria?.length || 0,
      itemsCount: items.length
    })
    
    if (matrix && matrix.length > 0) {
      console.log('📥 Загружена матрица критериев из пропсов:', matrix)
      setCurrentMatrix(matrix)
    } else if (matrices && criteria) {
      // Гарантируем, что массив матриц имеет правильный размер
      const n = items.length
      const initEmptyMatrix = () => {
        const initMatrix = Array(n).fill(null).map(() => Array(n).fill(1))
        for (let i = 0; i < n; i++) {
          initMatrix[i][i] = 1
        }
        return initMatrix
      }
      
      // Создаем массив матриц с правильным размером, сохраняя существующие данные
      const normalizedMatrices = Array(criteria.length).fill(null).map((_, idx) => {
        // Сначала используем переданную матрицу из пропсов (приоритет пропсам)
        if (matrices[idx] && matrices[idx].length > 0 && matrices[idx][0] && matrices[idx][0].length > 0) {
          return matrices[idx]
        }
        // Если пропсов нет, используем существующую матрицу из currentMatrices, если она есть и правильного размера
        if (currentMatrices[idx] && currentMatrices[idx].length === n && currentMatrices[idx][0]?.length === n) {
          return currentMatrices[idx]
        }
        // Иначе создаем единичную матрицу
        return initEmptyMatrix()
      })
      
      console.log('📥 Загружены матрицы альтернатив из пропсов:', {
        originalCount: matrices.length,
        normalizedCount: normalizedMatrices.length,
        criteriaCount: criteria.length,
        currentIndex: currentCriteriaIndex,
        currentMatrix: normalizedMatrices[currentCriteriaIndex] || normalizedMatrices[0]
      })
      
      setCurrentMatrices(normalizedMatrices)
      setCurrentMatrix(normalizedMatrices[currentCriteriaIndex] || normalizedMatrices[0] || initEmptyMatrix())
    } else if (items.length > 0) {
      // Инициализируем единичную матрицу, если матрица не передана
      const n = items.length
      const initMatrix = Array(n).fill(null).map(() => Array(n).fill(1))
      for (let i = 0; i < n; i++) {
        initMatrix[i][i] = 1
      }
      console.log('🆕 Инициализирована новая единичная матрица:', initMatrix)
      setCurrentMatrix(initMatrix)
    }
  }, [matrix, matrices, criteria, items]) // Убрали currentCriteriaIndex из зависимостей

  // Отдельный эффект для переключения матрицы при изменении индекса критерия
  // Используем только если матрицы уже инициализированы и имеют правильный размер
  useEffect(() => {
    if (matrices && criteria && currentMatrices.length === criteria.length && currentMatrices.length > 0) {
      const targetMatrix = currentMatrices[currentCriteriaIndex]
      if (targetMatrix && Array.isArray(targetMatrix) && targetMatrix.length > 0 && 
          Array.isArray(targetMatrix[0]) && targetMatrix[0].length > 0) {
        // Проверяем, что текущая матрица не совпадает с целевой (чтобы избежать лишних обновлений)
        const currentMatrixStr = JSON.stringify(currentMatrix)
        const targetMatrixStr = JSON.stringify(targetMatrix)
        if (currentMatrixStr !== targetMatrixStr) {
          console.log(`📖 Переключение на матрицу критерия ${currentCriteriaIndex}:`, targetMatrix)
          setCurrentMatrix([...targetMatrix.map(row => [...row])]) // Глубокая копия
        }
      }
    }
  }, [currentCriteriaIndex]) // Только при изменении индекса


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
      // Создаем обновленный массив матриц, гарантируя правильный размер и сохраняя все данные
      const n = items.length
      const initEmptyMatrix = () => {
        const initMatrix = Array(n).fill(null).map(() => Array(n).fill(1))
        for (let k = 0; k < n; k++) {
          initMatrix[k][k] = 1
        }
        return initMatrix
      }
      
      // Создаем массив матриц с правильным размером, сохраняя все существующие данные
      const updatedMatrices = Array(criteria.length).fill(null).map((_, idx) => {
        // Если это текущий индекс, используем обновленную матрицу
        if (idx === currentCriteriaIndex) {
          return newMatrix
        }
        // Иначе используем существующую матрицу из currentMatrices, если она есть и правильного размера
        if (currentMatrices[idx] && currentMatrices[idx].length === n && currentMatrices[idx][0]?.length === n) {
          return currentMatrices[idx]
        }
        // Иначе создаем единичную матрицу
        return initEmptyMatrix()
      })
      
      setCurrentMatrices(updatedMatrices)
      
      // Логируем обновление матрицы для отладки
      console.log(`📝 Обновлена матрица для критерия "${criteria[currentCriteriaIndex]}":`, {
        index: currentCriteriaIndex,
        position: `[${i},${j}]`,
        value: value,
        reciprocal: i !== j ? newMatrix[j][i] : 'N/A',
        matrix: newMatrix,
        matricesCount: updatedMatrices.length
      })
    } else {
      // Логируем обновление матрицы критериев
      console.log('📝 Обновлена матрица критериев:', {
        position: `[${i},${j}]`,
        value: value,
        reciprocal: i !== j ? newMatrix[j][i] : 'N/A',
        matrix: newMatrix
      })
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
      // Создаем обновленный массив матриц, гарантируя правильный размер
      const n = items.length
      const initEmptyMatrix = () => {
        const initMatrix = Array(n).fill(null).map(() => Array(n).fill(1))
        for (let k = 0; k < n; k++) {
          initMatrix[k][k] = 1
        }
        return initMatrix
      }
      
      // Создаем массив матриц с правильным размером, сохраняя все существующие данные
      const updatedMatrices = Array(criteria.length).fill(null).map((_, idx) => {
        // Если это текущий индекс, сохраняем текущую матрицу
        if (idx === currentCriteriaIndex) {
          return currentMatrix
        }
        // Иначе используем существующую матрицу из currentMatrices, если она есть и правильного размера
        if (currentMatrices[idx] && currentMatrices[idx].length === n && currentMatrices[idx][0]?.length === n) {
          return currentMatrices[idx]
        }
        // Иначе создаем единичную матрицу
        return initEmptyMatrix()
      })
      
      // Сохраняем текущую матрицу перед переходом (на всякий случай)
      updatedMatrices[currentCriteriaIndex] = currentMatrix
      
      console.log(`➡️ Переход к следующему критерию. Сохранена матрица для "${criteria[currentCriteriaIndex]}":`, {
        index: currentCriteriaIndex,
        matrix: currentMatrix,
        allMatrices: updatedMatrices,
        matricesCount: updatedMatrices.length,
        hasNonOneValues: currentMatrix.some((row, i) => 
          row.some((val, j) => i !== j && val !== 1)
        )
      })
      
      // Обновляем состояние всех матриц
      setCurrentMatrices(updatedMatrices)
      
      // Переходим к следующему критерию
      const newIndex = currentCriteriaIndex + 1
      
      // Сразу загружаем матрицу следующего критерия
      const nextMatrix = updatedMatrices[newIndex]
      if (nextMatrix && nextMatrix.length > 0 && nextMatrix[0] && nextMatrix[0].length > 0) {
        console.log(`📖 Загружена существующая матрица для "${criteria[newIndex]}":`, nextMatrix)
        setCurrentMatrix([...nextMatrix.map(row => [...row])]) // Глубокая копия
      }
      
      setCurrentCriteriaIndex(newIndex)
      setConsistency(null)
    } else {
      // Сохраняем текущую матрицу перед завершением
      if (matrices && criteria) {
        // Создаем финальный массив матриц с сохранением текущей матрицы
        const finalMatrices = currentMatrices.length === criteria.length 
          ? [...currentMatrices]
          : Array(criteria.length).fill(null).map((_, idx) => 
              currentMatrices[idx] || (() => {
                const n = items.length
                const initMatrix = Array(n).fill(null).map(() => Array(n).fill(1))
                for (let k = 0; k < n; k++) {
                  initMatrix[k][k] = 1
                }
                return initMatrix
              })()
            )
        
        // Сохраняем текущую матрицу
        finalMatrices[currentCriteriaIndex] = currentMatrix
        
        console.log('✅ Завершение сравнения альтернатив. Финальные матрицы:', {
          count: finalMatrices.length,
          matrices: finalMatrices.map((matrix, idx) => ({
            criterion: criteria[idx],
            matrix: matrix,
            hasNonOneValues: matrix.some((row, i) => 
              row.some((val, j) => i !== j && val !== 1)
            )
          }))
        })
        
        onComplete(finalMatrices)
      } else {
        console.log('✅ Завершение сравнения критериев. Финальная матрица:', {
          matrix: currentMatrix,
          hasNonOneValues: currentMatrix.some((row, i) => 
            row.some((val, j) => i !== j && val !== 1)
          )
        })
        onComplete(currentMatrix)
      }
    }
  }

  const handleBack = () => {
    if (matrices && criteria && currentCriteriaIndex > 0) {
      // Создаем обновленный массив матриц, гарантируя правильный размер
      const n = items.length
      const initEmptyMatrix = () => {
        const initMatrix = Array(n).fill(null).map(() => Array(n).fill(1))
        for (let k = 0; k < n; k++) {
          initMatrix[k][k] = 1
        }
        return initMatrix
      }
      
      // Создаем массив матриц с правильным размером, сохраняя все существующие данные
      const updatedMatrices = Array(criteria.length).fill(null).map((_, idx) => {
        // Если это текущий индекс, сохраняем текущую матрицу
        if (idx === currentCriteriaIndex) {
          return currentMatrix
        }
        // Иначе используем существующую матрицу из currentMatrices, если она есть и правильного размера
        if (currentMatrices[idx] && currentMatrices[idx].length === n && currentMatrices[idx][0]?.length === n) {
          return currentMatrices[idx]
        }
        // Иначе создаем единичную матрицу
        return initEmptyMatrix()
      })
      
      // Сохраняем текущую матрицу перед возвратом
      updatedMatrices[currentCriteriaIndex] = currentMatrix
      setCurrentMatrices(updatedMatrices)
      
      const newIndex = currentCriteriaIndex - 1
      
      // Сразу загружаем матрицу предыдущего критерия
      const prevMatrix = updatedMatrices[newIndex]
      if (prevMatrix && prevMatrix.length > 0 && prevMatrix[0] && prevMatrix[0].length > 0) {
        console.log(`📖 Загружена существующая матрица для "${criteria[newIndex]}":`, prevMatrix)
        setCurrentMatrix([...prevMatrix.map(row => [...row])]) // Глубокая копия
      }
      
      setCurrentCriteriaIndex(newIndex)
      setConsistency(null)
    } else {
      onBack()
    }
  }

  const currentTitle = matrices && criteria
    ? `${title} по критерию: "${criteria[currentCriteriaIndex]}"`
    : title

  // Находит ближайшее значение из шкалы для отображения в select
  const findClosestScaleValue = (value: number): number => {
    const precision = 0.0001 // Точность для сравнения чисел с плавающей точкой
    
    // Сначала проверяем точное совпадение
    for (const scale of COMPARISON_SCALE) {
      if (Math.abs(value - scale.value) < precision) {
        return scale.value
      }
    }
    
    // Если точного совпадения нет, находим ближайшее
    let closest = COMPARISON_SCALE[0].value
    let minDiff = Math.abs(value - closest)
    
    for (const scale of COMPARISON_SCALE) {
      const diff = Math.abs(value - scale.value)
      if (diff < minDiff) {
        minDiff = diff
        closest = scale.value
      }
    }
    
    return closest
  }

  // Проверяем, является ли матрица единичной (все значения = 1)
  const isMatrixUnfilled = () => {
    if (!currentMatrix || currentMatrix.length === 0) return true
    const n = currentMatrix.length
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && currentMatrix[i][j] !== 1) {
          return false
        }
      }
    }
    return true
  }

  return (
    <div className="space-y-6 text-gray-900">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900">{currentTitle}</h2>
          <HelpTooltip
            title="Как выполнить попарное сравнение?"
            type="guide"
            content={
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-green-600" />
                    Что такое попарное сравнение?
                  </h4>
                  <p className="text-gray-700 mb-3">
                    Попарное сравнение — это метод оценки, при котором вы сравниваете элементы по два, 
                    определяя, насколько один важнее другого. Это позволяет избежать путаницы при сравнении 
                    множества элементов одновременно.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-green-600" />
                    Шкала сравнения (1-9)
                  </h4>
                  <div className="space-y-2 text-gray-700">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <strong>1 — Равная важность</strong>
                      <p className="text-sm text-gray-600 mt-1">Оба элемента одинаково важны</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <strong>3 — Умеренно важнее</strong>
                      <p className="text-sm text-gray-600 mt-1">Один элемент немного важнее другого</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <strong>5 — Существенно важнее</strong>
                      <p className="text-sm text-gray-600 mt-1">Один элемент заметно важнее</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <strong>7 — Очень важнее</strong>
                      <p className="text-sm text-gray-600 mt-1">Один элемент значительно важнее</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <strong>9 — Абсолютно важнее</strong>
                      <p className="text-sm text-gray-600 mt-1">Один элемент критически важнее другого</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Значения 2, 4, 6, 8 — промежуточные между соседними значениями.
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-green-600" />
                    Как заполнять таблицу?
                  </h4>
                  <div className="space-y-3 text-gray-700">
                    <div>
                      <strong>1. Диагональ (1, 1):</strong>
                      <p className="ml-4 mt-1 text-sm">Всегда равна 1 — элемент сравнивается сам с собой</p>
                    </div>
                    
                    <div>
                      <strong>2. Верхняя часть таблицы:</strong>
                      <p className="ml-4 mt-1 text-sm">
                        Выберите значение от 1 до 9, показывающее, насколько элемент в строке важнее элемента в столбце.
                        Например, если "Цена" важнее "Дизайна" в 5 раз, выберите 5.
                      </p>
                    </div>
                    
                    <div>
                      <strong>3. Нижняя часть таблицы:</strong>
                      <p className="ml-4 mt-1 text-sm">
                        Заполняется автоматически — это обратное значение (1/выбранное значение).
                        Если вы выбрали 5, то обратное значение будет 1/5 = 0.200.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-green-600" />
                    Проверка согласованности
                  </h4>
                  <p className="text-gray-700 mb-2">
                    После заполнения таблицы нажмите кнопку "Проверить согласованность". 
                    Система проверит логичность ваших сравнений:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li><strong>CR &lt; 10%</strong> — отличная согласованность, можно продолжать</li>
                    <li><strong>CR 10-20%</strong> — приемлемая согласованность</li>
                    <li><strong>CR &gt; 20%</strong> — низкая согласованность, рекомендуется пересмотреть сравнения</li>
                  </ul>
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-amber-600" />
                    Важные советы
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-amber-800 text-sm">
                    <li>Будьте последовательны: если A важнее B в 3 раза, а B важнее C в 2 раза, то A должно быть важнее C примерно в 6 раз</li>
                    <li>Не торопитесь — подумайте над каждым сравнением</li>
                    <li>Если согласованность низкая, пересмотрите сравнения, которые кажутся вам неуверенными</li>
                    <li>При сравнении альтернатив по каждому критерию думайте только об этом критерии</li>
                  </ul>
                </div>
              </div>
            }
          />
        </div>
        <p className="text-gray-600">
          Сравните элементы попарно. Выберите, насколько один элемент важнее другого по шкале от 1 до 9.
        </p>
        {matrices && criteria && (
          <p className="text-sm text-gray-500 mt-2">
            Критерий {currentCriteriaIndex + 1} из {criteria.length}
          </p>
        )}
        {isMatrixUnfilled() && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-amber-900 font-semibold mb-1">Важно: Заполните матрицу сравнения</p>
                <p className="text-amber-800 text-sm">
                  Если вы не заполните матрицу сравнения (оставите все значения равными 1), 
                  то все элементы получат равные приоритеты, и результат будет 50/50 (или равномерно распределенным). 
                  Пожалуйста, заполните матрицу, выбрав значения из шкалы сравнения выше.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comparison Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-gray-900">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 bg-gray-50 text-gray-900"></th>
              {items.map((item, index) => (
                <th key={index} className="border border-gray-300 p-2 bg-gray-50 text-sm font-medium text-center min-w-[120px] text-gray-900">
                  {item}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item1, i) => (
              <tr key={i}>
                <td className="border border-gray-300 p-2 bg-gray-50 font-medium text-gray-900">
                  {item1}
                </td>
                {items.map((item2, j) => (
                  <td key={j} className="border border-gray-300 p-2 text-gray-900">
                    {i === j ? (
                      <div className="text-center text-gray-600">1</div>
                    ) : i < j ? (
                      <select
                        value={findClosestScaleValue(currentMatrix[i]?.[j] ?? 1)}
                        onChange={(e) => updateMatrix(i, j, parseFloat(e.target.value))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                      >
                        {COMPARISON_SCALE.map((scale) => (
                          <option key={scale.value} value={scale.value}>
                            {scale.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-center text-gray-700">
                        {currentMatrix[i]?.[j] 
                          ? (showFractions 
                              ? decimalToFraction(currentMatrix[i][j]) 
                              : currentMatrix[i][j].toFixed(3))
                          : (showFractions ? '1' : '1.000')}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fraction Conversion Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showFractions}
            onChange={(e) => setShowFractions(e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">
            Показывать дробные числа как обыкновенные дроби (например, 0.5 → 1/2)
          </span>
        </label>
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
