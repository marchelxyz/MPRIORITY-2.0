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
    // Проверка на деление на ноль
    if (priorities[i] === 0 || !isFinite(priorities[i])) {
      continue;
    }
    
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
  // Для матриц размером 1 или 2 CI не вычисляется
  if (n <= 2) {
    return 0;
  }
  return (lambdaMax - n) / (n - 1);
}

/**
 * Вычисляет отношение согласованности (CR)
 * @param {number} ci - Индекс согласованности
 * @param {number} n - Размерность матрицы
 * @returns {object} - Отношение согласованности и флаг применимости
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
  
  // Для матриц размером меньше 3 согласованность не проверяется
  if (n < 3 || ri === 0) {
    return {
      cr: 0,
      isApplicable: false
    };
  }
  
  return {
    cr: ci / ri,
    isApplicable: true
  };
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
  const crResult = calculateCR(ci, n);
  
  // Для матриц размером меньше 3 согласованность не проверяется
  const cr = crResult.cr || 0;
  const isApplicable = crResult.isApplicable !== false;
  
  return {
    priorities,
    lambdaMax,
    ci,
    cr,
    isConsistent: isApplicable ? cr < 0.1 : true, // Для матриц < 3x3 всегда согласованы
    isApplicable, // Флаг применимости проверки согласованности
    n
  };
}

/**
 * Вычисляет глобальные приоритеты для многоуровневой иерархии
 * @param {object} hierarchy - Многоуровневая иерархия
 * @param {object} matrices - Матрицы сравнения для всех уровней
 * @returns {object} - Глобальные приоритеты и детальная информация
 */
export function calculateGlobalPriorities(hierarchy, criteriaMatrix, alternativeMatrices) {
  // Проверяем, является ли это многоуровневой иерархией
  if (hierarchy.levels && Array.isArray(hierarchy.levels)) {
    return calculateMultiLevelPriorities(hierarchy, criteriaMatrix, alternativeMatrices);
  }
  
  // Старая логика для обратной совместимости (3 уровня)
  return calculateThreeLevelPriorities(hierarchy, criteriaMatrix, alternativeMatrices);
}

/**
 * Вычисляет глобальные приоритеты для классической 3-уровневой иерархии
 * @param {object} hierarchy - Иерархия с критериями и альтернативами
 * @param {number[][]} criteriaMatrix - Матрица сравнения критериев
 * @param {number[][][]} alternativeMatrices - Матрицы сравнения альтернатив по каждому критерию
 * @returns {object} - Глобальные приоритеты и детальная информация
 */
