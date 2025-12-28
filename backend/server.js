import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkConsistency, calculateGlobalPriorities } from './ahp.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Проверка здоровья сервера
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'MPRIORITY 2.0 API is running' });
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API ключ Gemini не настроен. Установите переменную окружения GEMINI_API_KEY' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

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
${results.alternativeConsistencies.map((cons, idx) => `${hierarchy.criteria[idx]}: CR = ${(cons.cr * 100).toFixed(2)}%`).join('\n')}

Предоставь детальный анализ, который включает:
1. Интерпретацию результатов ранжирования альтернатив
2. Объяснение влияния каждого критерия на итоговое решение
3. Анализ согласованности суждений и рекомендации по улучшению (если необходимо)
4. Практические выводы и рекомендации для принятия решения
5. Объяснение того, почему выбранная альтернатива получила наивысший приоритет

Ответ должен быть структурированным, понятным и полезным для принятия решения.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ analysis: text });
  } catch (error) {
    console.error('Ошибка при запросе к Gemini:', error);
    res.status(500).json({ error: error.message || 'Ошибка при анализе результатов' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MPRIORITY 2.0 Backend running on port ${PORT}`);
});
