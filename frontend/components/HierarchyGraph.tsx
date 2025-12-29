'use client'

import { useMemo } from 'react'
import ReactFlow, { Node, Edge, Background, Controls, MiniMap, Handle, Position } from 'reactflow'
import 'reactflow/dist/style.css'

interface HierarchyGraphProps {
  goal: string
  criteria: string[]
  alternatives: string[]
  levels?: Array<{ name: string; items: string[] }>
  isMultiLevel?: boolean
  hideControls?: boolean // Для скрытия элементов управления при экспорте в PDF
}

// Кастомный компонент узла для прямоугольников
function RectangleNode({ data }: { data: { label: string; width?: number; height?: number } }) {
  // Используем единый размер из data, если он передан, иначе вычисляем по тексту
  const width = data.width || 140
  const height = data.height || 60
  
  return (
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: 'white',
          border: '1px solid #000',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: '500',
          textAlign: 'center',
          padding: '8px',
          wordWrap: 'break-word',
          overflow: 'visible',
          color: '#111827', // gray-900
          whiteSpace: 'normal', // Разрешаем перенос текста
          lineHeight: '1.3',
          boxSizing: 'border-box',
        }}
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
        lineHeight: '1.3',
        hyphens: 'auto',
        overflowWrap: 'break-word',
      }}>
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  )
}

const nodeTypes = {
  rectangle: RectangleNode,
}

export default function HierarchyGraph({ goal, criteria, alternatives, levels, isMultiLevel, hideControls = false }: HierarchyGraphProps) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []

    // Собираем все тексты для вычисления оптимального размера
    const allTexts: string[] = []
    if (isMultiLevel && levels && levels.length > 0) {
      allTexts.push(goal)
      levels.forEach(level => {
        level.items.forEach(item => allTexts.push(item))
      })
    } else {
      allTexts.push(goal)
      criteria.forEach(c => allTexts.push(c))
      alternatives.forEach(a => allTexts.push(a))
    }

    // Вычисляем оптимальную ширину с учетом переноса текста
    // Базовые параметры
    const minWidth = 120
    const maxWidth = 200
    const fontSize = 12
    const padding = 16 // 8px с каждой стороны
    const charWidth = fontSize * 0.6 // Примерная ширина одного символа
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
    const lineHeight = fontSize * 1.3
    const verticalPadding = 16 // 8px сверху и снизу
    const textAreaWidth = unifiedWidth - padding
    
    const calculateHeight = (text: string): number => {
      // Вычисляем количество символов, которые помещаются в одну строку
      const charsPerLine = Math.floor(textAreaWidth / charWidth)
      // Вычисляем количество строк
      const lines = Math.max(1, Math.ceil(text.length / charsPerLine))
      // Вычисляем высоту с учетом количества строк
      const height = lines * lineHeight + verticalPadding
      return Math.max(60, Math.min(150, height)) // Минимум 60px, максимум 150px
    }
    
    const maxHeight = Math.max(...allTexts.map(calculateHeight))
    const unifiedHeight = maxHeight

    // Фиксированное расстояние между узлами по горизонтали
    const nodeSpacing = 180
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
          
          nodes.push({
            id: nodeId,
            type: 'rectangle',
            position: { x, y: levelY },
            data: { label: item, ...nodeSize },
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
      nodes.push({
        id: 'goal',
        type: 'rectangle',
        position: { x: goalX - unifiedWidth / 2, y: goalY },
        data: { label: goal, ...nodeSize },
      })

      // Средний уровень - критерии
      const criteriaY = goalY + levelSpacing
      const criteriaStartX = (Math.max(criteria.length, alternatives.length) * nodeSpacing) / 2 - 
                            ((criteria.length - 1) * nodeSpacing) / 2

      criteria.forEach((criterion, index) => {
        const x = criteriaStartX + index * nodeSpacing - unifiedWidth / 2
        nodes.push({
          id: `criteria-${index}`,
          type: 'rectangle',
          position: { x, y: criteriaY },
          data: { label: criterion, ...nodeSize },
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
        nodes.push({
          id: `alternative-${index}`,
          type: 'rectangle',
          position: { x, y: alternativesY },
          data: { label: alternative, ...nodeSize },
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
  }, [goal, criteria, alternatives, levels, isMultiLevel])

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