function calculateThreeLevelPriorities(hierarchy, criteriaMatrix, alternativeMatrices) {
  // Валидация входных данных
  if (!hierarchy || !hierarchy.criteria || !hierarchy.alternatives) {
    throw new Error('Неверная структура иерархии');
  }
  
  if (!criteriaMatrix || criteriaMatrix.length !== hierarchy.criteria.length) {
    throw new Error(`Несоответствие размеров: критериев ${hierarchy.criteria.length}, матрицы критериев ${criteriaMatrix?.length || 0}`);
  }
  
  if (!alternativeMatrices || alternativeMatrices.length !== hierarchy.criteria.length) {
    throw new Error(`Несоответствие размеров: критериев ${hierarchy.criteria.length}, матриц альтернатив ${alternativeMatrices?.length || 0}`);
  }
  
  // Приоритеты критериев
  const criteriaConsistency = checkConsistency(criteriaMatrix);
  const criteriaPriorities = criteriaConsistency.priorities;
  
  // Проверка, что приоритеты критериев нормализованы (сумма = 1)
  const criteriaSum = criteriaPriorities.reduce((sum, p) => sum + p, 0);
  if (Math.abs(criteriaSum - 1.0) > 0.01) {
    console.warn(`Предупреждение: сумма приоритетов критериев = ${criteriaSum}, ожидается 1.0`);
  }
  
  // Приоритеты альтернатив по каждому критерию
  const alternativePrioritiesByCriteria = alternativeMatrices.map((matrix, idx) => {
    if (!matrix || matrix.length !== hierarchy.alternatives.length) {
      throw new Error(`Несоответствие размеров матрицы альтернатив для критерия ${hierarchy.criteria[idx]}: альтернатив ${hierarchy.alternatives.length}, матрицы ${matrix?.length || 0}`);
    }
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

/**
 * Вычисляет глобальные приоритеты для многоуровневой иерархии (рекурсивно)
 * @param {object} hierarchy - Многоуровневая иерархия с уровнями
 * @param {object} matrices - Матрицы сравнения для всех уровней
 * @returns {object} - Глобальные приоритеты и детальная информация
 */
function calculateMultiLevelPriorities(hierarchy, criteriaMatrix, alternativeMatrices) {
  if (!hierarchy || !hierarchy.levels || !Array.isArray(hierarchy.levels)) {
    throw new Error('Неверная структура многоуровневой иерархии');
  }
  
  const levels = hierarchy.levels;
  if (levels.length < 2) {
    throw new Error('Иерархия должна содержать минимум 2 уровня');
  }
  
  // Используем переданные матрицы напрямую (они уже в правильном формате)
  const allMatrices = criteriaMatrix || {};
  
  // Рекурсивно вычисляем приоритеты снизу вверх
  const result = calculatePrioritiesRecursive(levels, allMatrices, 0);
  
  // Преобразуем результат в формат, совместимый с классической структурой
  return {
    criteriaConsistency: result.consistency || { cr: 0, ci: 0, isConsistent: true },
    alternativeConsistencies: result.consistencies || [],
    globalPriorities: result.globalPriorities || [],
    alternativePrioritiesByCriteria: result.prioritiesByParent || [],
    criteriaPriorities: result.priorities || []
  };
}


/**
 * Рекурсивно вычисляет приоритеты для многоуровневой иерархии
 */
function calculatePrioritiesRecursive(levels, matrices, currentLevelIndex) {
  const currentLevel = levels[currentLevelIndex];
  const isLastLevel = currentLevelIndex === levels.length - 1;
  
  if (isLastLevel) {
    // Последний уровень - это альтернативы, возвращаем их приоритеты
    const levelMatrices = matrices[`level-${currentLevelIndex}`] || [];
    const parentLevel = levels[currentLevelIndex - 1];
    
    if (!Array.isArray(levelMatrices) || levelMatrices.length !== parentLevel.items.length) {
      throw new Error(`Несоответствие количества матриц для уровня ${currentLevelIndex}: ожидается ${parentLevel.items.length}, получено ${Array.isArray(levelMatrices) ? levelMatrices.length : 'не массив'}`);
    }
    
    const prioritiesByParent = levelMatrices.map((matrix, parentIdx) => {
      if (!matrix || !Array.isArray(matrix) || matrix.length !== currentLevel.items.length) {
        throw new Error(`Несоответствие размеров матрицы для родителя ${parentIdx} уровня ${currentLevelIndex}: ожидается ${currentLevel.items.length}x${currentLevel.items.length}, получено ${matrix ? (Array.isArray(matrix) ? `${matrix.length}x${matrix[0]?.length || 0}` : 'не массив') : 'null'}`);
      }
      const consistency = checkConsistency(matrix);
      return {
        priorities: consistency.priorities,
        consistency: consistency
      };
    });
    
    return {
      levelIndex: currentLevelIndex,
      items: currentLevel.items,
      prioritiesByParent: prioritiesByParent.map(p => p.priorities),
      consistencies: prioritiesByParent.map(p => p.consistency),
      globalPriorities: null // Будет вычислено на верхнем уровне
    };
  }
  
  // Промежуточный уровень - рекурсивно вычисляем приоритеты для дочерних уровней
  const childResult = calculatePrioritiesRecursive(levels, matrices, currentLevelIndex + 1);
  
  // Получаем матрицу сравнения для текущего уровня
  const levelMatrix = matrices[`level-${currentLevelIndex}`];
  if (!levelMatrix || !Array.isArray(levelMatrix) || levelMatrix.length !== currentLevel.items.length) {
    throw new Error(`Несоответствие размеров матрицы для уровня ${currentLevelIndex}: ожидается ${currentLevel.items.length}x${currentLevel.items.length}, получено ${levelMatrix ? (Array.isArray(levelMatrix) ? `${levelMatrix.length}x${levelMatrix[0]?.length || 0}` : 'не массив') : 'null'}`);
  }
  
  const levelConsistency = checkConsistency(levelMatrix);
  const levelPriorities = levelConsistency.priorities;
  
  // Вычисляем глобальные приоритеты для дочерних элементов
  const childItems = childResult.items;
  const globalPriorities = new Array(childItems.length).fill(0);
  
  // Умножаем приоритеты текущего уровня на приоритеты дочерних элементов
  for (let i = 0; i < childItems.length; i++) {
    for (let j = 0; j < levelPriorities.length; j++) {
      if (childResult.prioritiesByParent && childResult.prioritiesByParent[j] && childResult.prioritiesByParent[j][i] !== undefined) {
        globalPriorities[i] += levelPriorities[j] * childResult.prioritiesByParent[j][i];
      }
    }
  }
  
  // Создаем результат с ранжированием
  const rankedItems = childItems.map((item, index) => ({
    name: item,
    priority: globalPriorities[index],
    rank: 0
  }));
  
  rankedItems.sort((a, b) => b.priority - a.priority);
  rankedItems.forEach((item, index) => {
    item.rank = index + 1;
  });
  
  return {
    levelIndex: currentLevelIndex,
    items: currentLevel.items,
    priorities: levelPriorities,
    consistency: levelConsistency,
    childResult: childResult,
    globalPriorities: rankedItems,
    prioritiesByParent: childResult.prioritiesByParent,
    consistencies: [levelConsistency, ...(childResult.consistencies || [])]
  };
}
