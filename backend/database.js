/**
 * Модуль для работы с базой данных PostgreSQL
 * Хранение анализов AHP
 */

import pkg from 'pg';
const { Pool } = pkg;

// Создаем пул соединений
let pool;

/**
 * Инициализация базы данных
 */
export async function initDatabase() {
  try {
    // Railway предоставляет DATABASE_URL, для локальной разработки можно использовать отдельные переменные
    const connectionString = process.env.DATABASE_URL || 
      `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'mpriority'}`;
    
    pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
      max: 20, // Максимальное количество соединений в пуле
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Проверяем соединение
    const client = await pool.connect();
    console.log('✅ Подключение к PostgreSQL установлено');
    
    // Создаем таблицу для анализов, если её нет
    await client.query(`
      CREATE TABLE IF NOT EXISTS analyses (
        id TEXT PRIMARY KEY,
        timestamp BIGINT NOT NULL,
        goal TEXT NOT NULL,
        criteria JSONB NOT NULL,
        alternatives JSONB NOT NULL,
        levels JSONB,
        is_multi_level BOOLEAN DEFAULT FALSE,
        criteria_matrix JSONB NOT NULL,
        alternative_matrices JSONB NOT NULL,
        multi_level_matrices JSONB,
        results JSONB,
        shortened_texts JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_analyses_timestamp ON analyses(timestamp DESC);
    `);
    
    // Добавляем колонку shortened_texts, если её нет (для существующих таблиц)
    await client.query(`
      ALTER TABLE analyses ADD COLUMN IF NOT EXISTS shortened_texts JSONB;
    `);
    
    client.release();
    console.log('✅ Таблица analyses создана/проверена');
    return pool;
  } catch (error) {
    console.error('❌ Ошибка инициализации базы данных:', error);
    throw error;
  }
}

/**
 * Сохранить анализ в базу данных
 * Поддерживает сохранение промежуточных состояний (без матриц или результатов)
 */
