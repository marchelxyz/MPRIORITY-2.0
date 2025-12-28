'use client'

import { useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Динамический импорт для избежания проблем с SSR
const Tree = dynamic(() => import('react-d3-tree').then(mod => mod.default), {
  ssr: false
})

interface HierarchyGraphProps {
  goal: string
  criteria: string[]
  alternatives: string[]
  criteriaPriorities?: number[]
}

interface TreeNode {
  name: string
  attributes?: {
    priority?: string
  }
  children?: TreeNode[]
}

export default function HierarchyGraph({ 
  goal, 
  criteria, 
  alternatives,
  criteriaPriorities 
}: HierarchyGraphProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const treeData: TreeNode = useMemo(() => {
    const root: TreeNode = {
      name: goal,
      attributes: {
        priority: 'Цель'
      },
      children: criteria.map((criterion, index) => ({
        name: criterion,
        attributes: {
          priority: criteriaPriorities 
            ? `${(criteriaPriorities[index] * 100).toFixed(1)}%`
            : undefined
        },
        children: alternatives.map(alt => ({
          name: alt,
          attributes: {}
        }))
      }))
    }
    return root
  }, [goal, criteria, alternatives, criteriaPriorities])

  const nodeSize = { x: 200, y: 150 }
  const separation = { siblings: 1.2, nonSiblings: 1.5 }

  if (!isClient) {
    return (
      <div className="w-full h-[600px] border border-gray-200 rounded-lg bg-white flex items-center justify-center">
        <div className="text-gray-500">Загрузка графа...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-[600px] border border-gray-200 rounded-lg bg-white overflow-hidden">
      <Tree
        data={treeData}
        orientation="vertical"
        translate={{ x: 400, y: 50 }}
        nodeSize={nodeSize}
        separation={separation}
        renderCustomNodeElement={(rd3tProps) => {
          const { nodeDatum, toggleNode, hierarchyPointNode } = rd3tProps
          const depth = hierarchyPointNode.depth
          const isRoot = depth === 0
          const isCriterion = depth === 1
          const isAlternative = depth === 2

          return (
            <g>
              {/* Узел */}
              <circle
                r={isRoot ? 50 : isCriterion ? 40 : 30}
                fill={
                  isRoot 
                    ? '#3b82f6' 
                    : isCriterion 
                    ? '#8b5cf6' 
                    : '#10b981'
                }
                stroke="#fff"
                strokeWidth="2"
                onClick={toggleNode}
                style={{ cursor: 'pointer' }}
              />
              
              {/* Текст названия */}
              <text
                x={0}
                y={isRoot ? -60 : isCriterion ? -55 : -40}
                textAnchor="middle"
                fill="#1f2937"
                fontSize={isRoot ? 14 : isCriterion ? 12 : 11}
                fontWeight={isRoot ? 'bold' : isCriterion ? '600' : 'normal'}
                style={{ pointerEvents: 'none' }}
              >
                {nodeDatum.name.length > 15 
                  ? nodeDatum.name.substring(0, 15) + '...' 
                  : nodeDatum.name}
              </text>

              {/* Приоритет для критериев */}
              {isCriterion && nodeDatum.attributes?.priority && (
                <text
                  x={0}
                  y={isCriterion ? -40 : -25}
                  textAnchor="middle"
                  fill="#6b7280"
                  fontSize={10}
                  style={{ pointerEvents: 'none' }}
                >
                  {nodeDatum.attributes.priority}
                </text>
              )}
            </g>
          )
        }}
        pathClassFunc={() => 'hierarchy-link'}
        styles={{
          links: {
            stroke: '#94a3b8',
            strokeWidth: 2,
            fill: 'none'
          }
        }}
      />
      <style>{`
        .hierarchy-link {
          stroke: #94a3b8;
          stroke-width: 2;
          fill: none;
        }
      `}</style>
    </div>
  )
}
