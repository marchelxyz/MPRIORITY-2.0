/**
 * Утилиты для сокращения текста через API
 */

/**
 * Получить URL API
 */
function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
}

/**
 * Сократить текст до 1-4 слов через API
 */
export async function shortenText(text: string): Promise<string> {
  if (!text || text.trim() === '') {
    return ''
  }

  // Если текст уже короткий (до 4 слов), возвращаем его как есть
  const words = text.trim().split(/\s+/)
  if (words.length <= 4) {
    return text.trim().toUpperCase()
  }

  try {
    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/api/shorten-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      throw new Error('Ошибка при сокращении текста')
    }

    const data = await response.json()
    return data.shortened || text.trim().toUpperCase()
  } catch (error) {
    console.error('Ошибка при сокращении текста:', error)
    // В случае ошибки возвращаем первые 4 слова
    const words = text.trim().split(/\s+/).slice(0, 4)
    return words.join(' ').toUpperCase()
  }
}

/**
 * Debounce функция для задержки выполнения
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}
