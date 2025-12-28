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
        criteria_matrix JSONB NOT NULL,
        alternative_matrices JSONB NOT NULL,
        results JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_analyses_timestamp ON analyses(timestamp DESC);
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
 */
export async function saveAnalysis(analysis) {
  if (!pool) {
    throw new Error('База данных не инициализирована');
  }
  
  const id = analysis.id || `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = analysis.timestamp || Date.now();
  
  try {
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
        results = EXCLUDED.results
      RETURNING id, timestamp
    `, [
      id,
      timestamp,
      analysis.goal,
      JSON.stringify(analysis.criteria),
      JSON.stringify(analysis.alternatives),
      JSON.stringify(analysis.criteriaMatrix),
      JSON.stringify(analysis.alternativeMatrices),
      analysis.results ? JSON.stringify(analysis.results) : null
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Ошибка при сохранении анализа:', error);
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
    const result = await pool.query(`
      SELECT 
        id, timestamp, goal, criteria, alternatives,
        criteria_matrix, alternative_matrices, results, created_at
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
      criteriaMatrix: row.criteria_matrix,
      alternativeMatrices: row.alternative_matrices,
      results: row.results,
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
    const result = await pool.query(`
      SELECT 
        id, timestamp, goal, criteria, alternatives,
        criteria_matrix, alternative_matrices, results, created_at
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
      criteriaMatrix: row.criteria_matrix,
      alternativeMatrices: row.alternative_matrices,
      results: row.results,
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
