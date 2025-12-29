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
  
  // Вычисляем глобальные приоритеты альтернатив (последнего уровня)
  // Альтернативы находятся на последнем уровне иерархии
  const lastLevelIndex = levels.length - 1;
  const alternatives = levels[lastLevelIndex].items;
  
  // Находим результат для уровня перед альтернативами
  let levelBeforeAlternatives = result;
  while (levelBeforeAlternatives.childResult && levelBeforeAlternatives.childResult.levelIndex < lastLevelIndex) {
    levelBeforeAlternatives = levelBeforeAlternatives.childResult;
  }
  
  // Вычисляем глобальные приоритеты альтернатив
  // Используем приоритеты уровня 0 и рекурсивно вычисляем через все промежуточные уровни
  const globalPrioritiesForAlternatives = new Array(alternatives.length).fill(0);
  
  // Получаем приоритеты уровня 0
  const level0Priorities = result.priorities || [];
  
  // Для каждого элемента уровня 0 вычисляем глобальные приоритеты альтернатив
  for (let level0Idx = 0; level0Idx < level0Priorities.length; level0Idx++) {
    const level0Priority = level0Priorities[level0Idx];
    
    // Получаем приоритеты элементов уровня 1 относительно уровня 0
    const level1Result = result.childResult;
    if (level1Result && level1Result.prioritiesByParent && level1Result.prioritiesByParent[level0Idx]) {
      const level1Priorities = level1Result.prioritiesByParent[level0Idx];
      
      // Для каждого элемента уровня 1 вычисляем глобальные приоритеты альтернатив
      for (let level1Idx = 0; level1Idx < level1Priorities.length; level1Idx++) {
        const level1Priority = level1Priorities[level1Idx];
        
        // Получаем приоритеты альтернатив относительно элемента уровня 1
        const alternativesResult = level1Result.childResult;
        if (alternativesResult && alternativesResult.prioritiesByParent) {
          // Находим индекс элемента уровня 1 в глобальном списке
          // Элементы уровня 1 упорядочены по родителям
          const level1ItemsPerParent = Math.floor(level1Result.items.length / level0Priorities.length);
          const globalLevel1Idx = level0Idx * level1ItemsPerParent + level1Idx;
          
          if (alternativesResult.prioritiesByParent[globalLevel1Idx]) {
            const altPriorities = alternativesResult.prioritiesByParent[globalLevel1Idx];
            
            // Вычисляем глобальные приоритеты альтернатив
            for (let altIdx = 0; altIdx < alternatives.length; altIdx++) {
              if (altPriorities[altIdx] !== undefined) {
                globalPrioritiesForAlternatives[altIdx] += level0Priority * level1Priority * altPriorities[altIdx];
              }
            }
          }
        }
      }
    }
  }
  
  // Создаем ранжированный список альтернатив
  const rankedAlternatives = alternatives.map((alt, index) => ({
    name: alt,
    priority: globalPrioritiesForAlternatives[index] || 0,
    rank: 0
  }));
  
  rankedAlternatives.sort((a, b) => b.priority - a.priority);
  rankedAlternatives.forEach((alt, index) => {
    alt.rank = index + 1;
  });
  
  // Преобразуем результат в формат, совместимый с классической структурой
  return {
    criteriaConsistency: result.consistency || { cr: 0, ci: 0, isConsistent: true },
    alternativeConsistencies: result.consistencies || [],
    globalPriorities: rankedAlternatives,
    alternativePrioritiesByCriteria: result.prioritiesByParent || [],
    criteriaPriorities: result.priorities || []
  };
}


/**
 * Рекурсивно вычисляет приоритеты для многоуровневой иерархии
 * @param {Array} levels - Массив уровней иерархии
 * @param {Object} matrices - Объект с матрицами для каждого уровня
 * @param {number} currentLevelIndex - Индекс текущего уровня
 * @param {Array} parentGlobalPriorities - Глобальные приоритеты родительского уровня (для промежуточных уровней)
 */
