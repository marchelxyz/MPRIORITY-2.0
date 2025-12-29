/**
 * Утилиты для преобразования десятичных дробей в обыкновенные дроби
 */

/**
 * Находит наибольший общий делитель (НОД) двух чисел
 */
function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b !== 0) {
    const temp = b
    b = a % b
    a = temp
  }
  return a
}

/**
 * Преобразует десятичное число в обыкновенную дробь
 * @param decimal - десятичное число (например, 0.5)
 * @param maxDenominator - максимальный знаменатель (по умолчанию 100)
 * @returns строка вида "1/2" или исходное число, если преобразование невозможно
 */
export function decimalToFraction(decimal: number, maxDenominator: number = 100): string {
  // Если число целое, возвращаем его как есть
  if (Number.isInteger(decimal)) {
    return decimal.toString()
  }

  // Используем более мягкую точность для обработки округленных значений
  // (например, 0.333 для 1/3 или 0.667 для 2/3)
  const precision = 0.001
  const absDecimal = Math.abs(decimal)
  const isNegative = decimal < 0
  
  // Обрабатываем числа больше 1
  const wholePart = Math.floor(absDecimal)
  const fractionalPart = absDecimal - wholePart
  
  // Если дробная часть очень мала, возвращаем целое число
  if (fractionalPart < precision) {
    return (isNegative ? '-' : '') + wholePart.toString()
  }
  
  // Пробуем найти подходящую дробь методом подбора знаменателя
  let bestMatch: { numerator: number; denominator: number; error: number } | null = null
  
  for (let denominator = 1; denominator <= maxDenominator; denominator++) {
    const numerator = Math.round(fractionalPart * denominator)
    const calculated = numerator / denominator
    const error = Math.abs(fractionalPart - calculated)
    
    // Если нашли точное совпадение, используем его
    if (error < 1e-10) {
      const divisor = gcd(numerator, denominator)
      const simplifiedNumerator = numerator / divisor
      const simplifiedDenominator = denominator / divisor
      
      if (simplifiedDenominator === 1) {
        const result = wholePart + simplifiedNumerator
        return (isNegative ? '-' : '') + result.toString()
      }
      
      if (wholePart > 0) {
        return (isNegative ? '-' : '') + `${wholePart} ${simplifiedNumerator}/${simplifiedDenominator}`
      }
      
      return (isNegative ? '-' : '') + `${simplifiedNumerator}/${simplifiedDenominator}`
    }
    
    // Сохраняем лучшее приближение
    if (error < precision && (!bestMatch || error < bestMatch.error)) {
      bestMatch = { numerator, denominator, error }
    }
  }
  
  // Если нашли хорошее приближение, используем его
  if (bestMatch) {
    const divisor = gcd(bestMatch.numerator, bestMatch.denominator)
    const simplifiedNumerator = bestMatch.numerator / divisor
    const simplifiedDenominator = bestMatch.denominator / divisor
    
    if (simplifiedDenominator === 1) {
      const result = wholePart + simplifiedNumerator
      return (isNegative ? '-' : '') + result.toString()
    }
    
    if (wholePart > 0) {
      return (isNegative ? '-' : '') + `${wholePart} ${simplifiedNumerator}/${simplifiedDenominator}`
    }
    
    return (isNegative ? '-' : '') + `${simplifiedNumerator}/${simplifiedDenominator}`
  }
  
  // Если не удалось найти точную дробь, возвращаем округленное десятичное число
  return decimal.toFixed(3)
}

/**
 * Проверяет, можно ли преобразовать число в простую дробь
 * @param decimal - десятичное число
 * @param maxDenominator - максимальный знаменатель
 * @returns true, если число можно преобразовать в простую дробь
 */
export function canConvertToFraction(decimal: number, maxDenominator: number = 100): boolean {
  if (Number.isInteger(decimal)) {
    return true
  }
  
  const precision = 1e-10
  const absDecimal = Math.abs(decimal)
  
  for (let denominator = 1; denominator <= maxDenominator; denominator++) {
    const numerator = Math.round(absDecimal * denominator)
    const calculated = numerator / denominator
    
    if (Math.abs(absDecimal - calculated) < precision) {
      return true
    }
  }
  
  return false
}

/**
 * Преобразует строку с дробью в десятичное число
 * Поддерживает форматы: "1/4", "1 1/2", "0.25", "1"
 * @param fractionStr - строка с дробью (например, "1/4" или "0.25")
 * @returns десятичное число или null, если строка не может быть преобразована
 */
export function fractionToDecimal(fractionStr: string): number | null {
  if (!fractionStr || typeof fractionStr !== 'string') {
    return null
  }
  
  const trimmed = fractionStr.trim()
  
  // Пробуем распарсить как обычное десятичное число
  const decimalMatch = trimmed.match(/^-?\d+\.?\d*$/)
  if (decimalMatch) {
    const num = parseFloat(trimmed)
    if (!isNaN(num)) {
      return num
    }
  }
  
  // Пробуем распарсить как смешанную дробь (например, "1 1/2")
  const mixedMatch = trimmed.match(/^(-?\d+)\s+(-?\d+)\/(-?\d+)$/)
  if (mixedMatch) {
    const wholePart = parseInt(mixedMatch[1], 10)
    const numerator = parseInt(mixedMatch[2], 10)
    const denominator = parseInt(mixedMatch[3], 10)
    
    if (denominator !== 0 && !isNaN(wholePart) && !isNaN(numerator) && !isNaN(denominator)) {
      return wholePart + (numerator / denominator)
    }
  }
  
  // Пробуем распарсить как простую дробь (например, "1/4")
  const fractionMatch = trimmed.match(/^(-?\d+)\/(-?\d+)$/)
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1], 10)
    const denominator = parseInt(fractionMatch[2], 10)
    
    if (denominator !== 0 && !isNaN(numerator) && !isNaN(denominator)) {
      return numerator / denominator
    }
  }
  
  return null
}
