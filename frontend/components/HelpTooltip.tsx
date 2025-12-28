'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { HelpCircle, X, BookOpen, Lightbulb, CheckCircle2 } from 'lucide-react'

interface HelpTooltipProps {
  title: string
  content: ReactNode
  type?: 'info' | 'guide' | 'tip'
}

export default function HelpTooltip({ title, content, type = 'info' }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)

  const iconMap = {
    info: HelpCircle,
    guide: BookOpen,
    tip: Lightbulb
  }

  const colorMap = {
    info: 'text-blue-600 bg-blue-50 border-blue-200',
    guide: 'text-purple-600 bg-purple-50 border-purple-200',
    tip: 'text-amber-600 bg-amber-50 border-amber-200'
  }

  const Icon = iconMap[type]

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:shadow-md ${colorMap[type]}`}
        aria-label="Показать подсказку"
      >
        <Icon size={18} />
        <span className="text-sm font-medium">Помощь</span>
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal */}
          <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[80vh] overflow-y-auto ${colorMap[type]} border-2 rounded-xl shadow-2xl`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Icon size={24} />
                  <h3 className="text-xl font-bold">{title}</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/50 rounded-lg transition-colors"
                  aria-label="Закрыть"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="prose prose-sm max-w-none text-gray-700">
                {content}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
