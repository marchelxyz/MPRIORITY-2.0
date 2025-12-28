/**
 * Gemini Provider - использует только gemini-2.5-flash для анализа результатов
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Используемая модель
const MODEL_NAME = 'gemini-2.5-flash';

class GeminiProvider {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY не установлен');
    }
    
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.selectedModel = null;
    this.selectedModelName = null;
    this.initialized = false;
  }

  /**
   * Инициализирует провайдер с моделью gemini-2.5-flash
   */
  async initialize() {
    if (this.initialized && this.selectedModel) {
      return this.selectedModel;
    }

    console.log('Инициализация Gemini Provider...');
    
    this.selectedModel = this.genAI.getGenerativeModel({ model: MODEL_NAME });
    this.selectedModelName = MODEL_NAME;
    this.initialized = true;
    console.log(`✅ Инициализирована модель: ${MODEL_NAME}`);
    
    return this.selectedModel;
  }

  /**
   * Получает модель, инициализируя провайдер если необходимо
   */
  async getModel() {
    // Если модель уже выбрана, возвращаем её
    if (this.selectedModel && this.initialized) {
      return this.selectedModel;
    }

    // Инициализируем модель
    await this.initialize();
    return this.selectedModel;
  }

  /**
   * Генерирует контент используя модель gemini-2.5-flash
   */
  async generateContent(prompt) {
    // Убеждаемся, что модель инициализирована
    if (!this.selectedModel || !this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`Генерация контента с моделью: ${MODEL_NAME}`);
      const result = await this.selectedModel.generateContent(prompt);
      const response = await result.response;
      
      console.log(`✅ Успешная генерация с моделью: ${MODEL_NAME}`);
      return {
        text: response.text(),
        model: MODEL_NAME
      };
    } catch (error) {
      console.error(`❌ Ошибка при генерации контента с моделью ${MODEL_NAME}:`, error.message);
      throw new Error(`Ошибка при генерации контента: ${error.message}. Проверьте настройку GEMINI_API_KEY и доступность модели ${MODEL_NAME}.`);
    }
  }

  /**
   * Получает имя текущей выбранной модели
   */
  getSelectedModelName() {
    return this.selectedModelName || 'не выбрана';
  }
}

// Создаем singleton instance
let geminiProviderInstance = null;

/**
 * Получает или создает экземпляр GeminiProvider
 */
export function getGeminiProvider() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY не установлен в переменных окружения');
  }

  if (!geminiProviderInstance) {
    geminiProviderInstance = new GeminiProvider(apiKey);
  }

  return geminiProviderInstance;
}

export default GeminiProvider;
