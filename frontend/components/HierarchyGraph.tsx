'use client'

import { useMemo, useState } from 'react'
import ReactFlow, { Node, Edge, Background, Controls, MiniMap, Handle, Position } from 'reactflow'
import 'reactflow/dist/style.css'

interface ShortenedTexts {
  goal?: { original: string; shortened: string }
  criteria?: { original: string; shortened: string }[]
  alternatives?: { original: string; shortened: string }[]
  levels?: Array<{
    name: { original: string; shortened: string }
    items: { original: string; shortened: string }[]
  }>
}

interface HierarchyGraphProps {
  goal: string
  criteria: string[]
  alternatives: string[]
  levels?: Array<{ name: string; items: string[] }>
  isMultiLevel?: boolean
  hideControls?: boolean // Для скрытия элементов управления при экспорте в PDF
  shortenedTexts?: ShortenedTexts
}

// Кастомный компонент узла для прямоугольников
function RectangleNode({ data }: { data: { 
  label: string
  fullText?: string
  width?: number
  height?: number 
} }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipRef, setTooltipRef] = useState<HTMLDivElement | null>(null)
  
  // Используем единый размер из data, если он передан, иначе вычисляем по тексту
  const width = data.width || 140
  const height = data.height || 60
  
  const displayText = data.label
  const hasFullText = data.fullText && data.fullText !== displayText
  
  const handleMouseEnter = () => {
    if (hasFullText) {
      setShowTooltip(true)
    }
  }
  
  const handleMouseLeave = () => {
    setShowTooltip(false)
  }
  
  return (
    <>
      <div
        ref={setTooltipRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: 'white',
          border: '1px solid #000',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: '500',
          textAlign: 'center',
          padding: '6px',
          wordWrap: 'break-word',
          overflow: 'visible',
          color: '#111827', // gray-900
          whiteSpace: 'normal', // Разрешаем перенос текста
          lineHeight: '1.2',
          boxSizing: 'border-box',
          cursor: hasFullText ? 'help' : 'default',
          position: 'relative',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
        <div style={{ 
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          wordBreak: 'break-word',
          whiteSpace: 'normal',
          lineHeight: '1.2',
          hyphens: 'auto',
          overflowWrap: 'break-word',
        }}>
          {displayText}
        </div>
        <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
        {showTooltip && hasFullText && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              color: 'white',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              maxWidth: '350px',
              minWidth: '200px',
              zIndex: 1000,
              pointerEvents: 'none',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
              lineHeight: '1.4',
            }}
          >
            {data.fullText}
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '8px solid rgba(0, 0, 0, 0.95)',
              }}
            />
          </div>
        )}
      </div>
    </>
  )
}

const nodeTypes = {
  rectangle: RectangleNode,
}

