/**
 * Реализация алгоритма анализа иерархий (AHP)
 * Метод Саати для расчета приоритетов
 */

/**
 * Вычисляет собственный вектор матрицы парных сравнений
 * @param {number[][]} matrix - Матрица парных сравнений
 * @returns {number[]} - Вектор приоритетов (нормализованный)
 */
export function calculatePriorities(matrix) {
  const n = matrix.length;
  
  // Вычисляем геометрическое среднее для каждой строки
  const geometricMeans = matrix.map(row => {
    const product = row.reduce((acc, val) => acc * val, 1);
    return Math.pow(product, 1 / n);
  });
  
  // Сумма всех геометрических средних
  const sum = geometricMeans.reduce((acc, val) => acc + val, 0);
  
  // Нормализация (приоритеты)
  const priorities = geometricMeans.map(gm => gm / sum);
  
  return priorities;
}

/**
 * Вычисляет максимальное собственное значение матрицы
 * @param {number[][]} matrix - Матрица парных сравнений
 * @param {number[]} priorities - Вектор приоритетов
 * @returns {number} - Максимальное собственное значение
 */
export function calculateLambdaMax(matrix, priorities) {
  const n = matrix.length;
  let lambdaMax = 0;
  
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += matrix[i][j] * priorities[j];
    }
    lambdaMax += sum / priorities[i];
  }
  
  return lambdaMax / n;
}

/**
 * Вычисляет индекс согласованности (CI)
 * @param {number} lambdaMax - Максимальное собственное значение
 * @param {number} n - Размерность матрицы
 * @returns {number} - Индекс согласованности
 */
export function calculateCI(lambdaMax, n) {
  return (lambdaMax - n) / (n - 1);
}

/**
 * Вычисляет отношение согласованности (CR)
 * @param {number} ci - Индекс согласованности
 * @param {number} n - Размерность матрицы
 * @returns {number} - Отношение согласованности
 */
export function calculateCR(ci, n) {
  // Случайные индексы согласованности (RI) для разных размерностей
  const RI = {
    1: 0,
    2: 0,
    3: 0.58,
    4: 0.90,
    5: 1.12,
    6: 1.24,
    7: 1.32,
    8: 1.41,
    9: 1.45,
    10: 1.49,
    11: 1.51,
    12: 1.48,
    13: 1.56,
    14: 1.57,
    15: 1.59
  };
  
  const ri = RI[n] || 1.6;
  return ri === 0 ? 0 : ci / ri;
}

/**
 * Проверяет согласованность матрицы
 * @param {number[][]} matrix - Матрица парных сравнений
 * @returns {object} - Результаты проверки согласованности
 */
export function checkConsistency(matrix) {
  const priorities = calculatePriorities(matrix);
  const lambdaMax = calculateLambdaMax(matrix, priorities);
  const n = matrix.length;
  const ci = calculateCI(lambdaMax, n);
  const cr = calculateCR(ci, n);
  
  return {
    priorities,
    lambdaMax,
    ci,
    cr,
    isConsistent: cr < 0.1, // CR < 10% считается приемлемым
    n
  };
}

/**
 * Вычисляет глобальные приоритеты альтернатив
 * @param {object} hierarchy - Иерархия с критериями и альтернативами
 * @param {number[][]} criteriaMatrix - Матрица сравнения критериев
 * @param {number[][][]} alternativeMatrices - Матрицы сравнения альтернатив по каждому критерию
 * @returns {object} - Глобальные приоритеты и детальная информация
 */
export function calculateGlobalPriorities(hierarchy, criteriaMatrix, alternativeMatrices) {
  // Приоритеты критериев
  const criteriaConsistency = checkConsistency(criteriaMatrix);
  const criteriaPriorities = criteriaConsistency.priorities;
  
  // Приоритеты альтернатив по каждому критерию
  const alternativePrioritiesByCriteria = alternativeMatrices.map(matrix => {
    const consistency = checkConsistency(matrix);
    return {
      priorities: consistency.priorities,
      consistency: consistency
    };
  });
  
  // Вычисление глобальных приоритетов
  const alternatives = hierarchy.alternatives;
  const globalPriorities = new Array(alternatives.length).fill(0);
  
  for (let i = 0; i < alternatives.length; i++) {
    for (let j = 0; j < criteriaPriorities.length; j++) {
      globalPriorities[i] += criteriaPriorities[j] * alternativePrioritiesByCriteria[j].priorities[i];
    }
  }
  
  // Создаем результат с ранжированием
  const rankedAlternatives = alternatives.map((alt, index) => ({
    name: alt,
    priority: globalPriorities[index],
    rank: 0
  }));
  
  // Сортируем по приоритету
  rankedAlternatives.sort((a, b) => b.priority - a.priority);
  
  // Присваиваем ранги
  rankedAlternatives.forEach((alt, index) => {
    alt.rank = index + 1;
  });
  
  return {
    criteriaConsistency,
    alternativeConsistencies: alternativePrioritiesByCriteria.map(ap => ap.consistency),
    globalPriorities: rankedAlternatives,
    alternativePrioritiesByCriteria: alternativePrioritiesByCriteria.map(ap => ap.priorities),
    criteriaPriorities
  };
}
