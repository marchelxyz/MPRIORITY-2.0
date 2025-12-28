'use client'

import { useMemo } from 'react'
import ReactFlow, { Node, Edge, Background, Controls, MiniMap, Handle, Position } from 'reactflow'
import 'reactflow/dist/style.css'

interface HierarchyGraphProps {
  goal: string
  criteria: string[]
  alternatives: string[]
}

// Кастомный компонент узла для прямоугольников
function RectangleNode({ data }: { data: { label: string } }) {
  return (
    <div
      style={{
        width: '140px',
        height: '60px',
        backgroundColor: 'white',
        border: '1px solid #000',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: '500',
        textAlign: 'center',
        padding: '4px',
        wordWrap: 'break-word',
        overflow: 'hidden',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  )
}

const nodeTypes = {
  rectangle: RectangleNode,
}

export default function HierarchyGraph({ goal, criteria, alternatives }: HierarchyGraphProps) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []

    // Параметры для позиционирования
    const levelSpacing = 200 // Расстояние между уровнями по вертикали
    const nodeSpacing = 150 // Расстояние между узлами на одном уровне
    const nodeWidth = 140
    const nodeHeight = 60

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

    return { nodes, edges }
  }, [goal, criteria, alternatives])

  return (
    <div className="w-full h-[600px] border border-gray-200 rounded-lg bg-white">
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
        <Controls />
        <MiniMap 
          nodeColor="#e0e0e0"
          maskColor="rgba(0, 0, 0, 0.1)"
          style={{ backgroundColor: '#f9f9f9' }}
        />
      </ReactFlow>
    </div>
  )
}