export async function saveAnalysis(analysis) {
  if (!pool) {
    throw new Error('База данных не инициализирована');
  }
  
  // Логируем входящие данные для отладки
  console.log('📝 Попытка сохранения анализа:', {
    id: analysis.id,
    hasGoal: !!analysis.goal,
    hasCriteria: !!analysis.criteria,
    criteriaCount: analysis.criteria?.length || 0,
    hasAlternatives: !!analysis.alternatives,
    alternativesCount: analysis.alternatives?.length || 0,
    hasCriteriaMatrix: !!analysis.criteriaMatrix,
    criteriaMatrixSize: analysis.criteriaMatrix?.length || 0,
    hasAlternativeMatrices: !!analysis.alternativeMatrices,
    alternativeMatricesCount: analysis.alternativeMatrices?.length || 0,
    hasResults: !!analysis.results
  });
  
  const id = analysis.id || `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = analysis.timestamp || Date.now();
  
  try {
    // Базовая валидация обязательных полей
    if (!analysis.goal || typeof analysis.goal !== 'string' || analysis.goal.trim() === '') {
      throw new Error('Цель анализа обязательна и должна быть непустой строкой');
    }
    if (!analysis.criteria || !Array.isArray(analysis.criteria) || analysis.criteria.length === 0) {
      throw new Error('Критерии обязательны и должны быть непустым массивом');
    }
    if (!analysis.alternatives || !Array.isArray(analysis.alternatives) || analysis.alternatives.length === 0) {
      throw new Error('Альтернативы обязательны и должны быть непустым массивом');
    }
    
    // Для матриц используем значения по умолчанию, если они не переданы
    // Это позволяет сохранять промежуточные состояния
    let criteriaMatrix = analysis.criteriaMatrix;
    let alternativeMatrices = analysis.alternativeMatrices;
    
    // Если матрица критериев не передана, создаем единичную матрицу
    if (!criteriaMatrix || !Array.isArray(criteriaMatrix) || criteriaMatrix.length === 0) {
      const n = analysis.criteria.length;
      criteriaMatrix = Array(n).fill(null).map(() => Array(n).fill(1));
      for (let i = 0; i < n; i++) {
        criteriaMatrix[i][i] = 1;
      }
    }
    
    // Если матрицы альтернатив не переданы, создаем единичные матрицы для каждого критерия
    if (!alternativeMatrices || !Array.isArray(alternativeMatrices) || alternativeMatrices.length === 0) {
      const m = analysis.alternatives.length;
      const n = analysis.criteria.length;
      alternativeMatrices = Array(n).fill(null).map(() => {
        const matrix = Array(m).fill(null).map(() => Array(m).fill(1));
        for (let i = 0; i < m; i++) {
          matrix[i][i] = 1;
        }
        return matrix;
      });
    }
    
    // Проверяем, есть ли колонки для многоуровневых иерархий (для обратной совместимости)
    let hasMultiLevelColumns = false;
    try {
      const checkResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'analyses' AND column_name = 'levels'
      `);
      hasMultiLevelColumns = checkResult.rows.length > 0;
    } catch (e) {
      // Игнорируем ошибку
    }

    if (hasMultiLevelColumns) {
      // Новая версия таблицы с поддержкой многоуровневых иерархий
      const result = await pool.query(`
        INSERT INTO analyses (
          id, timestamp, goal, criteria, alternatives, levels, is_multi_level,
          criteria_matrix, alternative_matrices, multi_level_matrices, results, shortened_texts
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          timestamp = EXCLUDED.timestamp,
          goal = EXCLUDED.goal,
          criteria = EXCLUDED.criteria,
          alternatives = EXCLUDED.alternatives,
          levels = EXCLUDED.levels,
          is_multi_level = EXCLUDED.is_multi_level,
          criteria_matrix = EXCLUDED.criteria_matrix,
          alternative_matrices = EXCLUDED.alternative_matrices,
          multi_level_matrices = EXCLUDED.multi_level_matrices,
          results = COALESCE(EXCLUDED.results, analyses.results),
          shortened_texts = EXCLUDED.shortened_texts
        RETURNING id, timestamp
      `, [
        id,
        timestamp,
        analysis.goal,
        JSON.stringify(analysis.criteria),
        JSON.stringify(analysis.alternatives),
        analysis.levels ? JSON.stringify(analysis.levels) : null,
        analysis.isMultiLevel || false,
        JSON.stringify(criteriaMatrix),
        JSON.stringify(alternativeMatrices),
        analysis.multiLevelMatrices ? JSON.stringify(analysis.multiLevelMatrices) : null,
        analysis.results ? JSON.stringify(analysis.results) : null,
        analysis.shortenedTexts ? JSON.stringify(analysis.shortenedTexts) : null
      ]);
      
      console.log('✅ Анализ успешно сохранен:', { id: result.rows[0].id, timestamp: result.rows[0].timestamp });
      return { id: result.rows[0].id, timestamp: parseInt(result.rows[0].timestamp) };
    } else {
      // Старая версия таблицы (обратная совместимость)
      const result = await pool.query(`
        INSERT INTO analyses (
          id, timestamp, goal, criteria, alternatives,
          criteria_matrix, alternative_matrices, results
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          timestamp = EXCLUDED.timestamp,
          goal = EXCLUDED.goal,
          criteria = EXCLUDED.criteria,
          alternatives = EXCLUDED.alternatives,
          criteria_matrix = EXCLUDED.criteria_matrix,
          alternative_matrices = EXCLUDED.alternative_matrices,
          results = COALESCE(EXCLUDED.results, analyses.results)
        RETURNING id, timestamp
      `, [
        id,
        timestamp,
        analysis.goal,
        JSON.stringify(analysis.criteria),
        JSON.stringify(analysis.alternatives),
        JSON.stringify(criteriaMatrix),
        JSON.stringify(alternativeMatrices),
        analysis.results ? JSON.stringify(analysis.results) : null
      ]);
      
      console.log('✅ Анализ успешно сохранен (старая версия таблицы):', { id: result.rows[0].id, timestamp: result.rows[0].timestamp });
      return { id: result.rows[0].id, timestamp: parseInt(result.rows[0].timestamp) };
    }
    
    console.log('✅ Анализ успешно сохранен:', { id: result.rows[0].id, timestamp: result.rows[0].timestamp });
    return { id: result.rows[0].id, timestamp: parseInt(result.rows[0].timestamp) };
  } catch (error) {
    console.error('❌ Ошибка при сохранении анализа:', error);
    console.error('Детали ошибки:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint
    });
    throw error;
  }
}

