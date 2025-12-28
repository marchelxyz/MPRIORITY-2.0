'use client'

import { useState } from 'react'
import { Plus, X, ArrowRight } from 'lucide-react'
import HelpTooltip from './HelpTooltip'

interface HierarchyBuilderProps {
  onComplete: (data: { goal: string; criteria: string[]; alternatives: string[] }) => void
}

export default function HierarchyBuilder({ onComplete }: HierarchyBuilderProps) {
  const [goal, setGoal] = useState('')
  const [criteria, setCriteria] = useState<string[]>([''])
  const [alternatives, setAlternatives] = useState<string[]>(['', ''])

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
  }

  const handleSubmit = () => {
    const validCriteria = criteria.filter(c => c.trim() !== '')
    const validAlternatives = alternatives.filter(a => a.trim() !== '')

    if (!goal.trim()) {
      alert('Введите цель')
      return
    }

    if (validCriteria.length < 2) {
      alert('Добавьте минимум 2 критерия')
      return
    }

    if (validAlternatives.length < 2) {
      alert('Добавьте минимум 2 альтернативы')
      return
    }

    onComplete({
      goal: goal.trim(),
      criteria: validCriteria,
      alternatives: validAlternatives
    })
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
          onChange={(e) => setGoal(e.target.value)}
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
