import express from 'express';
import cors from 'cors';
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

app.listen(PORT, () => {
  console.log(`🚀 MPRIORITY 2.0 Backend running on port ${PORT}`);
});
