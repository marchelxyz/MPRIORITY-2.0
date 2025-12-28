/**
 * Gemini Provider с автоматическим fallback между версиями моделей
 * 
 * Порядок приоритета моделей:
 * 1. gemini-2.5-flash - самая новая и быстрая
 * 2. gemini-1.5-flash - быстрая и широко доступная
 * 3. gemini-1.5-pro - более мощная модель
 * 4. gemini-pro - legacy версия для совместимости
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Порядок приоритета моделей (от высшего к низшему)
const MODEL_PRIORITIES = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro'
];

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
   * Инициализирует провайдер, выбирая первую доступную модель
   * При инициализации просто создает объекты моделей без проверки доступности
   * Реальная проверка происходит при первом запросе
   */
  async initialize() {
    if (this.initialized && this.selectedModel) {
      return this.selectedModel;
    }

    console.log('Инициализация Gemini Provider...');
    
    // При инициализации просто выбираем первую модель из списка приоритетов
    // Реальная проверка доступности произойдет при первом запросе
    const firstModel = MODEL_PRIORITIES[0];
    this.selectedModel = this.genAI.getGenerativeModel({ model: firstModel });
    this.selectedModelName = firstModel;
    this.initialized = true;
    console.log(`✅ Инициализирована модель по умолчанию: ${firstModel}`);
    console.log(`ℹ️ При первом запросе будет выполнен автоматический fallback при необходимости`);
    
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

    // Пробуем инициализировать
    try {
      await this.initialize();
      return this.selectedModel;
    } catch (error) {
      // Если инициализация не удалась, пробуем еще раз при запросе
      console.log('Повторная попытка инициализации при запросе...');
      return await this.initializeWithFallback();
    }
  }

  /**
   * Инициализация с fallback - пробует все модели по порядку при запросе
   * Этот метод вызывается только если первая попытка использования модели не удалась
   */
  async initializeWithFallback() {
    console.log('Попытка инициализации с fallback...');
    
    // Пробуем все модели по порядку приоритета
    for (const modelName of MODEL_PRIORITIES) {
      try {
        console.log(`Попытка использования модели: ${modelName}`);
        const model = this.genAI.getGenerativeModel({ model: modelName });
        
        // Сохраняем модель (проверка доступности произойдет при реальном запросе)
        this.selectedModel = model;
        this.selectedModelName = modelName;
        this.initialized = true;
        console.log(`✅ Модель ${modelName} подготовлена для использования`);
        return model;
      } catch (error) {
        console.log(`❌ Ошибка при создании модели ${modelName}:`, error.message);
        continue;
      }
    }

    throw new Error('Не удалось создать ни одну из моделей Gemini. Проверьте API ключ.');
  }

  /**
   * Генерирует контент с автоматическим fallback между моделями
   */
  async generateContent(prompt) {
    let lastError = null;

    // Если модель уже выбрана, пробуем использовать её
    if (this.selectedModel && this.initialized) {
      try {
        const result = await this.selectedModel.generateContent(prompt);
        const response = await result.response;
        return {
          text: response.text(),
          model: this.selectedModelName
        };
      } catch (error) {
        console.log(`Ошибка при использовании модели ${this.selectedModelName}:`, error.message);
        lastError = error;
        // Сбрасываем выбранную модель и пробуем другую
        this.selectedModel = null;
        this.selectedModelName = null;
        this.initialized = false;
      }
    }

    // Пробуем все модели по порядку
    for (const modelName of MODEL_PRIORITIES) {
      try {
        console.log(`Попытка генерации с моделью: ${modelName}`);
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        // Сохраняем успешную модель для следующих запросов
        this.selectedModel = model;
        this.selectedModelName = modelName;
        this.initialized = true;
        
        console.log(`✅ Успешная генерация с моделью: ${modelName}`);
        return {
          text: response.text(),
          model: modelName
        };
      } catch (error) {
        console.log(`❌ Ошибка с моделью ${modelName}:`, error.message);
        lastError = error;
        continue;
      }
    }

    // Если все модели не сработали
    throw lastError || new Error('Не удалось сгенерировать контент ни с одной из моделей');
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
