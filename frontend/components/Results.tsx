'use client'

import { useState, useEffect, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { RotateCcw, Download, CheckCircle2, AlertCircle, Brain, FileText, Loader2 } from 'lucide-react'
import HierarchyGraph from './HierarchyGraph'
import HelpTooltip from './HelpTooltip'
import jsPDF from 'jspdf'
import ReactMarkdown from 'react-markdown'
import html2canvas from 'html2canvas'

interface ResultsProps {
  hierarchy: {
    goal: string
    criteria: string[]
    alternatives: string[]
    levels?: Array<{ name: string; items: string[] }>
    isMultiLevel?: boolean
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
  criteriaMatrix: number[][]
  alternativeMatrices: number[][][]
  multiLevelMatrices?: Record<string, number[][] | number[][][]>
  onReset: () => void
}

const COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef']

export default function Results({ hierarchy, results, criteriaMatrix, alternativeMatrices, multiLevelMatrices, onReset }: ResultsProps) {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [analysisModel, setAnalysisModel] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isSavingHTML, setIsSavingHTML] = useState(false)
  const [isSavingImage, setIsSavingImage] = useState(false)
  const [analysisRequested, setAnalysisRequested] = useState(false)
  
  const hierarchyGraphRef = useRef<HTMLDivElement>(null)
  const barChartRef = useRef<HTMLDivElement>(null)
  const pieChartRef = useRef<HTMLDivElement>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)

  const chartData = results.globalPriorities.map((alt, index) => ({
    name: alt.name,
    priority: alt.priority * 100, // Числовое значение для графика
    value: alt.priority
  }))

  const criteriaChartData = hierarchy.criteria.map((crit, index) => ({
    name: crit,
    priority: results.criteriaPriorities[index] * 100, // Числовое значение для графика
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
      // Используем альбомную ориентацию (landscape)
      const doc = new jsPDF('l', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 10
      let yPos = margin

      // Функция для добавления текста с поддержкой кириллицы через html2canvas
      const addTextAsImage = async (text: string, x: number, y: number, options?: any): Promise<number> => {
        const tempDiv = document.createElement('div')
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.top = '-9999px'
        // Исправляем конвертацию: 1mm = 3.779527559px, но уменьшаем размер шрифта для лучшей читаемости
        const fontSizeInPx = (options?.fontSize || 10) * 2.834645669 // уменьшенный множитель для лучшего отображения
        tempDiv.style.fontSize = `${fontSizeInPx}px`
        tempDiv.style.fontFamily = options?.fontFamily || 'Arial, sans-serif'
        tempDiv.style.fontWeight = options?.fontStyle === 'bold' ? 'bold' : 'normal'
        tempDiv.style.color = '#000000'
        tempDiv.style.whiteSpace = 'pre-wrap'
        tempDiv.style.width = `${(options?.maxWidth || pageWidth - 2 * margin) * 3.779527559}px`
        tempDiv.style.padding = '8px' // Добавляем padding чтобы буквы не обрезались
        tempDiv.style.margin = '0'
        tempDiv.style.lineHeight = '1.5' // Увеличиваем line-height для лучшей читаемости
        tempDiv.style.overflow = 'visible' // Убеждаемся что текст не обрезается
        tempDiv.style.boxSizing = 'border-box'
        tempDiv.textContent = text
        document.body.appendChild(tempDiv)
        
        // Ждем немного чтобы элемент отрендерился
        await new Promise(resolve => setTimeout(resolve, 10))
        
        const canvas = await html2canvas(tempDiv, {
          backgroundColor: '#ffffff',
          scale: 2, // Увеличиваем scale для лучшего качества и чтобы буквы не обрезались
          logging: false,
          useCORS: true,
          width: tempDiv.offsetWidth,
          height: tempDiv.offsetHeight,
          windowWidth: tempDiv.offsetWidth,
          windowHeight: tempDiv.offsetHeight,
          allowTaint: true
        })
        
        document.body.removeChild(tempDiv)
        const imgData = canvas.toDataURL('image/png')
        const imgWidth = (options?.maxWidth || pageWidth - 2 * margin)
        const imgHeight = (canvas.height / canvas.width) * imgWidth
        
        if (y + imgHeight > pageHeight - 15) {
          doc.addPage('l')
          y = margin
        }
        
        doc.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight)
        return y + imgHeight + 3
      }

      // Функция для добавления таблицы с поддержкой кириллицы через html2canvas
      const addTableAsImage = async (
        headers: string[], 
        rows: string[][], 
        x: number, 
        y: number, 
        options?: {
          maxWidth?: number
          headFillColor?: string
          headTextColor?: string
          fontSize?: number
          columnStyles?: Record<number, { cellWidth?: number; fontStyle?: string; fillColor?: string | number[] }>
        }
      ): Promise<number> => {
        const tableDiv = document.createElement('div')
        tableDiv.style.position = 'absolute'
        tableDiv.style.left = '-9999px'
        tableDiv.style.top = '-9999px'
        const tableMaxWidth = (options?.maxWidth || pageWidth - 2 * margin) * 3.779527559
        tableDiv.style.width = `${tableMaxWidth}px`
        tableDiv.style.fontFamily = 'Arial, sans-serif'
        tableDiv.style.fontSize = `${(options?.fontSize || 9) * 2.834645669}px`
        tableDiv.style.overflow = 'visible' // Убеждаемся что таблица не обрезается
        tableDiv.style.boxSizing = 'border-box'
        
        const table = document.createElement('table')
        table.style.borderCollapse = 'collapse'
        table.style.width = '100%'
        table.style.border = '1px solid #000000'
        
        // Заголовок таблицы
        const thead = document.createElement('thead')
        const headerRow = document.createElement('tr')
        headerRow.style.backgroundColor = options?.headFillColor || '#0ea5e9'
        headers.forEach((header, colIndex) => {
          const th = document.createElement('th')
          th.textContent = header
          th.style.border = '1px solid #000000'
          th.style.padding = '8px 12px' // Увеличиваем padding чтобы буквы не обрезались
          th.style.textAlign = 'left'
          th.style.fontWeight = 'bold'
          th.style.color = options?.headTextColor || '#ffffff'
          th.style.backgroundColor = options?.headFillColor || '#0ea5e9'
          th.style.lineHeight = '1.5' // Добавляем line-height
          th.style.verticalAlign = 'middle' // Выравнивание по вертикали
          th.style.whiteSpace = 'normal' // Разрешаем перенос текста
          th.style.overflow = 'visible'
          if (options?.columnStyles?.[colIndex]?.cellWidth) {
            th.style.width = `${(options.columnStyles[colIndex].cellWidth! / (pageWidth - 2 * margin)) * 100}%`
          }
          headerRow.appendChild(th)
        })
        thead.appendChild(headerRow)
        table.appendChild(thead)
        
        // Тело таблицы
        const tbody = document.createElement('tbody')
        rows.forEach((row, rowIndex) => {
          const tr = document.createElement('tr')
          row.forEach((cell, colIndex) => {
            const td = document.createElement('td')
            td.textContent = cell
            td.style.border = '1px solid #000000'
            td.style.padding = '8px 12px' // Увеличиваем padding чтобы буквы не обрезались
            td.style.textAlign = 'left'
            td.style.lineHeight = '1.5' // Добавляем line-height
            td.style.verticalAlign = 'middle' // Выравнивание по вертикали
            td.style.whiteSpace = 'normal' // Разрешаем перенос текста
            td.style.overflow = 'visible'
            if (options?.columnStyles?.[colIndex]) {
              const colStyle = options.columnStyles[colIndex]
              if (colStyle.fontStyle === 'bold') {
                td.style.fontWeight = 'bold'
              }
              if (colStyle.fillColor) {
                // Поддерживаем как строку формата 'rgb(...)', так и массив чисел
                if (typeof colStyle.fillColor === 'string') {
                  td.style.backgroundColor = colStyle.fillColor
                } else if (Array.isArray(colStyle.fillColor)) {
                  td.style.backgroundColor = `rgb(${colStyle.fillColor.join(',')})`
                }
              }
              if (colStyle.cellWidth) {
                td.style.width = `${(colStyle.cellWidth / (pageWidth - 2 * margin)) * 100}%`
              }
            }
            tr.appendChild(td)
          })
          tbody.appendChild(tr)
        })
        table.appendChild(tbody)
        
        tableDiv.appendChild(table)
        document.body.appendChild(tableDiv)
        
        // Ждем немного чтобы элемент отрендерился
        await new Promise(resolve => setTimeout(resolve, 10))
        
        const canvas = await html2canvas(tableDiv, {
          backgroundColor: '#ffffff',
          scale: 2, // Увеличиваем scale для лучшего качества и чтобы буквы не обрезались
          logging: false,
          useCORS: true,
          width: tableDiv.offsetWidth,
          height: tableDiv.offsetHeight,
          windowWidth: tableDiv.offsetWidth,
          windowHeight: tableDiv.offsetHeight,
          allowTaint: true
        })
        
        document.body.removeChild(tableDiv)
        const imgData = canvas.toDataURL('image/png')
        const imgWidth = options?.maxWidth || pageWidth - 2 * margin
        const imgHeight = (canvas.height / canvas.width) * imgWidth
        
        if (y + imgHeight > pageHeight - 15) {
          doc.addPage('l')
          y = margin
        }
        
        doc.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight)
        return y + imgHeight + 5
      }

      // Заголовок
      yPos = await addTextAsImage('MPRIORITY 2.0 - Результаты анализа', margin, yPos, {
        fontSize: 16,
        fontStyle: 'bold',
        maxWidth: pageWidth - 2 * margin,
        fontFamily: 'Arial, sans-serif'
      })
      yPos += 3

      // Цель
      yPos = await addTextAsImage('Цель анализа:', margin, yPos, {
        fontSize: 11,
        fontStyle: 'bold',
        maxWidth: pageWidth - 2 * margin
      })
      yPos = await addTextAsImage(hierarchy.goal, margin, yPos, {
        fontSize: 10,
        maxWidth: pageWidth - 2 * margin
      })
      yPos += 3

      // Критерии и альтернативы
      yPos = await addTextAsImage('Критерии:', margin, yPos, {
        fontSize: 10,
        fontStyle: 'bold',
        maxWidth: pageWidth - 2 * margin
      })
      yPos = await addTextAsImage(hierarchy.criteria.join(', '), margin, yPos, {
        fontSize: 9,
        maxWidth: pageWidth - 2 * margin
      })
      yPos += 2

      yPos = await addTextAsImage('Альтернативы:', margin, yPos, {
        fontSize: 10,
        fontStyle: 'bold',
        maxWidth: pageWidth - 2 * margin
      })
      yPos = await addTextAsImage(hierarchy.alternatives.join(', '), margin, yPos, {
        fontSize: 9,
        maxWidth: pageWidth - 2 * margin
      })
      yPos += 5

      // Иерархический граф
      if (hierarchyGraphRef.current) {
        if (yPos > pageHeight - 80) {
          doc.addPage('l')
          yPos = margin
        }
        
        yPos = await addTextAsImage('Иерархический граф:', margin, yPos, {
          fontSize: 11,
          fontStyle: 'bold',
          maxWidth: pageWidth - 2 * margin
        })
        yPos += 3

        const graphCanvas = await html2canvas(hierarchyGraphRef.current, {
          backgroundColor: '#ffffff',
          scale: 1.5,
          logging: false,
          useCORS: true,
          windowWidth: hierarchyGraphRef.current.scrollWidth,
          windowHeight: hierarchyGraphRef.current.scrollHeight
        })
        
        const graphImgData = graphCanvas.toDataURL('image/png')
        const graphImgWidth = pageWidth - 2 * margin
        const graphImgHeight = (graphCanvas.height / graphCanvas.width) * graphImgWidth
        
        // Ограничиваем высоту графа, чтобы он помещался на странице
        const maxGraphHeight = pageHeight - yPos - 20
        const finalGraphHeight = Math.min(graphImgHeight, maxGraphHeight)
        const finalGraphWidth = (graphCanvas.width / graphCanvas.height) * finalGraphHeight
        
        if (yPos + finalGraphHeight > pageHeight - 15) {
          doc.addPage('l')
          yPos = margin
        }
        
        doc.addImage(graphImgData, 'PNG', margin, yPos, finalGraphWidth, finalGraphHeight)
        yPos += finalGraphHeight + 5
      }

      // Ранжирование альтернатив
      if (yPos > pageHeight - 30) {
        doc.addPage('l')
        yPos = margin
      }

      yPos = await addTextAsImage('Ранжирование альтернатив:', margin, yPos, {
        fontSize: 11,
        fontStyle: 'bold',
        maxWidth: pageWidth - 2 * margin
      })
      yPos += 3

      const rankingData = results.globalPriorities.map((alt, idx) => [
        alt.rank.toString(),
        alt.name,
        `${(alt.priority * 100).toFixed(2)}%`
      ])

      yPos = await addTableAsImage(
        ['Ранг', 'Альтернатива', 'Глобальный приоритет'],
        rankingData,
        margin,
        yPos,
        {
          maxWidth: pageWidth - 2 * margin,
          headFillColor: '#0ea5e9',
          headTextColor: '#ffffff',
          fontSize: 9
        }
      )

      // График бар-чарта
      if (barChartRef.current) {
        if (yPos > pageHeight - 80) {
          doc.addPage('l')
          yPos = margin
        }
        
        yPos = await addTextAsImage('Глобальные приоритеты альтернатив:', margin, yPos, {
          fontSize: 11,
          fontStyle: 'bold',
          maxWidth: pageWidth - 2 * margin
        })
        yPos += 3

        const barChartCanvas = await html2canvas(barChartRef.current, {
          backgroundColor: '#ffffff',
          scale: 1.5,
          logging: false,
          useCORS: true,
          windowWidth: barChartRef.current.scrollWidth,
          windowHeight: barChartRef.current.scrollHeight
        })
        
        const barChartImgData = barChartCanvas.toDataURL('image/png')
        const barChartImgWidth = pageWidth - 2 * margin
        const barChartImgHeight = (barChartCanvas.height / barChartCanvas.width) * barChartImgWidth
        
        // Ограничиваем высоту графика
        const maxChartHeight = pageHeight - yPos - 15
        const finalChartHeight = Math.min(barChartImgHeight, maxChartHeight)
        const finalChartWidth = (barChartCanvas.width / barChartCanvas.height) * finalChartHeight
        
        if (yPos + finalChartHeight > pageHeight - 15) {
          doc.addPage('l')
          yPos = margin
        }
        
        doc.addImage(barChartImgData, 'PNG', margin, yPos, finalChartWidth, finalChartHeight)
        yPos += finalChartHeight + 5
      }

      // Приоритеты критериев
      if (yPos > pageHeight - 30) {
        doc.addPage('l')
        yPos = margin
      }

      yPos = await addTextAsImage('Приоритеты критериев:', margin, yPos, {
        fontSize: 11,
        fontStyle: 'bold',
        maxWidth: pageWidth - 2 * margin
      })
      yPos += 3

      const criteriaData = hierarchy.criteria.map((crit, idx) => [
        crit,
        `${(results.criteriaPriorities[idx] * 100).toFixed(2)}%`
      ])

      yPos = await addTableAsImage(
        ['Критерий', 'Приоритет'],
        criteriaData,
        margin,
        yPos,
        {
          maxWidth: pageWidth - 2 * margin,
          headFillColor: '#8b5cf6',
          headTextColor: '#ffffff',
          fontSize: 9
        }
      )

      // График пирога
      if (pieChartRef.current) {
        if (yPos > pageHeight - 80) {
          doc.addPage('l')
          yPos = margin
        }
        
        yPos = await addTextAsImage('Приоритеты критериев (график):', margin, yPos, {
          fontSize: 11,
          fontStyle: 'bold',
          maxWidth: pageWidth - 2 * margin
        })
        yPos += 3

        const pieChartCanvas = await html2canvas(pieChartRef.current, {
          backgroundColor: '#ffffff',
          scale: 1.5,
          logging: false,
          useCORS: true,
          windowWidth: pieChartRef.current.scrollWidth,
          windowHeight: pieChartRef.current.scrollHeight
        })
        
        const pieChartImgData = pieChartCanvas.toDataURL('image/png')
        const pieChartImgWidth = pageWidth - 2 * margin
        const pieChartImgHeight = (pieChartCanvas.height / pieChartCanvas.width) * pieChartImgWidth
        
        // Ограничиваем высоту графика
        const maxPieHeight = pageHeight - yPos - 15
        const finalPieHeight = Math.min(pieChartImgHeight, maxPieHeight)
        const finalPieWidth = (pieChartCanvas.width / pieChartCanvas.height) * finalPieHeight
        
        if (yPos + finalPieHeight > pageHeight - 15) {
          doc.addPage('l')
          yPos = margin
        }
        
        doc.addImage(pieChartImgData, 'PNG', margin, yPos, finalPieWidth, finalPieHeight)
        yPos += finalPieHeight + 5
      }

      // Детальная таблица приоритетов
      if (yPos > pageHeight - 50) {
        doc.addPage('l')
        yPos = margin
      }

      yPos = await addTextAsImage('Детальная таблица приоритетов:', margin, yPos, {
        fontSize: 11,
        fontStyle: 'bold',
        maxWidth: pageWidth - 2 * margin
      })
      yPos += 3

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

      // Создаем стили для колонок
      const columnStyles: Record<number, { cellWidth?: number; fontStyle?: string; fillColor?: string }> = {
        0: { cellWidth: 40 }
      }
      // Последняя колонка (глобальный приоритет) - жирный и с фоном
      columnStyles[detailTableHeaders.length - 1] = {
        fontStyle: 'bold',
        fillColor: 'rgb(219, 234, 254)'
      }

      yPos = await addTableAsImage(
        detailTableHeaders,
        detailTableData,
        margin,
        yPos,
        {
          maxWidth: pageWidth - 2 * margin,
          headFillColor: '#3b82f6',
          headTextColor: '#ffffff',
          fontSize: 8,
          columnStyles
        }
      )

      // Согласованность
      if (yPos > pageHeight - 30) {
        doc.addPage('l')
        yPos = margin
      }

      yPos = await addTextAsImage('Согласованность суждений:', margin, yPos, {
        fontSize: 11,
        fontStyle: 'bold',
        maxWidth: pageWidth - 2 * margin
      })
      yPos += 3

      const criteriaConsistencyText = `Критерии: CR = ${(results.criteriaConsistency.cr * 100).toFixed(2)}% ${results.criteriaConsistency.isConsistent ? '(приемлемо)' : '(низкая согласованность)'}`
      yPos = await addTextAsImage(criteriaConsistencyText, margin, yPos, {
        fontSize: 9,
        maxWidth: pageWidth - 2 * margin
      })

      for (let idx = 0; idx < results.alternativeConsistencies.length; idx++) {
        const cons = results.alternativeConsistencies[idx]
        if (yPos > pageHeight - 15) {
          doc.addPage('l')
          yPos = margin
        }
        const altConsistencyText = `${hierarchy.criteria[idx]}: CR = ${(cons.cr * 100).toFixed(2)}% ${cons.isConsistent ? '(приемлемо)' : '(низкая согласованность)'}`
        yPos = await addTextAsImage(altConsistencyText, margin, yPos, {
          fontSize: 9,
          maxWidth: pageWidth - 2 * margin
        })
      }

      // Детальный анализ от Gemini (если есть)
      if (analysis) {
        if (yPos > pageHeight - 30) {
          doc.addPage('l')
          yPos = margin
        }

        yPos += 3
        yPos = await addTextAsImage('Детальный анализ результатов:', margin, yPos, {
          fontSize: 11,
          fontStyle: 'bold',
          maxWidth: pageWidth - 2 * margin
        })
        yPos += 3

        // Конвертируем markdown в читаемый текст для PDF
        let pdfAnalysis = analysis
        // Убираем markdown разметку, но сохраняем структуру
        pdfAnalysis = pdfAnalysis.replace(/^### (.*)$/gm, '\n$1\n')
        pdfAnalysis = pdfAnalysis.replace(/^## (.*)$/gm, '\n$1\n')
        pdfAnalysis = pdfAnalysis.replace(/^# (.*)$/gm, '\n$1\n')
        pdfAnalysis = pdfAnalysis.replace(/\*\*(.*?)\*\*/g, '$1') // Убираем жирный, но оставляем текст
        pdfAnalysis = pdfAnalysis.replace(/\*(.*?)\*/g, '$1') // Убираем курсив, но оставляем текст
        pdfAnalysis = pdfAnalysis.replace(/`([^`]+)`/g, '$1') // Убираем код, но оставляем текст
        
        // Разбиваем на части для лучшей читаемости
        const analysisParts = pdfAnalysis.split('\n').filter(p => p.trim())
        for (const part of analysisParts) {
          if (yPos > pageHeight - 20) {
            doc.addPage('l')
            yPos = margin
          }
          yPos = await addTextAsImage(part.trim(), margin, yPos, {
            fontSize: 8,
            maxWidth: pageWidth - 2 * margin
          })
          yPos += 2
        }
      }

      // Футер - добавляем на каждую страницу
      const totalPages = (doc as any).internal.getNumberOfPages()
      
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        const pageFooterText = `Сгенерировано MPRIORITY 2.0 - ${new Date().toLocaleString('ru-RU')} | Страница ${i} из ${totalPages}`
        
        // Создаем временный элемент для футера
        const footerDiv = document.createElement('div')
        footerDiv.style.position = 'absolute'
        footerDiv.style.left = '-9999px'
        footerDiv.style.top = '-9999px'
        footerDiv.style.fontSize = '7px'
        footerDiv.style.fontFamily = 'Arial, sans-serif'
        footerDiv.style.color = '#000000'
        footerDiv.style.textAlign = 'center'
        footerDiv.style.width = `${(pageWidth - 2 * margin) * 3.779527559}px`
        footerDiv.style.fontStyle = 'italic'
        footerDiv.style.padding = '4px' // Добавляем padding чтобы буквы не обрезались
        footerDiv.style.lineHeight = '1.5' // Добавляем line-height
        footerDiv.style.overflow = 'visible' // Убеждаемся что текст не обрезается
        footerDiv.style.boxSizing = 'border-box'
        footerDiv.textContent = pageFooterText
        document.body.appendChild(footerDiv)
        
        // Ждем немного чтобы элемент отрендерился
        await new Promise(resolve => setTimeout(resolve, 10))
        
        const footerCanvas = await html2canvas(footerDiv, {
          backgroundColor: '#ffffff',
          scale: 2, // Увеличиваем scale для лучшего качества
          logging: false,
          useCORS: true,
          width: footerDiv.offsetWidth,
          height: footerDiv.offsetHeight,
          windowWidth: footerDiv.offsetWidth,
          windowHeight: footerDiv.offsetHeight,
          allowTaint: true
        })
        document.body.removeChild(footerDiv)
        
        const footerImgData = footerCanvas.toDataURL('image/png')
        const footerImgWidth = pageWidth - 2 * margin
        const footerImgHeight = (footerCanvas.height / footerCanvas.width) * footerImgWidth
        doc.addImage(footerImgData, 'PNG', margin, pageHeight - footerImgHeight - 3, footerImgWidth, footerImgHeight)
      }

      doc.save(`mpriority-results-${Date.now()}.pdf`)
    } catch (error) {
      console.error('Ошибка при генерации PDF:', error)
      alert('Ошибка при генерации PDF: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'))
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Сохранение в HTML формат с сохранением всех стилей
  const saveAsHTML = async () => {
    setIsSavingHTML(true)
    try {
      if (!resultsContainerRef.current) {
        throw new Error('Контейнер результатов не найден')
      }

      // Сначала получаем все изображения асинхронно
      let hierarchyGraphImg = '<p>Граф недоступен</p>'
      let barChartImg = '<p>График недоступен</p>'
      let pieChartImg = '<p>График недоступен</p>'

      if (hierarchyGraphRef.current) {
        try {
          const canvas = await html2canvas(hierarchyGraphRef.current, {
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false,
            useCORS: true,
            windowWidth: hierarchyGraphRef.current.scrollWidth,
            windowHeight: hierarchyGraphRef.current.scrollHeight
          })
          hierarchyGraphImg = `<img src="${canvas.toDataURL('image/png')}" alt="Иерархический граф" style="max-width: 100%; height: auto;" />`
        } catch (error) {
          console.error('Ошибка при создании изображения графа:', error)
        }
      }

      if (barChartRef.current) {
        try {
          const canvas = await html2canvas(barChartRef.current, {
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false,
            useCORS: true
          })
          barChartImg = `<img src="${canvas.toDataURL('image/png')}" alt="График приоритетов альтернатив" style="max-width: 100%; height: auto;" />`
        } catch (error) {
          console.error('Ошибка при создании изображения bar chart:', error)
        }
      }

      if (pieChartRef.current) {
        try {
          const canvas = await html2canvas(pieChartRef.current, {
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false,
            useCORS: true
          })
          pieChartImg = `<img src="${canvas.toDataURL('image/png')}" alt="График приоритетов критериев" style="max-width: 100%; height: auto;" />`
        } catch (error) {
          console.error('Ошибка при создании изображения pie chart:', error)
        }
      }

      // Функция для конвертации markdown в HTML
      const markdownToHTML = (text: string): string => {
        let html = text
        // Заголовки
        html = html.replace(/^### (.*)$/gm, '<h4>$1</h4>')
        html = html.replace(/^## (.*)$/gm, '<h3>$1</h3>')
        html = html.replace(/^# (.*)$/gm, '<h2>$1</h2>')
        // Жирный текст
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Код
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
        // Разбиваем на параграфы
        const lines = html.split('\n')
        const paragraphs: string[] = []
        let currentParagraph = ''
        
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) {
            if (currentParagraph) {
              paragraphs.push(`<p>${currentParagraph}</p>`)
              currentParagraph = ''
            }
          } else if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) {
            if (currentParagraph) {
              paragraphs.push(`<p>${currentParagraph}</p>`)
              currentParagraph = ''
            }
            paragraphs.push(trimmed)
          } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            if (currentParagraph) {
              paragraphs.push(`<p>${currentParagraph}</p>`)
              currentParagraph = ''
            }
            paragraphs.push(`<ul><li>${trimmed.substring(2)}</li></ul>`)
          } else if (/^\d+\./.test(trimmed)) {
            if (currentParagraph) {
              paragraphs.push(`<p>${currentParagraph}</p>`)
              currentParagraph = ''
            }
            paragraphs.push(`<ol><li>${trimmed.replace(/^\d+\./, '').trim()}</li></ol>`)
          } else {
            currentParagraph += (currentParagraph ? ' ' : '') + trimmed
          }
        }
        if (currentParagraph) {
          paragraphs.push(`<p>${currentParagraph}</p>`)
        }
        return paragraphs.join('\n')
      }

      // Создаем HTML документ с инлайн стилями
      const htmlContent = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MPRIORITY 2.0 - Результаты анализа</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      background: linear-gradient(to bottom right, #eff6ff, #ffffff, #faf5ff);
      padding: 20px;
      color: #111827;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    h1 { font-size: 2rem; font-weight: bold; margin-bottom: 8px; }
    h2 { font-size: 1.5rem; font-weight: bold; margin-top: 32px; margin-bottom: 16px; }
    h3 { font-size: 1.25rem; font-weight: 600; margin-top: 24px; margin-bottom: 12px; }
    p { margin-bottom: 12px; line-height: 1.6; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f9fafb;
      font-weight: 600;
    }
    .section {
      margin-bottom: 32px;
      padding: 24px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }
    .chart-container {
      margin: 16px 0;
      padding: 16px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }
    .analysis {
      background: linear-gradient(to bottom right, #faf5ff, #eff6ff);
      border: 1px solid #c4b5fd;
      border-radius: 8px;
      padding: 24px;
      margin: 24px 0;
    }
    .analysis h3 {
      color: #7c3aed;
      margin-bottom: 16px;
    }
    .analysis p {
      color: #374151;
      margin-bottom: 12px;
    }
    .analysis ul, .analysis ol {
      margin-left: 24px;
      margin-bottom: 12px;
    }
    .analysis li {
      margin-bottom: 8px;
    }
    .analysis strong {
      font-weight: 600;
      color: #111827;
    }
    .analysis code {
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.875rem;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>MPRIORITY 2.0 - Результаты анализа</h1>
    <p><strong>Дата создания:</strong> ${new Date().toLocaleString('ru-RU')}</p>
    <p><strong>Цель анализа:</strong> ${hierarchy.goal}</p>
    
    <div class="section">
      <h2>Иерархический граф</h2>
      <div class="chart-container">
        ${hierarchyGraphImg}
      </div>
    </div>

    <div class="section">
      <h2>Ранжирование альтернатив</h2>
      <table>
        <thead>
          <tr>
            <th>Ранг</th>
            <th>Альтернатива</th>
            <th>Глобальный приоритет</th>
          </tr>
        </thead>
        <tbody>
          ${results.globalPriorities.map(alt => `
            <tr>
              <td>${alt.rank}</td>
              <td>${alt.name}</td>
              <td>${(alt.priority * 100).toFixed(2)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Графики</h2>
      <div class="chart-container">
        <h3>Глобальные приоритеты альтернатив</h3>
        ${barChartImg}
      </div>
      
      <div class="chart-container">
        <h3>Приоритеты критериев</h3>
        ${pieChartImg}
      </div>
    </div>

    <div class="section">
      <h2>Приоритеты критериев</h2>
      <table>
        <thead>
          <tr>
            <th>Критерий</th>
            <th>Приоритет</th>
          </tr>
        </thead>
        <tbody>
          ${hierarchy.criteria.map((crit, idx) => `
            <tr>
              <td>${crit}</td>
              <td>${(results.criteriaPriorities[idx] * 100).toFixed(2)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Детальная таблица приоритетов</h2>
      <table>
        <thead>
          <tr>
            <th>Альтернатива</th>
            ${hierarchy.criteria.map(crit => `<th>${crit}</th>`).join('')}
            <th>Глобальный приоритет</th>
          </tr>
        </thead>
        <tbody>
          ${hierarchy.alternatives.map((alt, altIndex) => `
            <tr>
              <td>${alt}</td>
              ${hierarchy.criteria.map((crit, critIndex) => `
                <td>${(results.alternativePrioritiesByCriteria[critIndex][altIndex] * 100).toFixed(2)}%</td>
              `).join('')}
              <td>${(results.globalPriorities.find(a => a.name === alt)?.priority! * 100).toFixed(2)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Согласованность суждений</h2>
      <p><strong>Критерии:</strong> CR = ${(results.criteriaConsistency.cr * 100).toFixed(2)}% ${results.criteriaConsistency.isConsistent ? '(приемлемо)' : '(низкая согласованность)'}</p>
      ${results.alternativeConsistencies.map((cons, idx) => {
        const isApplicable = cons.isApplicable !== false
        return `<p><strong>${hierarchy.criteria[idx]}:</strong> ${
          isApplicable 
            ? `CR = ${(cons.cr * 100).toFixed(2)}% ${cons.isConsistent ? '(приемлемо)' : '(низкая согласованность)'}`
            : `Согласованность не применяется (матрица ${cons.n}x${cons.n})`
        }</p>`
      }).join('')}
    </div>

    ${analysis ? `
    <div class="analysis">
      <h3>Заключение и детальный анализ результатов</h3>
      ${analysisModel ? `<p style="font-size: 0.875rem; color: #7c3aed; margin-bottom: 16px;"><strong>Модель:</strong> ${analysisModel}</p>` : ''}
      <div>${markdownToHTML(analysis)}</div>
    </div>
    ` : ''}

    <div class="footer">
      <p>Сгенерировано MPRIORITY 2.0 - ${new Date().toLocaleString('ru-RU')}</p>
    </div>
  </div>
</body>
</html>
      `

      // Создаем blob и скачиваем
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mpriority-results-${Date.now()}.html`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Ошибка при сохранении HTML:', error)
      alert('Ошибка при сохранении HTML: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'))
    } finally {
      setIsSavingHTML(false)
    }
  }

  // Сохранение всего контейнера как изображение
  const saveAsImage = async () => {
    setIsSavingImage(true)
    try {
      if (!resultsContainerRef.current) {
        throw new Error('Контейнер результатов не найден')
      }

      // Ждем немного, чтобы все элементы загрузились
      await new Promise(resolve => setTimeout(resolve, 500))

      const canvas = await html2canvas(resultsContainerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        windowWidth: resultsContainerRef.current.scrollWidth,
        windowHeight: resultsContainerRef.current.scrollHeight,
        allowTaint: true
      })

      // Создаем ссылку для скачивания
      const link = document.createElement('a')
      link.download = `mpriority-results-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      link.click()
    } catch (error) {
      console.error('Ошибка при сохранении изображения:', error)
      alert('Ошибка при сохранении изображения: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'))
    } finally {
      setIsSavingImage(false)
    }
  }

  return (
    <div ref={resultsContainerRef} className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-gray-900">Результаты анализа</h2>
            <HelpTooltip
              title="Как интерпретировать результаты?"
              type="guide"
              content={
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-green-600" />
                      Что показывают результаты?
                    </h4>
                    <p className="text-gray-700 mb-3">
                      После выполнения всех сравнений система рассчитывает глобальные приоритеты — 
                      это числовые значения, показывающие относительную важность каждой альтернативы 
                      с учетом всех критериев и их весов.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-green-600" />
                      Ранжирование альтернатив
                    </h4>
                    <p className="text-gray-700 mb-2">
                      Альтернативы отсортированы по убыванию приоритета. Чем выше приоритет, 
                      тем лучше вариант соответствует вашим критериям:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li><strong>1 место</strong> — лучший вариант (наибольший приоритет)</li>
                      <li><strong>2 место</strong> — второй по предпочтительности</li>
                      <li>И так далее...</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-green-600" />
                      Приоритеты критериев
                    </h4>
                    <p className="text-gray-700 mb-2">
                      Показывает, насколько важен каждый критерий в общей картине решения. 
                      Критерии с большим приоритетом сильнее влияют на итоговый результат.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-green-600" />
                      Согласованность суждений
                    </h4>
                    <p className="text-gray-700 mb-2">
                      Коэффициент согласованности (CR) показывает логичность ваших сравнений:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li><strong className="text-green-600">CR &lt; 10%</strong> — отличная согласованность</li>
                      <li><strong className="text-blue-600">CR 10-20%</strong> — приемлемая согласованность</li>
                      <li><strong className="text-orange-600">CR &gt; 20%</strong> — низкая согласованность, стоит пересмотреть сравнения</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-green-600" />
                      Детальная таблица приоритетов
                    </h4>
                    <p className="text-gray-700 mb-2">
                      Показывает приоритет каждой альтернативы по каждому критерию отдельно, 
                      а также итоговый глобальный приоритет. Это помогает понять, почему одна 
                      альтернатива оказалась лучше другой.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-green-600" />
                      Детальный анализ от AI
                    </h4>
                    <p className="text-gray-700 mb-2">
                      Искусственный интеллект анализирует ваши результаты и предоставляет:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Интерпретацию результатов ранжирования</li>
                      <li>Объяснение влияния каждого критерия</li>
                      <li>Анализ согласованности и рекомендации</li>
                      <li>Практические выводы для принятия решения</li>
                    </ul>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-blue-600" />
                      Важно помнить
                    </h4>
                    <p className="text-blue-800 text-sm mb-2">
                      Результаты МАИ — это инструмент поддержки принятия решений, а не абсолютная истина. 
                      Используйте их вместе с вашим опытом и интуицией.
                    </p>
                    <p className="text-blue-800 text-sm">
                      Вы можете сохранить результаты в PDF или JSON для дальнейшего анализа или презентации.
                    </p>
                  </div>
                </div>
              }
            />
          </div>
          <p className="text-gray-600">Цель: <span className="font-semibold">{hierarchy.goal}</span></p>
          <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
            <CheckCircle2 size={16} />
            Данные автоматически сохранены в базу данных
          </p>
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
            onClick={saveAsImage}
            disabled={isSavingImage}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Сохранить отчет как изображение (PNG) в точном виде с экрана"
          >
            {isSavingImage ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Download size={18} />
                PNG
              </>
            )}
          </button>
          <button
            onClick={saveAsHTML}
            disabled={isSavingHTML}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Сохранить отчет в HTML формате с сохранением всех стилей и форматирования"
          >
            {isSavingHTML ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <FileText size={18} />
                HTML
              </>
            )}
          </button>
          <button
            onClick={generatePDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Сохранить отчет в PDF формате"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                <FileText size={18} />
                PDF
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
        <div ref={hierarchyGraphRef}>
          <HierarchyGraph
            goal={hierarchy.goal}
            criteria={hierarchy.criteria}
            alternatives={hierarchy.alternatives}
            levels={hierarchy.levels}
            isMultiLevel={hierarchy.isMultiLevel}
          />
        </div>
      </div>

      {/* Consistency Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-gray-900">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Согласованность критериев</h3>
            <HelpTooltip
              title="Что такое согласованность?"
              type="info"
              content={
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Что такое согласованность?</h4>
                    <p className="text-gray-700">
                      Согласованность (CR - Consistency Ratio) показывает, насколько логичны и последовательны ваши сравнения. 
                      Она проверяет транзитивность суждений: если A важнее B в 3 раза, а B важнее C в 2 раза, 
                      то A должно быть важнее C примерно в 6 раз (3 × 2).
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Зачем нужна согласованность?</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>Проверяет логичность ваших суждений</li>
                      <li>Помогает выявить ошибки в сравнениях</li>
                      <li>Повышает надежность результатов анализа</li>
                      <li>Показывает, насколько уверенно вы можете принимать решение</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Интерпретация CR:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li><strong className="text-green-600">CR &lt; 10%</strong> — отличная согласованность</li>
                      <li><strong className="text-blue-600">CR 10-20%</strong> — приемлемая согласованность</li>
                      <li><strong className="text-orange-600">CR &gt; 20%</strong> — низкая согласованность, стоит пересмотреть сравнения</li>
                    </ul>
                  </div>
                </div>
              }
            />
          </div>
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
          {results.criteriaConsistency.cr > 0.2 && (
            <div className="mt-2 text-sm text-orange-700 bg-orange-50 p-2 rounded">
              <strong>Рекомендация:</strong> Пересмотрите сравнения критериев для улучшения согласованности.
            </div>
          )}
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-gray-900">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Согласованность альтернатив</h3>
            <HelpTooltip
              title="Почему согласованность не применяется для матриц 2x2?"
              type="info"
              content={
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Почему для матриц 2x2 согласованность не проверяется?</h4>
                    <p className="text-gray-700 mb-2">
                      Для матриц размером 2×2 проверка согласованности не применяется по следующим причинам:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li><strong>Математическая причина:</strong> В матрице 2×2 есть только одно независимое сравнение (A vs B), 
                      поэтому транзитивность проверить невозможно — нет третьего элемента для сравнения.</li>
                      <li><strong>Теоретическая причина:</strong> Матрица 2×2 всегда согласована по определению, 
                      так как если A важнее B в X раз, то B важнее A в 1/X раз — это единственное сравнение.</li>
                      <li><strong>Практическая причина:</strong> Для проверки согласованности нужна матрица минимум 3×3, 
                      где можно проверить транзитивность: если A важнее B, а B важнее C, то A должно быть важнее C.</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Вывод:</strong> Если у вас только 2 альтернативы, согласованность не проверяется, 
                      но это нормально — просто сравните их напрямую по каждому критерию.
                    </p>
                  </div>
                </div>
              }
            />
          </div>
          <div className="space-y-1">
            {results.alternativeConsistencies.map((consistency, index) => {
              const isApplicable = consistency.isApplicable !== false;
              return (
                <div key={index} className="text-sm text-gray-900">
                  <span className="font-medium text-gray-900">{hierarchy.criteria[index]}:</span>{' '}
                  {isApplicable ? (
                    <span className={consistency.isConsistent ? 'text-green-600' : 'text-orange-600'}>
                      CR = {(consistency.cr * 100).toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-gray-500 italic">
                      Согласованность не применяется (матрица {consistency.n}x{consistency.n})
                    </span>
                  )}
                </div>
              );
            })}
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
        <div ref={barChartRef} className="bg-white border border-gray-200 rounded-lg p-6 text-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Глобальные приоритеты альтернатив</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: any) => `${Number(value).toFixed(2)}%`} />
              <Legend />
              <Bar dataKey="priority" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div ref={pieChartRef} className="bg-white border border-gray-200 rounded-lg p-6 text-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Приоритеты критериев</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={criteriaChartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, priority }) => {
                  const percent = Number(priority).toFixed(2);
                  // Показываем метку только если приоритет > 1%
                  return Number(percent) > 1 ? `${name}: ${percent}%` : '';
                }}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {criteriaChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any, name: string, props: any) => {
                  const percent = (Number(value) * 100).toFixed(2);
                  return [`${percent}%`, props.payload.name];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Дополнительная таблица для всех критериев */}
          <div className="mt-4 text-sm">
            <table className="w-full border-collapse">
              <tbody>
                {criteriaChartData.map((entry, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-1 text-gray-900">
                      <span 
                        className="inline-block w-4 h-4 rounded mr-2" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {entry.name}
                    </td>
                    <td className="py-1 text-right font-semibold text-gray-900">
                      {Number(entry.priority).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          <div className="prose prose-sm max-w-none text-gray-700">
            <ReactMarkdown
              components={{
                p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
                strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                em: ({node, ...props}) => <em className="italic" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc list-inside ml-4 space-y-1 mb-3" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal list-inside ml-4 space-y-1 mb-3" {...props} />,
                li: ({node, ...props}) => <li className="text-gray-700" {...props} />,
                h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-3 mt-4 text-gray-900" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-2 mt-3 text-gray-900" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-semibold mb-2 mt-3 text-gray-900" {...props} />,
                h4: ({node, ...props}) => <h4 className="text-base font-semibold mb-1 mt-2 text-gray-900" {...props} />,
                code: ({node, ...props}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-3" {...props} />,
              }}
            >
              {analysis}
            </ReactMarkdown>
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
