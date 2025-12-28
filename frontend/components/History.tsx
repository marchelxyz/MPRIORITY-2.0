'use client'

import { useState, useEffect } from 'react'
import { Clock, Trash2, Download, FileText, AlertCircle, X } from 'lucide-react'
import { getSavedAnalyses, deleteAnalysis, SavedAnalysis, clearAllAnalyses } from '@/lib/storage'

interface HistoryProps {
  onLoadAnalysis: (analysis: SavedAnalysis) => void
  onClose: () => void
}

export default function History({ onLoadAnalysis, onClose }: HistoryProps) {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAnalyses()
  }, [])

  const loadAnalyses = async () => {
    setIsLoading(true)
    try {
      const saved = await getSavedAnalyses()
      setAnalyses(saved)
    } catch (error) {
      console.error('Ошибка при загрузке анализов:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот анализ?')) {
      return
    }
    
    setIsDeleting(id)
    try {
      const success = await deleteAnalysis(id)
      if (success) {
        await loadAnalyses()
      }
    } catch (error) {
      console.error('Ошибка при удалении:', error)
      alert('Ошибка при удалении анализа')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Вы уверены, что хотите удалить всю историю анализов? Это действие нельзя отменить.')) {
      return
    }
    
    const success = clearAllAnalyses()
    if (success) {
      await loadAnalyses()
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'только что'
    if (minutes < 60) return `${minutes} ${minutes === 1 ? 'минуту' : minutes < 5 ? 'минуты' : 'минут'} назад`
    if (hours < 24) return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'} назад`
    if (days < 7) return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} назад`
    return formatDate(timestamp)
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">История анализов</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка анализов...</p>
          </div>
        </div>
      </div>
    )
  }

  if (analyses.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">История анализов</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>
          <div className="text-center py-8">
            <FileText size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 mb-2">История пуста</p>
            <p className="text-sm text-gray-500">
              Сохраненные анализы будут отображаться здесь
            </p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">История анализов</h2>
          <div className="flex gap-2">
            {analyses.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Очистить всё
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {analyses.map((analysis) => (
            <div
              key={analysis.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{analysis.goal}</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {analysis.alternatives.length} альтернатив{analysis.alternatives.length === 1 ? 'а' : analysis.alternatives.length < 5 ? 'ы' : ''}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {analysis.criteria.length} критери{analysis.criteria.length === 1 ? 'й' : analysis.criteria.length < 5 ? 'ев' : 'ев'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Clock size={14} />
                      <span>{formatTimeAgo(analysis.timestamp)}</span>
                      <span className="text-gray-400">•</span>
                      <span>{formatDate(analysis.timestamp)}</span>
                    </div>
                    <div className="mt-2">
                      <span className="font-medium text-gray-700">Лучшая альтернатива: </span>
                      <span className="text-gray-900">
                        {analysis.results.globalPriorities[0]?.name} 
                        {' '}
                        <span className="text-primary-600">
                          ({(analysis.results.globalPriorities[0]?.priority * 100).toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => {
                      onLoadAnalysis(analysis)
                      onClose()
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                  >
                    <Download size={18} />
                    Загрузить
                  </button>
                  <button
                    onClick={() => handleDelete(analysis.id)}
                    disabled={isDeleting === analysis.id}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Удалить"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Всего сохранено: <span className="font-semibold">{analyses.length}</span> анализов
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
