'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, X, ArrowRight, CheckCircle2, ChevronUp, ChevronDown } from 'lucide-react'
import HelpTooltip from './HelpTooltip'
import { shortenText, debounce } from '@/lib/textShortener'

interface HierarchyLevel {
  name: string
  items: string[]
}

interface ShortenedTexts {
  goal?: { original: string; shortened: string }
  criteria?: { original: string; shortened: string }[]
  alternatives?: { original: string; shortened: string }[]
  levels?: Array<{
    name: { original: string; shortened: string }
    items: { original: string; shortened: string }[]
  }>
}

interface HierarchyBuilderProps {
  onComplete: (data: { 
    goal: string
    criteria: string[]
    alternatives: string[]
    levels?: HierarchyLevel[]
    isMultiLevel?: boolean
    shortenedTexts?: ShortenedTexts
  }) => void
}

export default function HierarchyBuilder({ onComplete }: HierarchyBuilderProps) {
  const [goal, setGoal] = useState('')
  const [criteria, setCriteria] = useState<string[]>([''])
  const [alternatives, setAlternatives] = useState<string[]>(['', ''])
  const [isMultiLevel, setIsMultiLevel] = useState(false)
  const [levels, setLevels] = useState<HierarchyLevel[]>([
    { name: 'Критерии', items: [''] },
    { name: 'Альтернативы', items: ['', ''] }
  ])
  
  // Хранилище сокращенных текстов
  const [shortenedTexts, setShortenedTexts] = useState<ShortenedTexts>({})
  
  // Ref для отслеживания активных запросов
  const activeRequestsRef = useRef<Set<string>>(new Set())
  
  // Debounced функция для сокращения текста
  const debouncedShorten = useRef(
    debounce(async (key: string, text: string, updateFn: (shortened: string) => void) => {
      if (!text || text.trim() === '' || activeRequestsRef.current.has(key)) {
        return
      }
      
      activeRequestsRef.current.add(key)
      try {
        const shortened = await shortenText(text)
        updateFn(shortened)
      } catch (error) {
        console.error('Ошибка при сокращении текста:', error)
      } finally {
        activeRequestsRef.current.delete(key)
      }
    }, 1000) // Задержка 1 секунда
  ).current

  const addCriterion = () => {
    setCriteria([...criteria, ''])
  }

  const removeCriterion = (index: number) => {
    if (criteria.length > 1) {
      setCriteria(criteria.filter((_, i) => i !== index))
    }
  }

  const updateCriterion = (index: number, value: string) => {
    const newCriteria = [...criteria]
    newCriteria[index] = value
    setCriteria(newCriteria)
    
    // Сокращаем текст асинхронно
    if (value.trim()) {
      debouncedShorten(`criteria-${index}`, value, (shortened) => {
        setShortenedTexts(prev => {
          const currentCriteria = prev.criteria || criteria.map(c => ({ original: c, shortened: c.toUpperCase() }))
          const newCriteria = [...currentCriteria]
          if (!newCriteria[index] || newCriteria[index].original !== value) {
            newCriteria[index] = { original: value, shortened: shortened || value.toUpperCase() }
          } else {
            newCriteria[index] = { ...newCriteria[index], shortened }
          }
          return { ...prev, criteria: newCriteria }
        })
      })
    } else {
      // Очищаем сокращенный текст при очистке поля
      setShortenedTexts(prev => {
        const currentCriteria = prev.criteria || []
        const newCriteria = [...currentCriteria]
        if (newCriteria[index]) {
          newCriteria[index] = { original: '', shortened: '' }
        }
        return { ...prev, criteria: newCriteria }
      })
    }
  }

  const addAlternative = () => {
    setAlternatives([...alternatives, ''])
  }

  const removeAlternative = (index: number) => {
    if (alternatives.length > 2) {
      setAlternatives(alternatives.filter((_, i) => i !== index))
    }
  }

  const updateAlternative = (index: number, value: string) => {
    const newAlternatives = [...alternatives]
    newAlternatives[index] = value
    setAlternatives(newAlternatives)
    
    // Сокращаем текст асинхронно
    if (value.trim()) {
      debouncedShorten(`alternative-${index}`, value, (shortened) => {
        setShortenedTexts(prev => {
          const currentAlternatives = prev.alternatives || alternatives.map(a => ({ original: a, shortened: a.toUpperCase() }))
          const newAlternatives = [...currentAlternatives]
          if (!newAlternatives[index] || newAlternatives[index].original !== value) {
            newAlternatives[index] = { original: value, shortened: shortened || value.toUpperCase() }
          } else {
            newAlternatives[index] = { ...newAlternatives[index], shortened }
          }
          return { ...prev, alternatives: newAlternatives }
        })
      })
    } else {
      // Очищаем сокращенный текст при очистке поля
      setShortenedTexts(prev => {
        const currentAlternatives = prev.alternatives || []
        const newAlternatives = [...currentAlternatives]
        if (newAlternatives[index]) {
          newAlternatives[index] = { original: '', shortened: '' }
        }
        return { ...prev, alternatives: newAlternatives }
      })
    }
  }

  const addLevel = () => {
    setLevels([...levels, { name: `Уровень ${levels.length + 1}`, items: [''] }])
  }

  const removeLevel = (index: number) => {
    if (levels.length > 2) {
      setLevels(levels.filter((_, i) => i !== index))
    }
  }

  const moveLevelUp = (index: number) => {
    if (index > 0) {
      const newLevels = [...levels]
      ;[newLevels[index - 1], newLevels[index]] = [newLevels[index], newLevels[index - 1]]
      setLevels(newLevels)
    }
  }

  const moveLevelDown = (index: number) => {
    if (index < levels.length - 1) {
      const newLevels = [...levels]
      ;[newLevels[index], newLevels[index + 1]] = [newLevels[index + 1], newLevels[index]]
      setLevels(newLevels)
    }
  }

  const updateLevelName = (index: number, name: string) => {
    const newLevels = [...levels]
    newLevels[index].name = name
    setLevels(newLevels)
    
    // Сокращаем текст асинхронно
    if (name.trim()) {
      debouncedShorten(`level-name-${index}`, name, (shortened) => {
        setShortenedTexts(prev => {
          const currentLevels = prev.levels || levels.map(l => ({ 
            name: { original: l.name, shortened: l.name.toUpperCase() }, 
            items: l.items.map(item => ({ original: item, shortened: item.toUpperCase() }))
          }))
          const newLevels = [...currentLevels]
          if (!newLevels[index]) {
            newLevels[index] = { name: { original: name, shortened: shortened || name.toUpperCase() }, items: [] }
          } else {
            newLevels[index] = { 
              ...newLevels[index], 
              name: { original: name, shortened: shortened || name.toUpperCase() }
            }
          }
          return { ...prev, levels: newLevels }
        })
      })
    }
  }

  const addLevelItem = (levelIndex: number) => {
    const newLevels = [...levels]
    newLevels[levelIndex].items.push('')
    setLevels(newLevels)
  }

  const removeLevelItem = (levelIndex: number, itemIndex: number) => {
    const newLevels = [...levels]
    if (newLevels[levelIndex].items.length > 1) {
      newLevels[levelIndex].items = newLevels[levelIndex].items.filter((_, i) => i !== itemIndex)
      setLevels(newLevels)
    }
  }

  const updateLevelItem = (levelIndex: number, itemIndex: number, value: string) => {
    const newLevels = [...levels]
    newLevels[levelIndex].items[itemIndex] = value
    setLevels(newLevels)
    
    // Сокращаем текст асинхронно
    if (value.trim()) {
      debouncedShorten(`level-${levelIndex}-item-${itemIndex}`, value, (shortened) => {
        setShortenedTexts(prev => {
          const currentLevels = prev.levels || levels.map(l => ({ 
            name: { original: l.name, shortened: l.name.toUpperCase() }, 
            items: l.items.map(item => ({ original: item, shortened: item.toUpperCase() }))
          }))
          const newLevels = [...currentLevels]
          if (!newLevels[levelIndex]) {
            newLevels[levelIndex] = { 
              name: { original: levels[levelIndex].name, shortened: levels[levelIndex].name.toUpperCase() }, 
              items: []
            }
          }
          if (!newLevels[levelIndex].items[itemIndex] || newLevels[levelIndex].items[itemIndex].original !== value) {
            newLevels[levelIndex].items[itemIndex] = { original: value, shortened: shortened || value.toUpperCase() }
          } else {
            newLevels[levelIndex].items[itemIndex] = { ...newLevels[levelIndex].items[itemIndex], shortened }
          }
          return { ...prev, levels: newLevels }
        })
      })
    } else {
      // Очищаем сокращенный текст при очистке поля
      setShortenedTexts(prev => {
        const currentLevels = prev.levels || []
        const newLevels = [...currentLevels]
        if (newLevels[levelIndex]?.items[itemIndex]) {
          newLevels[levelIndex].items[itemIndex] = { original: '', shortened: '' }
        }
        return { ...prev, levels: newLevels }
      })
    }
  }

  const handleSubmit = () => {
    if (!goal.trim()) {
      alert('Введите цель')
      return
    }

    if (isMultiLevel) {
      // Многоуровневая иерархия
      const validLevels = levels.map(level => ({
        name: level.name,
        items: level.items.filter(item => item.trim() !== '')
      }))

      // Проверка, что каждый уровень имеет минимум 2 элемента
      for (let i = 0; i < validLevels.length; i++) {
        if (validLevels[i].items.length < 2) {
          alert(`Уровень "${validLevels[i].name}" должен содержать минимум 2 элемента`)
          return
        }
      }

      // Преобразуем в старый формат для обратной совместимости
      const firstLevel = validLevels[0]
      const lastLevel = validLevels[validLevels.length - 1]
      
      // Собираем сокращенные тексты для многоуровневой иерархии
      const shortenedLevels = validLevels.map((level, idx) => {
        const shortenedLevel = shortenedTexts.levels?.[idx]
        return {
          name: {
            original: level.name,
            shortened: shortenedLevel?.name?.shortened || level.name.toUpperCase()
          },
          items: level.items.map((item, itemIdx) => ({
            original: item,
            shortened: shortenedLevel?.items[itemIdx]?.shortened || item.toUpperCase()
          }))
        }
      })
      
      onComplete({
        goal: goal.trim(),
        criteria: firstLevel.items,
        alternatives: lastLevel.items,
        levels: validLevels,
        isMultiLevel: true,
        shortenedTexts: {
          goal: shortenedTexts.goal || { original: goal.trim(), shortened: goal.trim().toUpperCase() },
          levels: shortenedLevels
        }
      })
    } else {
      // Классическая 3-уровневая иерархия
      const validCriteria = criteria.filter(c => c.trim() !== '')
      const validAlternatives = alternatives.filter(a => a.trim() !== '')

      if (validCriteria.length < 2) {
        alert('Добавьте минимум 2 критерия')
        return
      }

      if (validAlternatives.length < 2) {
        alert('Добавьте минимум 2 альтернативы')
        return
      }

      // Собираем сокращенные тексты для классической иерархии
      const shortenedCriteria = validCriteria.map((c, idx) => {
        const originalIdx = criteria.indexOf(c)
        return shortenedTexts.criteria?.[originalIdx] || { original: c, shortened: c.toUpperCase() }
      })
      
      const shortenedAlternatives = validAlternatives.map((a, idx) => {
        const originalIdx = alternatives.indexOf(a)
        return shortenedTexts.alternatives?.[originalIdx] || { original: a, shortened: a.toUpperCase() }
      })
      
      onComplete({
        goal: goal.trim(),
        criteria: validCriteria,
        alternatives: validAlternatives,
        isMultiLevel: false,
        shortenedTexts: {
          goal: shortenedTexts.goal || { original: goal.trim(), shortened: goal.trim().toUpperCase() },
          criteria: shortenedCriteria,
          alternatives: shortenedAlternatives
        }
      })
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Построение иерархии</h2>
          <HelpTooltip
            title="Как построить иерархию?"
            type="guide"
            content={
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-green-600" />
                    Что такое иерархия в МАИ?
                  </h4>
                  <p className="text-gray-700 mb-3">
                    Иерархия — это структурированное представление вашей задачи принятия решения. Она состоит из трех уровней:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li><strong>Цель</strong> — что вы хотите достичь (например, "Выбор ноутбука")</li>
                    <li><strong>Критерии</strong> — факторы, по которым вы оцениваете варианты (цена, производительность, дизайн)</li>
                    <li><strong>Альтернативы</strong> — варианты для выбора (конкретные модели ноутбуков)</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-green-600" />
                    Как правильно заполнить форму?
                  </h4>
                  <div className="space-y-3 text-gray-700">
                    <div>
                      <strong>1. Цель:</strong>
                      <p className="ml-4 mt-1">Сформулируйте четко и конкретно. Примеры хороших целей:</p>
                      <ul className="list-disc list-inside ml-8 mt-1 space-y-1">
                        <li>"Выбор ноутбука для работы"</li>
                        <li>"Выбор места для отпуска"</li>
                        <li>"Выбор поставщика услуг"</li>
                      </ul>
                    </div>
                    
                    <div>
                      <strong>2. Критерии (минимум 2):</strong>
                      <p className="ml-4 mt-1">Это факторы, которые важны для вашего решения. Критерии должны быть:</p>
                      <ul className="list-disc list-inside ml-8 mt-1 space-y-1">
                        <li>Независимыми друг от друга</li>
                        <li>Измеримыми или сравниваемыми</li>
                        <li>Релевантными для цели</li>
                      </ul>
                      <p className="ml-4 mt-2 text-sm text-gray-600">
                        Примеры: "Цена", "Качество", "Удобство использования", "Гарантия"
                      </p>
                    </div>
                    
                    <div>
                      <strong>3. Альтернативы (минимум 2):</strong>
                      <p className="ml-4 mt-1">Это конкретные варианты, которые вы сравниваете. Они должны:</p>
                      <ul className="list-disc list-inside ml-8 mt-1 space-y-1">
                        <li>Быть реальными и доступными вариантами</li>
                        <li>Соответствовать всем критериям</li>
                        <li>Быть сравнимыми между собой</li>
                      </ul>
                      <p className="ml-4 mt-2 text-sm text-gray-600">
                        Примеры: "Ноутбук A", "Ноутбук B", "Ноутбук C" или "Вариант 1", "Вариант 2"
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-blue-600" />
                    Совет
                  </h4>
                  <p className="text-blue-800 text-sm">
                    Начните с простой иерархии (2-3 критерия, 2-3 альтернативы), чтобы понять процесс. 
                    Позже вы сможете добавить больше элементов для более детального анализа.
                  </p>
                </div>
              </div>
            }
          />
        </div>
        <p className="text-gray-600 mb-6">
          Определите цель, критерии оценки и альтернативы для сравнения
        </p>
      </div>

      {/* Goal */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Цель <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={goal}
          onChange={(e) => {
            const value = e.target.value
            setGoal(value)
            // Сокращаем текст асинхронно
            if (value.trim()) {
              debouncedShorten('goal', value, (shortened) => {
                setShortenedTexts(prev => ({ 
                  ...prev, 
                  goal: { original: value, shortened: shortened || value.toUpperCase() } 
                }))
              })
            } else {
              // Очищаем сокращенный текст при очистке поля
              setShortenedTexts(prev => ({ ...prev, goal: undefined }))
            }
          }}
          placeholder="Например: Выбор ноутбука"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Criteria */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            Критерии оценки <span className="text-red-500">*</span> (минимум 2)
          </label>
          <button
            onClick={addCriterion}
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
          >
            <Plus size={16} />
            Добавить критерий
          </button>
        </div>
        <div className="space-y-2">
          {criteria.map((criterion, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={criterion}
                onChange={(e) => updateCriterion(index, e.target.value)}
                placeholder={`Критерий ${index + 1}`}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {criteria.length > 1 && (
                <button
                  onClick={() => removeCriterion(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Multi-level toggle */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isMultiLevel}
                onChange={(e) => setIsMultiLevel(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Использовать многоуровневую иерархию (4+ уровней)
              </span>
            </label>
            <p className="text-xs text-gray-600 mt-1 ml-6">
              Позволяет создавать иерархии с произвольным количеством уровней для сложных задач
            </p>
          </div>
        </div>
      </div>

      {isMultiLevel ? (
        /* Multi-level hierarchy builder */
        <div className="space-y-6">
          {levels.map((level, levelIndex) => (
            <div key={levelIndex} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={level.name}
                    onChange={(e) => updateLevelName(levelIndex, e.target.value)}
                    placeholder={`Название уровня ${levelIndex + 1}`}
                    className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-medium"
                  />
                  <span className="text-xs text-gray-500">Уровень {levelIndex + 1}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveLevelUp(levelIndex)}
                    disabled={levelIndex === 0}
                    className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Переместить вверх"
                  >
                    <ChevronUp size={18} />
                  </button>
                  <button
                    onClick={() => moveLevelDown(levelIndex)}
                    disabled={levelIndex === levels.length - 1}
                    className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Переместить вниз"
                  >
                    <ChevronDown size={18} />
                  </button>
                  {levels.length > 2 && (
                    <button
                      onClick={() => removeLevel(levelIndex)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Удалить уровень"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {level.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateLevelItem(levelIndex, itemIndex, e.target.value)}
                      placeholder={`Элемент ${itemIndex + 1}`}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {level.items.length > 1 && (
                      <button
                        onClick={() => removeLevelItem(levelIndex, itemIndex)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addLevelItem(levelIndex)}
                  className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                >
                  <Plus size={16} />
                  Добавить элемент
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={addLevel}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            <Plus size={18} />
            Добавить уровень
          </button>
        </div>
      ) : (
        /* Classic 3-level hierarchy */
        <>
          {/* Alternatives */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Альтернативы <span className="text-red-500">*</span> (минимум 2)
              </label>
              <button
                onClick={addAlternative}
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
              >
                <Plus size={16} />
                Добавить альтернативу
              </button>
            </div>
            <div className="space-y-2">
              {alternatives.map((alternative, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={alternative}
                    onChange={(e) => updateAlternative(index, e.target.value)}
                    placeholder={`Альтернатива ${index + 1}`}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  {alternatives.length > 2 && (
                    <button
                      onClick={() => removeAlternative(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Submit */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          Продолжить
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  )
}
