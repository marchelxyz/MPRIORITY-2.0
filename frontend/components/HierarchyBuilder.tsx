'use client'

import { useState } from 'react'
import { Plus, X, ArrowRight } from 'lucide-react'

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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Построение иерархии</h2>
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
