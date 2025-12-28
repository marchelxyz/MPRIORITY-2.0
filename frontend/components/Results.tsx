'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { RotateCcw, Download, CheckCircle2, AlertCircle } from 'lucide-react'

interface ResultsProps {
  hierarchy: {
    goal: string
    criteria: string[]
    alternatives: string[]
  }
  results: {
    criteriaConsistency: any
    alternativeConsistencies: any[]
    globalPriorities: Array<{
      name: string
      priority: number
      rank: number
    }>
    alternativePrioritiesByCriteria: number[][]
    criteriaPriorities: number[]
  }
  onReset: () => void
}

const COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef']

export default function Results({ hierarchy, results, onReset }: ResultsProps) {
  const chartData = results.globalPriorities.map((alt, index) => ({
    name: alt.name,
    priority: (alt.priority * 100).toFixed(2),
    value: alt.priority
  }))

  const criteriaChartData = hierarchy.criteria.map((crit, index) => ({
    name: crit,
    priority: (results.criteriaPriorities[index] * 100).toFixed(2),
    value: results.criteriaPriorities[index]
  }))

  const downloadResults = () => {
    const data = {
      goal: hierarchy.goal,
      criteria: hierarchy.criteria,
      alternatives: hierarchy.alternatives,
      results: results.globalPriorities,
      criteriaPriorities: results.criteriaPriorities,
      alternativePrioritiesByCriteria: results.alternativePrioritiesByCriteria,
      consistency: {
        criteria: {
          cr: results.criteriaConsistency.cr,
          ci: results.criteriaConsistency.ci,
          lambdaMax: results.criteriaConsistency.lambdaMax,
          isConsistent: results.criteriaConsistency.isConsistent
        },
        alternatives: results.alternativeConsistencies.map((c, i) => ({
          criterion: hierarchy.criteria[i],
          cr: c.cr,
          ci: c.ci,
          lambdaMax: c.lambdaMax,
          isConsistent: c.isConsistent
        }))
      },
      timestamp: new Date().toISOString(),
      version: '2.0'
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mpriority-results-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Результаты анализа</h2>
          <p className="text-gray-600">Цель: <span className="font-semibold">{hierarchy.goal}</span></p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadResults}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download size={18} />
            Скачать
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <RotateCcw size={18} />
            Новый анализ
          </button>
        </div>
      </div>

      {/* Consistency Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Согласованность критериев</h3>
          <div className={`flex items-center gap-2 ${results.criteriaConsistency.isConsistent ? 'text-green-600' : 'text-orange-600'}`}>
            {results.criteriaConsistency.isConsistent ? (
              <>
                <CheckCircle2 size={20} />
                <span>CR = {(results.criteriaConsistency.cr * 100).toFixed(2)}% (приемлемо)</span>
              </>
            ) : (
              <>
                <AlertCircle size={20} />
                <span>CR = {(results.criteriaConsistency.cr * 100).toFixed(2)}% (низкая согласованность)</span>
              </>
            )}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Согласованность альтернатив</h3>
          <div className="space-y-1">
            {results.alternativeConsistencies.map((consistency, index) => (
              <div key={index} className="text-sm">
                <span className="font-medium">{hierarchy.criteria[index]}:</span>{' '}
                <span className={consistency.isConsistent ? 'text-green-600' : 'text-orange-600'}>
                  CR = {(consistency.cr * 100).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ranking */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Ранжирование альтернатив</h3>
        <div className="space-y-3">
          {results.globalPriorities.map((alt, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                index === 0 ? 'bg-green-500' : index === 1 ? 'bg-blue-500' : 'bg-gray-400'
              }`}>
                {alt.rank}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{alt.name}</div>
                <div className="text-sm text-gray-500">
                  Приоритет: {(alt.priority * 100).toFixed(2)}%
                </div>
              </div>
              <div className="w-64">
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      index === 0 ? 'bg-green-500' : index === 1 ? 'bg-blue-500' : 'bg-gray-400'
                    }`}
                    style={{ width: `${alt.priority * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Глобальные приоритеты альтернатив</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: any) => `${value}%`} />
              <Legend />
              <Bar dataKey="priority" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Приоритеты критериев</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={criteriaChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, priority }) => `${name}: ${priority}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {criteriaChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `${(value * 100).toFixed(2)}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Детальная таблица приоритетов</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-2 text-left">Альтернатива</th>
                {hierarchy.criteria.map((crit, index) => (
                  <th key={index} className="border border-gray-300 p-2 text-center">
                    {crit}
                  </th>
                ))}
                <th className="border border-gray-300 p-2 text-center font-semibold">Глобальный приоритет</th>
              </tr>
            </thead>
            <tbody>
              {hierarchy.alternatives.map((alt, altIndex) => (
                <tr key={altIndex}>
                  <td className="border border-gray-300 p-2 font-medium">{alt}</td>
                  {hierarchy.criteria.map((crit, critIndex) => (
                    <td key={critIndex} className="border border-gray-300 p-2 text-center">
                      {(results.alternativePrioritiesByCriteria[critIndex][altIndex] * 100).toFixed(2)}%
                    </td>
                  ))}
                  <td className="border border-gray-300 p-2 text-center font-semibold bg-blue-50">
                    {(results.globalPriorities.find(a => a.name === alt)?.priority! * 100).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
