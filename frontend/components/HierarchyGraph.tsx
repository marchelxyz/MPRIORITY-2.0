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
function RectangleNode({ data }: { data: { label: string } }) {
  // Вычисляем размер узла в зависимости от длины текста
  const textLength = data.label.length
  const minWidth = 140
  const minHeight = 60
  const maxWidth = 300 // Максимальная ширина для длинного текста
  const maxHeight = 120 // Максимальная высота для длинного текста
  
  // Увеличиваем размер узла если текст длинный
  const width = textLength > 20 ? Math.min(maxWidth, minWidth + (textLength - 20) * 8) : minWidth
  const height = textLength > 30 ? Math.min(maxHeight, minHeight + Math.floor((textLength - 30) / 15) * 20) : minHeight
  
  return (
      <div
        style={{
          width: `${width}px`,
          minHeight: `${height}px`,
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
        }}
      >
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <div style={{ 
        overflow: 'visible', 
        maxWidth: '100%',
        wordBreak: 'break-word',
        whiteSpace: 'normal',
        lineHeight: '1.3',
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

    // Параметры для позиционирования
    const levelSpacing = 200 // Расстояние между уровнями по вертикали
    const nodeSpacing = 150 // Расстояние между узлами на одном уровне
    const nodeWidth = 140
    const nodeHeight = 60

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
          const x = itemsStartX + itemIndex * nodeSpacing - nodeWidth / 2
          const nodeId = `level-${levelIndex}-item-${itemIndex}`
          
          nodes.push({
            id: nodeId,
            type: 'rectangle',
            position: { x, y: levelY },
            data: { label: item },
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
        position: { x: goalX - nodeWidth / 2, y: goalY },
        data: { label: goal },
      })

      // Средний уровень - критерии
      const criteriaY = goalY + levelSpacing
      const criteriaStartX = (Math.max(criteria.length, alternatives.length) * nodeSpacing) / 2 - 
                            ((criteria.length - 1) * nodeSpacing) / 2

      criteria.forEach((criterion, index) => {
        const x = criteriaStartX + index * nodeSpacing - nodeWidth / 2
        nodes.push({
          id: `criteria-${index}`,
          type: 'rectangle',
          position: { x, y: criteriaY },
          data: { label: criterion },
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
        const x = alternativesStartX + index * nodeSpacing - nodeWidth / 2
        nodes.push({
          id: `alternative-${index}`,
          type: 'rectangle',
          position: { x, y: alternativesY },
          data: { label: alternative },
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
