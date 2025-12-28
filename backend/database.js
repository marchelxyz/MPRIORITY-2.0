/**
 * Модуль для работы с базой данных SQLite
 * Хранение анализов AHP
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Путь к файлу базы данных
const dbPath = process.env.DATABASE_PATH || join(__dirname, 'data', 'analyses.db');

// Создаем директорию для БД, если её нет
const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Инициализация базы данных
let db;

export function initDatabase() {
  try {
    db = new Database(dbPath);
    
    // Включаем WAL режим для лучшей производительности
    db.pragma('journal_mode = WAL');
    
    // Создаем таблицу для анализов
    db.exec(`
      CREATE TABLE IF NOT EXISTS analyses (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        goal TEXT NOT NULL,
        criteria TEXT NOT NULL,
        alternatives TEXT NOT NULL,
        criteria_matrix TEXT NOT NULL,
        alternative_matrices TEXT NOT NULL,
        results TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_timestamp ON analyses(timestamp DESC);
    `);
    
    console.log('✅ База данных инициализирована:', dbPath);
    return db;
  } catch (error) {
    console.error('❌ Ошибка инициализации базы данных:', error);
    throw error;
  }
}

/**
 * Сохранить анализ в базу данных
 */
export function saveAnalysis(analysis) {
  if (!db) {
    throw new Error('База данных не инициализирована');
  }
  
  const stmt = db.prepare(`
    INSERT INTO analyses (
      id, timestamp, goal, criteria, alternatives,
      criteria_matrix, alternative_matrices, results
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const id = analysis.id || `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = analysis.timestamp || Date.now();
  
  try {
    stmt.run(
      id,
      timestamp,
      analysis.goal,
      JSON.stringify(analysis.criteria),
      JSON.stringify(analysis.alternatives),
      JSON.stringify(analysis.criteriaMatrix),
      JSON.stringify(analysis.alternativeMatrices),
      analysis.results ? JSON.stringify(analysis.results) : null
    );
    
    return { id, timestamp };
  } catch (error) {
    console.error('Ошибка при сохранении анализа:', error);
    throw error;
  }
}

/**
 * Получить все анализы (с пагинацией)
 */
export function getAllAnalyses(limit = 50, offset = 0) {
  if (!db) {
    throw new Error('База данных не инициализирована');
  }
  
  const stmt = db.prepare(`
    SELECT 
      id, timestamp, goal, criteria, alternatives,
      criteria_matrix, alternative_matrices, results, created_at
    FROM analyses
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `);
  
  const rows = stmt.all(limit, offset);
  
  return rows.map(row => ({
    id: row.id,
    timestamp: row.timestamp,
    goal: row.goal,
    criteria: JSON.parse(row.criteria),
    alternatives: JSON.parse(row.alternatives),
    criteriaMatrix: JSON.parse(row.criteria_matrix),
    alternativeMatrices: JSON.parse(row.alternative_matrices),
    results: row.results ? JSON.parse(row.results) : null,
    createdAt: row.created_at
  }));
}

/**
 * Получить анализ по ID
 */
export function getAnalysisById(id) {
  if (!db) {
    throw new Error('База данных не инициализирована');
  }
  
  const stmt = db.prepare(`
    SELECT 
      id, timestamp, goal, criteria, alternatives,
      criteria_matrix, alternative_matrices, results, created_at
    FROM analyses
    WHERE id = ?
  `);
  
  const row = stmt.get(id);
  
  if (!row) {
    return null;
  }
  
  return {
    id: row.id,
    timestamp: row.timestamp,
    goal: row.goal,
    criteria: JSON.parse(row.criteria),
    alternatives: JSON.parse(row.alternatives),
    criteriaMatrix: JSON.parse(row.criteria_matrix),
    alternativeMatrices: JSON.parse(row.alternative_matrices),
    results: row.results ? JSON.parse(row.results) : null,
    createdAt: row.created_at
  };
}

/**
 * Удалить анализ по ID
 */
export function deleteAnalysis(id) {
  if (!db) {
    throw new Error('База данных не инициализирована');
  }
  
  const stmt = db.prepare('DELETE FROM analyses WHERE id = ?');
  const result = stmt.run(id);
  
  return result.changes > 0;
}

/**
 * Получить количество анализов
 */
export function getAnalysesCount() {
  if (!db) {
    throw new Error('База данных не инициализирована');
  }
  
  const stmt = db.prepare('SELECT COUNT(*) as count FROM analyses');
  const row = stmt.get();
  
  return row.count;
}

/**
 * Закрыть соединение с базой данных
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

// Инициализируем БД при импорте модуля
initDatabase();
