'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { RotateCcw, Download, CheckCircle2, AlertCircle, Brain, FileText, Loader2 } from 'lucide-react'
import HierarchyGraph from './HierarchyGraph'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [analysisModel, setAnalysisModel] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [analysisRequested, setAnalysisRequested] = useState(false)

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

  // Автоматически запрашиваем анализ при монтировании компонента
  useEffect(() => {
    if (!analysisRequested && !analysis && !isAnalyzing) {
      setAnalysisRequested(true)
      analyzeResults()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const analyzeResults = async (showErrorAlert = false) => {
    setIsAnalyzing(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/analyze-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hierarchy,
          results,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Ошибка при запросе анализа')
      }

      const data = await response.json()
      setAnalysis(data.analysis)
      setAnalysisModel(data.model || null)
    } catch (error) {
      console.error('Ошибка при получении анализа:', error)
      // Показываем alert только если пользователь явно запросил анализ
      if (showErrorAlert) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
        alert(`Ошибка при получении анализа: ${errorMessage}\n\nПроверьте подключение к серверу и настройку GEMINI_API_KEY.`)
      }
      // При автоматическом запросе просто не показываем анализ
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generatePDF = async () => {
    setIsGeneratingPDF(true)
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 15
      let yPos = margin

      // Заголовок
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('MPRIORITY 2.0 - Результаты анализа', pageWidth / 2, yPos, { align: 'center' })
      yPos += 10

      // Цель
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Цель анализа:', margin, yPos)
      yPos += 7
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(12)
      const goalLines = doc.splitTextToSize(hierarchy.goal, pageWidth - 2 * margin)
      doc.text(goalLines, margin, yPos)
      yPos += goalLines.length * 7 + 5

      // Критерии и альтернативы
      doc.setFont('helvetica', 'bold')
      doc.text('Критерии:', margin, yPos)
      yPos += 7
      doc.setFont('helvetica', 'normal')
      doc.text(hierarchy.criteria.join(', '), margin, yPos)
      yPos += 10

      doc.setFont('helvetica', 'bold')
      doc.text('Альтернативы:', margin, yPos)
      yPos += 7
      doc.setFont('helvetica', 'normal')
      doc.text(hierarchy.alternatives.join(', '), margin, yPos)
      yPos += 15

      // Ранжирование альтернатив
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('Ранжирование альтернатив:', margin, yPos)
      yPos += 10

      const rankingData = results.globalPriorities.map((alt, idx) => [
        alt.rank.toString(),
        alt.name,
        `${(alt.priority * 100).toFixed(2)}%`
      ])

      autoTable(doc, {
        head: [['Ранг', 'Альтернатива', 'Глобальный приоритет']],
        body: rankingData,
        startY: yPos,
        margin: { left: margin, right: margin },
        styles: { fontSize: 10 },
        headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold' }
      })

      yPos = (doc as any).lastAutoTable.finalY + 15

      // Приоритеты критериев
      if (yPos > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage()
        yPos = margin
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('Приоритеты критериев:', margin, yPos)
      yPos += 10

      const criteriaData = hierarchy.criteria.map((crit, idx) => [
        crit,
        `${(results.criteriaPriorities[idx] * 100).toFixed(2)}%`
      ])

      autoTable(doc, {
        head: [['Критерий', 'Приоритет']],
        body: criteriaData,
        startY: yPos,
        margin: { left: margin, right: margin },
        styles: { fontSize: 10 },
        headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' }
      })

      yPos = (doc as any).lastAutoTable.finalY + 15

      // Детальная таблица приоритетов
      if (yPos > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage()
        yPos = margin
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('Детальная таблица приоритетов:', margin, yPos)
      yPos += 10

      const detailTableData = hierarchy.alternatives.map((alt, altIndex) => {
        const row: any[] = [alt]
        hierarchy.criteria.forEach((crit, critIndex) => {
          row.push(`${(results.alternativePrioritiesByCriteria[critIndex][altIndex] * 100).toFixed(2)}%`)
        })
        const globalPriority = results.globalPriorities.find(a => a.name === alt)?.priority || 0
        row.push(`${(globalPriority * 100).toFixed(2)}%`)
        return row
      })

      const detailTableHeaders = ['Альтернатива', ...hierarchy.criteria, 'Глобальный приоритет']

      autoTable(doc, {
        head: [detailTableHeaders],
        body: detailTableData,
        startY: yPos,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 50 },
          [detailTableHeaders.length - 1]: { fontStyle: 'bold', fillColor: [219, 234, 254] }
        }
      })

      yPos = (doc as any).lastAutoTable.finalY + 15

      // Согласованность
      if (yPos > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage()
        yPos = margin
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('Согласованность суждений:', margin, yPos)
      yPos += 10

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      const criteriaConsistencyText = `Критерии: CR = ${(results.criteriaConsistency.cr * 100).toFixed(2)}% ${results.criteriaConsistency.isConsistent ? '(приемлемо)' : '(низкая согласованность)'}`
      doc.text(criteriaConsistencyText, margin, yPos)
      yPos += 7

      results.alternativeConsistencies.forEach((cons, idx) => {
        if (yPos > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage()
          yPos = margin
        }
        const altConsistencyText = `${hierarchy.criteria[idx]}: CR = ${(cons.cr * 100).toFixed(2)}% ${cons.isConsistent ? '(приемлемо)' : '(низкая согласованность)'}`
        doc.text(altConsistencyText, margin, yPos)
        yPos += 7
      })

      // Детальный анализ от Gemini (если есть)
      if (analysis) {
        if (yPos > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage()
          yPos = margin
        }

        yPos += 10
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.text('Детальный анализ результатов:', margin, yPos)
        yPos += 10

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        const analysisLines = doc.splitTextToSize(analysis, pageWidth - 2 * margin)
        analysisLines.forEach((line: string) => {
          if (yPos > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage()
            yPos = margin
          }
          doc.text(line, margin, yPos)
          yPos += 6
        })
      }

      // Футер
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.text(
          `Сгенерировано MPRIORITY 2.0 - ${new Date().toLocaleString('ru-RU')} | Страница ${i} из ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        )
      }

      doc.save(`mpriority-results-${Date.now()}.pdf`)
    } catch (error) {
      console.error('Ошибка при генерации PDF:', error)
      alert('Ошибка при генерации PDF')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Результаты анализа</h2>
          <p className="text-gray-600">Цель: <span className="font-semibold">{hierarchy.goal}</span></p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={downloadResults}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download size={18} />
            JSON
          </button>
          <button
            onClick={() => analyzeResults(true)}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Анализ...
              </>
            ) : (
              <>
                <Brain size={18} />
                {analysis ? 'Обновить анализ' : 'Детальный разбор'}
              </>
            )}
          </button>
          <button
            onClick={generatePDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                <FileText size={18} />
                Сохранить PDF
              </>
            )}
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

      {/* Hierarchy Graph */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-900">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Иерархический граф</h3>
        <HierarchyGraph
          goal={hierarchy.goal}
          criteria={hierarchy.criteria}
          alternatives={hierarchy.alternatives}
        />
      </div>

      {/* Consistency Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-gray-900">
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
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-gray-900">
          <h3 className="font-semibold text-gray-900 mb-2">Согласованность альтернатив</h3>
          <div className="space-y-1">
            {results.alternativeConsistencies.map((consistency, index) => (
              <div key={index} className="text-sm text-gray-900">
                <span className="font-medium text-gray-900">{hierarchy.criteria[index]}:</span>{' '}
                <span className={consistency.isConsistent ? 'text-green-600' : 'text-orange-600'}>
                  CR = {(consistency.cr * 100).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ranking */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-900">
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
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-900">
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

        <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-900">
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

      {/* Детальный анализ от Gemini - отображается вместе с графиками */}
      {isAnalyzing && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 text-gray-900">
          <div className="flex items-center gap-3">
            <Loader2 size={24} className="text-purple-600 animate-spin" />
            <div>
              <h3 className="text-xl font-bold text-gray-900">Генерация детального анализа...</h3>
              <p className="text-sm text-gray-600 mt-1">Используется AI для создания подробного заключения по результатам анализа</p>
            </div>
          </div>
        </div>
      )}

      {analysis && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 text-gray-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain size={24} className="text-purple-600" />
              <h3 className="text-xl font-bold text-gray-900">Заключение и детальный анализ результатов</h3>
            </div>
            {analysisModel && (
              <div className="text-xs text-purple-600 bg-purple-100 px-3 py-1 rounded-full font-medium">
                Модель: {analysisModel}
              </div>
            )}
          </div>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {analysis.split('\n').map((paragraph, idx) => (
              paragraph.trim() ? (
                <p key={idx} className="mb-3 leading-relaxed">
                  {paragraph}
                </p>
              ) : null
            ))}
          </div>
        </div>
      )}

      {/* Detailed Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-900">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Детальная таблица приоритетов</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-gray-900">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-2 text-left text-gray-900">Альтернатива</th>
                {hierarchy.criteria.map((crit, index) => (
                  <th key={index} className="border border-gray-300 p-2 text-center text-gray-900">
                    {crit}
                  </th>
                ))}
                <th className="border border-gray-300 p-2 text-center font-semibold text-gray-900">Глобальный приоритет</th>
              </tr>
            </thead>
            <tbody>
              {hierarchy.alternatives.map((alt, altIndex) => (
                <tr key={altIndex}>
                  <td className="border border-gray-300 p-2 font-medium text-gray-900">{alt}</td>
                  {hierarchy.criteria.map((crit, critIndex) => (
                    <td key={critIndex} className="border border-gray-300 p-2 text-center text-gray-900">
                      {(results.alternativePrioritiesByCriteria[critIndex][altIndex] * 100).toFixed(2)}%
                    </td>
                  ))}
                  <td className="border border-gray-300 p-2 text-center font-semibold bg-blue-50 text-gray-900">
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