export default function HierarchyGraph({ goal, criteria, alternatives, levels, isMultiLevel, hideControls = false, shortenedTexts }: HierarchyGraphProps) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []

    // Вспомогательная функция для получения сокращенного текста
    const getShortenedText = (original: string, type: 'goal' | 'criterion' | 'alternative' | 'level-name' | 'level-item', levelIndex?: number, itemIndex?: number): string => {
      if (!shortenedTexts) return original.toUpperCase()
      
      switch (type) {
        case 'goal':
          return shortenedTexts.goal?.shortened || original.toUpperCase()
        case 'criterion':
          const critIdx = criteria.indexOf(original)
          return shortenedTexts.criteria?.[critIdx]?.shortened || original.toUpperCase()
        case 'alternative':
          const altIdx = alternatives.indexOf(original)
          return shortenedTexts.alternatives?.[altIdx]?.shortened || original.toUpperCase()
        case 'level-name':
          if (levelIndex !== undefined && shortenedTexts.levels?.[levelIndex]) {
            return shortenedTexts.levels[levelIndex].name.shortened || original.toUpperCase()
          }
          return original.toUpperCase()
        case 'level-item':
          if (levelIndex !== undefined && itemIndex !== undefined && shortenedTexts.levels?.[levelIndex]) {
            return shortenedTexts.levels[levelIndex].items[itemIndex]?.shortened || original.toUpperCase()
          }
          return original.toUpperCase()
        default:
          return original.toUpperCase()
      }
    }
    
    // Вспомогательная функция для получения полного текста
    const getFullText = (original: string, type: 'goal' | 'criterion' | 'alternative' | 'level-name' | 'level-item', levelIndex?: number, itemIndex?: number): string => {
      if (!shortenedTexts) return original
      
      switch (type) {
        case 'goal':
          return shortenedTexts.goal?.original || original
        case 'criterion':
          const critIdx = criteria.indexOf(original)
          return shortenedTexts.criteria?.[critIdx]?.original || original
        case 'alternative':
          const altIdx = alternatives.indexOf(original)
          return shortenedTexts.alternatives?.[altIdx]?.original || original
        case 'level-name':
          if (levelIndex !== undefined && shortenedTexts.levels?.[levelIndex]) {
            return shortenedTexts.levels[levelIndex].name.original || original
          }
          return original
        case 'level-item':
          if (levelIndex !== undefined && itemIndex !== undefined && shortenedTexts.levels?.[levelIndex]) {
            return shortenedTexts.levels[levelIndex].items[itemIndex]?.original || original
          }
          return original
        default:
          return original
      }
    }
    
    // Собираем все сокращенные тексты для вычисления оптимального размера
    const allTexts: string[] = []
    if (isMultiLevel && levels && levels.length > 0) {
      allTexts.push(getShortenedText(goal, 'goal'))
      levels.forEach((level, levelIdx) => {
        level.items.forEach((item, itemIdx) => {
          allTexts.push(getShortenedText(item, 'level-item', levelIdx, itemIdx))
        })
      })
    } else {
      allTexts.push(getShortenedText(goal, 'goal'))
      criteria.forEach(c => allTexts.push(getShortenedText(c, 'criterion')))
      alternatives.forEach(a => allTexts.push(getShortenedText(a, 'alternative')))
    }

    // Вычисляем оптимальную ширину с учетом переноса текста
    // Базовые параметры - более строгие ограничения для компактности
    const minWidth = 120
    const maxWidth = 180 // Уменьшено с 200 для более компактного вида
    const fontSize = 11 // Немного уменьшен размер шрифта
    const padding = 12 // 6px с каждой стороны
    const charWidth = fontSize * 0.55 // Примерная ширина одного символа
    const availableTextWidth = maxWidth - padding
    
    // Вычисляем ширину для каждого текста с учетом переноса
    const calculateOptimalWidth = (text: string): number => {
      const textWidth = text.length * charWidth
      if (textWidth <= availableTextWidth) {
        // Текст помещается в одну строку - используем минимальную ширину или ширину текста
        const optimalWidth = text.length * charWidth + padding
        return Math.max(minWidth, Math.min(maxWidth, optimalWidth))
      } else {
        // Текст нужно переносить - используем максимальную ширину
        return maxWidth
      }
    }
    
    // Находим максимальную ширину среди всех текстов
    const maxOptimalWidth = Math.max(...allTexts.map(calculateOptimalWidth))
    const unifiedWidth = Math.max(minWidth, Math.min(maxWidth, maxOptimalWidth))
    
    // Вычисляем высоту на основе количества строк текста с учетом единой ширины
    const lineHeight = fontSize * 1.2
    const verticalPadding = 12 // 6px сверху и снизу
    const textAreaWidth = unifiedWidth - padding
    
    const calculateHeight = (text: string): number => {
      // Вычисляем количество символов, которые помещаются в одну строку
      const charsPerLine = Math.floor(textAreaWidth / charWidth)
      // Вычисляем количество строк
      const lines = Math.max(1, Math.ceil(text.length / charsPerLine))
      // Вычисляем высоту с учетом количества строк
      const height = lines * lineHeight + verticalPadding
      return Math.max(50, Math.min(120, height)) // Минимум 50px, максимум 120px (уменьшено)
    }
    
    const maxHeight = Math.max(...allTexts.map(calculateHeight))
    const unifiedHeight = maxHeight

    // Увеличенное расстояние между узлами по горизонтали для лучшей читаемости
    // Расстояние между центрами узлов = ширина узла + промежуток между узлами
    const horizontalGap = 40 // Минимальный промежуток между узлами в пикселях
    const nodeSpacing = unifiedWidth + horizontalGap
    const baseLevelSpacing = 200
    const levelSpacing = unifiedHeight > 80 ? baseLevelSpacing + (unifiedHeight - 80) * 1.5 : baseLevelSpacing

    // Сохраняем единый размер в data для использования в компоненте узла
    const nodeSize = { width: unifiedWidth, height: unifiedHeight }

    if (isMultiLevel && levels && levels.length > 0) {
      // Многоуровневая иерархия
      const allLevels = [
        { name: 'Цель', items: [goal] },
        ...levels
      ]

      // Находим максимальное количество элементов на любом уровне для центрирования
      const maxItems = Math.max(...allLevels.map(level => level.items.length))

      allLevels.forEach((level, levelIndex) => {
        const levelY = 50 + levelIndex * levelSpacing
        const items = level.items
        const itemsStartX = (maxItems * nodeSpacing) / 2 - ((items.length - 1) * nodeSpacing) / 2

        items.forEach((item, itemIndex) => {
          const x = itemsStartX + itemIndex * nodeSpacing - unifiedWidth / 2
          const nodeId = `level-${levelIndex}-item-${itemIndex}`
          const shortenedLabel = getShortenedText(item, 'level-item', levelIndex, itemIndex)
          const fullText = getFullText(item, 'level-item', levelIndex, itemIndex)
          
          nodes.push({
            id: nodeId,
            type: 'rectangle',
            position: { x, y: levelY },
            data: { 
              label: shortenedLabel,
              fullText: fullText !== shortenedLabel ? fullText : undefined,
              ...nodeSize 
            },
          })

          // Связи с предыдущим уровнем
          if (levelIndex > 0) {
            const prevLevel = allLevels[levelIndex - 1]
            prevLevel.items.forEach((_, prevItemIndex) => {
              const prevNodeId = `level-${levelIndex - 1}-item-${prevItemIndex}`
              edges.push({
                id: `${prevNodeId}-${nodeId}`,
                source: prevNodeId,
                target: nodeId,
                type: 'straight',
                style: { stroke: '#000', strokeWidth: 1 },
                markerEnd: undefined,
                animated: false,
              })
            })
          }
        })
      })
    } else {
      // Классическая 3-уровневая иерархия
      // Верхний уровень - цель
      const goalY = 50
      const goalX = (Math.max(criteria.length, alternatives.length) * nodeSpacing) / 2
      const shortenedGoal = getShortenedText(goal, 'goal')
      const fullGoalText = getFullText(goal, 'goal')
      nodes.push({
        id: 'goal',
        type: 'rectangle',
        position: { x: goalX - unifiedWidth / 2, y: goalY },
        data: { 
          label: shortenedGoal,
          fullText: fullGoalText !== shortenedGoal ? fullGoalText : undefined,
          ...nodeSize 
        },
      })

      // Средний уровень - критерии
      const criteriaY = goalY + levelSpacing
      const criteriaStartX = (Math.max(criteria.length, alternatives.length) * nodeSpacing) / 2 - 
                            ((criteria.length - 1) * nodeSpacing) / 2

      criteria.forEach((criterion, index) => {
        const x = criteriaStartX + index * nodeSpacing - unifiedWidth / 2
        const shortenedCriterion = getShortenedText(criterion, 'criterion')
        const fullCriterionText = getFullText(criterion, 'criterion')
        nodes.push({
          id: `criteria-${index}`,
          type: 'rectangle',
          position: { x, y: criteriaY },
          data: { 
            label: shortenedCriterion,
            fullText: fullCriterionText !== shortenedCriterion ? fullCriterionText : undefined,
            ...nodeSize 
          },
        })

        // Связь от цели к критерию
        edges.push({
          id: `goal-criteria-${index}`,
          source: 'goal',
          target: `criteria-${index}`,
          type: 'straight',
          style: { stroke: '#000', strokeWidth: 1 },
          markerEnd: undefined,
          animated: false,
        })
      })

      // Нижний уровень - альтернативы
      const alternativesY = criteriaY + levelSpacing
      const alternativesStartX = (Math.max(criteria.length, alternatives.length) * nodeSpacing) / 2 - 
                               ((alternatives.length - 1) * nodeSpacing) / 2

      alternatives.forEach((alternative, index) => {
        const x = alternativesStartX + index * nodeSpacing - unifiedWidth / 2
        const shortenedAlternative = getShortenedText(alternative, 'alternative')
        const fullAlternativeText = getFullText(alternative, 'alternative')
        nodes.push({
          id: `alternative-${index}`,
          type: 'rectangle',
          position: { x, y: alternativesY },
          data: { 
            label: shortenedAlternative,
            fullText: fullAlternativeText !== shortenedAlternative ? fullAlternativeText : undefined,
            ...nodeSize 
          },
        })

        // Связи от каждого критерия к каждой альтернативе
        criteria.forEach((_, critIndex) => {
          edges.push({
            id: `criteria-${critIndex}-alternative-${index}`,
            source: `criteria-${critIndex}`,
            target: `alternative-${index}`,
            type: 'straight',
            style: { stroke: '#000', strokeWidth: 1 },
            markerEnd: undefined,
            animated: false,
          })
        })
      })
    }

    return { nodes, edges }
  }, [goal, criteria, alternatives, levels, isMultiLevel, shortenedTexts])

  return (
    <div className="w-full h-[600px] border border-gray-200 rounded-lg bg-white text-gray-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
      >
        <Background color="#ffffff" gap={16} />
        {!hideControls && <Controls />}
        {!hideControls && (
          <MiniMap 
            nodeColor="#e0e0e0"
            maskColor="rgba(0, 0, 0, 0.1)"
            style={{ backgroundColor: '#f9f9f9' }}
          />
        )}
      </ReactFlow>
    </div>
  )
}
