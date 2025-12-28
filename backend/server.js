import express from 'express';
import cors from 'cors';
import { checkConsistency, calculateGlobalPriorities } from './ahp.js';
import { getGeminiProvider } from './gemini.js';
import { initDatabase, saveAnalysis, getAllAnalyses, getAnalysisById, deleteAnalysis, getAnalysesCount } from './database.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Инициализация базы данных при запуске
let dbInitialized = false;
initDatabase()
  .then(() => {
    dbInitialized = true;
    console.log('✅ База данных готова к работе');
  })
  .catch((error) => {
    console.error('❌ Ошибка инициализации БД:', error);
    // Продолжаем работу даже если БД не доступна (для обратной совместимости)
  });

// Проверка здоровья сервера
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'MPRIORITY 2.0 API is running',
    database: dbInitialized ? 'connected' : 'disconnected'
  });
});

// Проверка согласованности матрицы
app.post('/api/check-consistency', (req, res) => {
  try {
    const { matrix } = req.body;
    
    if (!matrix || !Array.isArray(matrix)) {
      return res.status(400).json({ error: 'Матрица должна быть массивом' });
    }
    
    const result = checkConsistency(matrix);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Расчет глобальных приоритетов
app.post('/api/calculate-global-priorities', (req, res) => {
  try {
    const { hierarchy, criteriaMatrix, alternativeMatrices } = req.body;
    
    if (!hierarchy || !criteriaMatrix || !alternativeMatrices) {
      return res.status(400).json({ error: 'Недостаточно данных для расчета' });
    }
    
    const result = calculateGlobalPriorities(hierarchy, criteriaMatrix, alternativeMatrices);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Детальный разбор результатов с помощью Gemini
app.post('/api/analyze-results', async (req, res) => {
  try {
    const { hierarchy, results } = req.body;
    
    if (!hierarchy || !results) {
      return res.status(400).json({ error: 'Недостаточно данных для анализа' });
    }

    // Получаем провайдер Gemini с автоматическим fallback
    const geminiProvider = getGeminiProvider();

    // Формируем промпт для анализа
    const prompt = `Ты эксперт по методу анализа иерархий (AHP) Томаса Саати. Проанализируй результаты анализа и предоставь детальный разбор на русском языке.

Цель анализа: ${hierarchy.goal}

Критерии: ${hierarchy.criteria.join(', ')}

Альтернативы: ${hierarchy.alternatives.join(', ')}

Результаты:
- Глобальные приоритеты альтернатив:
${results.globalPriorities.map((alt, idx) => `${idx + 1}. ${alt.name}: ${(alt.priority * 100).toFixed(2)}%`).join('\n')}

- Приоритеты критериев:
${hierarchy.criteria.map((crit, idx) => `${crit}: ${(results.criteriaPriorities[idx] * 100).toFixed(2)}%`).join('\n')}

- Согласованность критериев: CR = ${(results.criteriaConsistency.cr * 100).toFixed(2)}% ${results.criteriaConsistency.isConsistent ? '(приемлемо)' : '(низкая согласованность)'}

- Согласованность альтернатив по критериям:
${results.alternativeConsistencies.map((cons, idx) => {
  const isApplicable = cons.isApplicable !== false;
  if (isApplicable) {
    return `${hierarchy.criteria[idx]}: CR = ${(cons.cr * 100).toFixed(2)}%`;
  } else {
    return `${hierarchy.criteria[idx]}: Согласованность не применяется (матрица ${cons.n}x${cons.n})`;
  }
}).join('\n')}

Предоставь детальный анализ, который включает:
1. Интерпретацию результатов ранжирования альтернатив
2. Объяснение влияния каждого критерия на итоговое решение
3. Анализ согласованности суждений и рекомендации по улучшению (если необходимо)
4. Практические выводы и рекомендации для принятия решения
5. Объяснение того, почему выбранная альтернатива получила наивысший приоритет

Ответ должен быть структурированным, понятным и полезным для принятия решения.`;

    // Генерируем контент с автоматическим fallback между моделями
    const result = await geminiProvider.generateContent(prompt);

    res.json({ 
      analysis: result.text,
      model: result.model // Информация о модели, которая была использована
    });
  } catch (error) {
    console.error('Ошибка при запросе к Gemini:', error);
    res.status(500).json({ 
      error: error.message || 'Ошибка при анализе результатов',
      details: 'Проверьте настройку GEMINI_API_KEY и доступность сервиса Gemini'
    });
  }
});

// Сохранение анализа в базу данных
app.post('/api/analyses', async (req, res) => {
  try {
    if (!dbInitialized) {
      return res.status(503).json({ error: 'База данных не доступна' });
    }

    const { goal, criteria, alternatives, criteriaMatrix, alternativeMatrices, results } = req.body;
    
    if (!goal || !criteria || !alternatives || !criteriaMatrix || !alternativeMatrices) {
      return res.status(400).json({ error: 'Недостаточно данных для сохранения' });
    }

    const saved = await saveAnalysis({
      goal,
      criteria,
      alternatives,
      criteriaMatrix,
      alternativeMatrices,
      results
    });

    res.json({ success: true, id: saved.id, timestamp: saved.timestamp });
  } catch (error) {
    console.error('Ошибка при сохранении анализа:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получение всех анализов
app.get('/api/analyses', async (req, res) => {
  try {
    if (!dbInitialized) {
      return res.status(503).json({ error: 'База данных не доступна' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const analyses = await getAllAnalyses(limit, offset);
    const total = await getAnalysesCount();

    res.json({
      analyses,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Ошибка при получении анализов:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получение анализа по ID
app.get('/api/analyses/:id', async (req, res) => {
  try {
    if (!dbInitialized) {
      return res.status(503).json({ error: 'База данных не доступна' });
    }

    const { id } = req.params;
    const analysis = await getAnalysisById(id);

    if (!analysis) {
      return res.status(404).json({ error: 'Анализ не найден' });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Ошибка при получении анализа:', error);
    res.status(500).json({ error: error.message });
  }
});

// Удаление анализа по ID
app.delete('/api/analyses/:id', async (req, res) => {
  try {
    if (!dbInitialized) {
      return res.status(503).json({ error: 'База данных не доступна' });
    }

    const { id } = req.params;
    const deleted = await deleteAnalysis(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Анализ не найден' });
    }

    res.json({ success: true, message: 'Анализ удален' });
  } catch (error) {
    console.error('Ошибка при удалении анализа:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MPRIORITY 2.0 Backend running on port ${PORT}`);
});