function calculatePrioritiesRecursive(levels, matrices, currentLevelIndex, parentGlobalPriorities = null) {
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
  
  // Получаем матрицу/матрицы сравнения для текущего уровня
  const levelMatrixData = matrices[`level-${currentLevelIndex}`];
  
  let levelPriorities;
  let levelConsistency;
  let prioritiesByParent = null;
  let consistenciesByParent = null;
  
  if (currentLevelIndex === 0) {
    // Первый уровень (уровень 0) - одна матрица для сравнения всех элементов уровня
    if (!levelMatrixData || !Array.isArray(levelMatrixData) || levelMatrixData.length !== currentLevel.items.length) {
      throw new Error(`Несоответствие размеров матрицы для уровня ${currentLevelIndex}: ожидается ${currentLevel.items.length}x${currentLevel.items.length}, получено ${levelMatrixData ? (Array.isArray(levelMatrixData) ? `${levelMatrixData.length}x${levelMatrixData[0]?.length || 0}` : 'не массив') : 'null'}`);
    }
    // Проверяем, что это действительно матрица, а не массив матриц
    if (Array.isArray(levelMatrixData[0]) && typeof levelMatrixData[0][0] === 'number') {
      levelConsistency = checkConsistency(levelMatrixData);
      levelPriorities = levelConsistency.priorities;
    } else {
      throw new Error(`Неверный формат матрицы для уровня ${currentLevelIndex}: ожидается матрица ${currentLevel.items.length}x${currentLevel.items.length}`);
    }
  } else {
    // Промежуточные уровни (уровень 1 и выше) - массив матриц (по одной для каждого родителя)
    const parentLevel = levels[currentLevelIndex - 1];
    
    if (!levelMatrixData || !Array.isArray(levelMatrixData) || levelMatrixData.length !== parentLevel.items.length) {
      throw new Error(`Несоответствие количества матриц для уровня ${currentLevelIndex}: ожидается ${parentLevel.items.length}, получено ${Array.isArray(levelMatrixData) ? levelMatrixData.length : 'не массив'}`);
    }
    
    // Вычисляем приоритеты для каждой матрицы (для каждого родителя)
    // Размер матрицы должен соответствовать количеству дочерних элементов для данного родителя,
    // которое может быть меньше общего количества элементов уровня
    const prioritiesData = levelMatrixData.map((matrix, parentIdx) => {
      if (!matrix || !Array.isArray(matrix)) {
        throw new Error(`Неверный формат матрицы для родителя ${parentIdx} уровня ${currentLevelIndex}: получено ${matrix ? (typeof matrix) : 'null'}`);
      }
      
      // Проверяем, что матрица квадратная
      const matrixSize = matrix.length;
      if (matrixSize === 0 || !matrix[0] || matrix[0].length !== matrixSize) {
        throw new Error(`Неверный размер матрицы для родителя ${parentIdx} уровня ${currentLevelIndex}: получено ${matrixSize}x${matrix[0]?.length || 0}, ожидается квадратная матрица`);
      }
      
      // Размер матрицы должен быть положительным числом
      // (не проверяем равенство currentLevel.items.length, так как элементы могут быть распределены по родителям)
      const consistency = checkConsistency(matrix);
      return {
        priorities: consistency.priorities,
        consistency: consistency,
        matrixSize: matrixSize
      };
    });
    
    prioritiesByParent = prioritiesData.map(p => p.priorities);
    consistenciesByParent = prioritiesData.map(p => p.consistency);
    levelPriorities = null; // Не используется для промежуточных уровней
    levelConsistency = null; // Согласованность вычисляется для каждой матрицы отдельно
  }
  
  // Вычисляем глобальные приоритеты текущего уровня для передачи дочерним уровням
  let currentLevelGlobalPrioritiesForChild = null;
  if (currentLevelIndex === 0 && levelPriorities) {
    currentLevelGlobalPrioritiesForChild = levelPriorities;
  } else if (currentLevelIndex > 0 && prioritiesByParent && parentGlobalPriorities) {
    // Вычисляем глобальные приоритеты текущего уровня на основе приоритетов родителей
    currentLevelGlobalPrioritiesForChild = new Array(currentLevel.items.length).fill(0);
    const parentLevel = levels[currentLevelIndex - 1];
    
    for (let parentIdx = 0; parentIdx < parentLevel.items.length; parentIdx++) {
      const parentGlobalPriority = typeof parentGlobalPriorities[parentIdx] === 'object' 
        ? parentGlobalPriorities[parentIdx].priority 
        : parentGlobalPriorities[parentIdx];
      
      if (prioritiesByParent && prioritiesByParent[parentIdx]) {
        const relativePriorities = prioritiesByParent[parentIdx];
        for (let itemIdx = 0; itemIdx < currentLevel.items.length; itemIdx++) {
          currentLevelGlobalPrioritiesForChild[itemIdx] += parentGlobalPriority * relativePriorities[itemIdx];
        }
      }
    }
  }
  
  // Промежуточный уровень - рекурсивно вычисляем приоритеты для дочерних уровней
  const childResult = calculatePrioritiesRecursive(levels, matrices, currentLevelIndex + 1, currentLevelGlobalPrioritiesForChild);
  
  // Вычисляем глобальные приоритеты для дочерних элементов
  const childItems = childResult.items;
  let globalPriorities = new Array(childItems.length).fill(0);
  
  if (currentLevelIndex === 0) {
    // Для уровня 0 нужно вычислить глобальные приоритеты альтернатив (последнего уровня)
    // childResult содержит результаты для уровня 1, который является промежуточным
    // Нужно использовать глобальные приоритеты альтернатив из childResult.childResult
    if (childResult.childResult && childResult.childResult.globalPriorities) {
      // Используем уже вычисленные глобальные приоритеты альтернатив
      globalPriorities = childResult.childResult.globalPriorities.map(alt => alt.priority);
    } else {
      // Вычисляем глобальные приоритеты альтернатив на основе приоритетов уровня 0 и уровня 1
      // childResult.prioritiesByParent содержит приоритеты элементов уровня 1 относительно уровня 0
      // Но нам нужны приоритеты альтернатив относительно элементов уровня 1
      // Для этого нужно использовать childResult.childResult.prioritiesByParent
      const level1Result = childResult;
      const alternativesResult = level1Result.childResult;
      
      if (alternativesResult && alternativesResult.prioritiesByParent) {
        // Вычисляем глобальные приоритеты альтернатив
        const alternatives = alternativesResult.items;
        globalPriorities = new Array(alternatives.length).fill(0);
        
        // Для каждого элемента уровня 0
        let globalLevel1Idx = 0;
        for (let level0Idx = 0; level0Idx < levelPriorities.length; level0Idx++) {
          const level0Priority = levelPriorities[level0Idx];
          
          // Получаем приоритеты элементов уровня 1 относительно этого родителя уровня 0
          if (level1Result.prioritiesByParent && level1Result.prioritiesByParent[level0Idx]) {
            const level1RelativePriorities = level1Result.prioritiesByParent[level0Idx];
            
            // Для каждого элемента уровня 1, принадлежащего этому родителю уровня 0
            for (let level1RelativeIdx = 0; level1RelativeIdx < level1RelativePriorities.length; level1RelativeIdx++) {
              const level1Priority = level1RelativePriorities[level1RelativeIdx];
              
              // Получаем приоритеты альтернатив относительно этого элемента уровня 1
              if (alternativesResult.prioritiesByParent && alternativesResult.prioritiesByParent[globalLevel1Idx]) {
                const altPriorities = alternativesResult.prioritiesByParent[globalLevel1Idx];
                
                // Вычисляем глобальные приоритеты альтернатив
                for (let altIdx = 0; altIdx < alternatives.length; altIdx++) {
                  if (altPriorities[altIdx] !== undefined) {
                    globalPriorities[altIdx] += level0Priority * level1Priority * altPriorities[altIdx];
                  }
                }
              }
              
              globalLevel1Idx++;
            }
          }
        }
      } else {
        // Fallback: используем старую логику
        for (let i = 0; i < childItems.length; i++) {
          for (let j = 0; j < levelPriorities.length; j++) {
            if (childResult.prioritiesByParent && childResult.prioritiesByParent[j] && childResult.prioritiesByParent[j][i] !== undefined) {
              globalPriorities[i] += levelPriorities[j] * childResult.prioritiesByParent[j][i];
            }
          }
        }
      }
    }
  } else {
    // Для промежуточных уровней используем переданные глобальные приоритеты родителей
    // или вычисляем их рекурсивно, если они не переданы
    const parentLevel = levels[currentLevelIndex - 1];
    let currentLevelGlobalPriorities;
    
    // Вычисляем глобальные приоритеты элементов текущего уровня
    // Элементы могут быть распределены по родителям, поэтому нужно правильно их индексировать
    currentLevelGlobalPriorities = new Array(currentLevel.items.length).fill(0);
    
    // Получаем приоритеты родителей
    let parentPrioritiesArray = null;
    if (parentGlobalPriorities && Array.isArray(parentGlobalPriorities)) {
      parentPrioritiesArray = parentGlobalPriorities.map(p => 
        typeof p === 'object' ? p.priority : p
      );
    } else {
      // Если приоритеты родителей не переданы, вычисляем их рекурсивно
      const parentResult = calculatePrioritiesRecursive(levels, matrices, currentLevelIndex - 1);
      const parentGlobals = parentResult.globalPriorities || [];
      parentPrioritiesArray = parentGlobals.map(p => p?.priority || 0);
      if (parentPrioritiesArray.length === 0 && parentResult.priorities) {
        parentPrioritiesArray = parentResult.priorities;
      }
    }
    
    // Вычисляем глобальные приоритеты элементов текущего уровня
    // Предполагаем, что элементы упорядочены по родителям (сначала все элементы первого родителя, затем второго и т.д.)
    let itemOffset = 0;
    for (let parentIdx = 0; parentIdx < parentLevel.items.length; parentIdx++) {
      const parentGlobalPriority = parentPrioritiesArray[parentIdx] || 0;
      
      if (prioritiesByParent && prioritiesByParent[parentIdx]) {
        const relativePriorities = prioritiesByParent[parentIdx];
        const itemsForThisParent = relativePriorities.length;
        
        // Вычисляем глобальные приоритеты для элементов этого родителя
        for (let relativeIdx = 0; relativeIdx < itemsForThisParent; relativeIdx++) {
          const globalItemIdx = itemOffset + relativeIdx;
          if (globalItemIdx < currentLevelGlobalPriorities.length) {
            currentLevelGlobalPriorities[globalItemIdx] = parentGlobalPriority * relativePriorities[relativeIdx];
          }
        }
        
        itemOffset += itemsForThisParent;
      }
    }
    
    // Теперь вычисляем глобальные приоритеты дочерних элементов
    // Используем глобальные приоритеты элементов текущего уровня
    // childResult.prioritiesByParent[parentIdx][i] содержит приоритет i-го дочернего элемента относительно parentIdx-го родителя
    for (let i = 0; i < childItems.length; i++) {
      for (let parentIdx = 0; parentIdx < currentLevel.items.length; parentIdx++) {
        if (childResult.prioritiesByParent && childResult.prioritiesByParent[parentIdx] && childResult.prioritiesByParent[parentIdx][i] !== undefined) {
          const parentGlobalPriority = currentLevelGlobalPriorities[parentIdx] || 0;
          const childRelativePriority = childResult.prioritiesByParent[parentIdx][i];
          globalPriorities[i] += parentGlobalPriority * childRelativePriority;
        }
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
  
  // Вычисляем глобальные приоритеты элементов текущего уровня для возврата
  let currentLevelGlobalPriorities = null;
  if (currentLevelIndex === 0 && levelPriorities) {
    currentLevelGlobalPriorities = levelPriorities.map((p, idx) => ({
      name: currentLevel.items[idx],
      priority: p,
      rank: 0
    }));
  } else if (currentLevelIndex > 0 && prioritiesByParent && parentGlobalPriorities) {
    const parentLevel = levels[currentLevelIndex - 1];
    currentLevelGlobalPriorities = new Array(currentLevel.items.length).fill(0);
    
    for (let parentIdx = 0; parentIdx < parentLevel.items.length; parentIdx++) {
      const parentGlobalPriority = typeof parentGlobalPriorities[parentIdx] === 'object' 
        ? parentGlobalPriorities[parentIdx].priority 
        : parentGlobalPriorities[parentIdx];
      
      if (prioritiesByParent && prioritiesByParent[parentIdx]) {
        const relativePriorities = prioritiesByParent[parentIdx];
        for (let itemIdx = 0; itemIdx < currentLevel.items.length; itemIdx++) {
          currentLevelGlobalPriorities[itemIdx] += parentGlobalPriority * relativePriorities[itemIdx];
        }
      }
    }
    
    currentLevelGlobalPriorities = currentLevelGlobalPriorities.map((p, idx) => ({
      name: currentLevel.items[idx],
      priority: p,
      rank: 0
    }));
    currentLevelGlobalPriorities.sort((a, b) => b.priority - a.priority);
    currentLevelGlobalPriorities.forEach((item, index) => {
      item.rank = index + 1;
    });
  }
  
  return {
    levelIndex: currentLevelIndex,
    items: currentLevel.items,
    priorities: levelPriorities,
    consistency: levelConsistency,
    childResult: childResult,
    globalPriorities: rankedItems,
    prioritiesByParent: prioritiesByParent || childResult.prioritiesByParent,
    consistencies: [
      ...(levelConsistency ? [levelConsistency] : []),
      ...(consistenciesByParent || []),
      ...(childResult.consistencies || [])
    ]
  };
}