/**
 * Получить все анализы (с пагинацией)
 */
export async function getAllAnalyses(limit = 50, offset = 0) {
  if (!pool) {
    throw new Error('База данных не инициализирована');
  }
  
  try {
    // Проверяем наличие новых колонок
    let hasMultiLevelColumns = false;
    try {
      const checkResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'analyses' AND column_name = 'levels'
      `);
      hasMultiLevelColumns = checkResult.rows.length > 0;
    } catch (e) {
      // Игнорируем ошибку
    }

    const columns = hasMultiLevelColumns
      ? 'id, timestamp, goal, criteria, alternatives, levels, is_multi_level, criteria_matrix, alternative_matrices, multi_level_matrices, results, created_at'
      : 'id, timestamp, goal, criteria, alternatives, criteria_matrix, alternative_matrices, results, created_at';

    const result = await pool.query(`
      SELECT ${columns}
      FROM analyses
      ORDER BY timestamp DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    return result.rows.map(row => ({
      id: row.id,
      timestamp: parseInt(row.timestamp),
      goal: row.goal,
      criteria: row.criteria,
      alternatives: row.alternatives,
      levels: row.levels || null,
      isMultiLevel: row.is_multi_level || false,
      criteriaMatrix: row.criteria_matrix,
      alternativeMatrices: row.alternative_matrices,
      multiLevelMatrices: row.multi_level_matrices || null,
      results: row.results,
      shortenedTexts: row.shortened_texts || null,
      createdAt: row.created_at
    }));
  } catch (error) {
    console.error('Ошибка при получении анализов:', error);
    throw error;
  }
}

/**
 * Получить анализ по ID
 */
export async function getAnalysisById(id) {
  if (!pool) {
    throw new Error('База данных не инициализирована');
  }
  
  try {
    // Проверяем наличие новых колонок
    let hasMultiLevelColumns = false;
    try {
      const checkResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'analyses' AND column_name = 'levels'
      `);
      hasMultiLevelColumns = checkResult.rows.length > 0;
    } catch (e) {
      // Игнорируем ошибку
    }

    const columns = hasMultiLevelColumns
      ? 'id, timestamp, goal, criteria, alternatives, levels, is_multi_level, criteria_matrix, alternative_matrices, multi_level_matrices, results, shortened_texts, created_at'
      : 'id, timestamp, goal, criteria, alternatives, criteria_matrix, alternative_matrices, results, created_at';

    const result = await pool.query(`
      SELECT ${columns}
      FROM analyses
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      timestamp: parseInt(row.timestamp),
      goal: row.goal,
      criteria: row.criteria,
      alternatives: row.alternatives,
      levels: row.levels || null,
      isMultiLevel: row.is_multi_level || false,
      criteriaMatrix: row.criteria_matrix,
      alternativeMatrices: row.alternative_matrices,
      multiLevelMatrices: row.multi_level_matrices || null,
      results: row.results,
      shortenedTexts: row.shortened_texts || null,
      createdAt: row.created_at
    };
  } catch (error) {
    console.error('Ошибка при получении анализа:', error);
    throw error;
  }
}

/**
 * Удалить анализ по ID
 */
export async function deleteAnalysis(id) {
  if (!pool) {
    throw new Error('База данных не инициализирована');
  }
  
  try {
    const result = await pool.query('DELETE FROM analyses WHERE id = $1', [id]);
    return result.rowCount > 0;
  } catch (error) {
    console.error('Ошибка при удалении анализа:', error);
    throw error;
  }
}

/**
 * Получить количество анализов
 */
export async function getAnalysesCount() {
  if (!pool) {
    throw new Error('База данных не инициализирована');
  }
  
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM analyses');
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Ошибка при получении количества анализов:', error);
    throw error;
  }
}

/**
 * Закрыть соединение с базой данных
 */
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
