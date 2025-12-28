# MPRIORITY 2.0 Backend

Express API сервер для расчетов метода анализа иерархий (AHP).

## API Endpoints

### GET `/health`
Проверка работоспособности сервера

### POST `/api/check-consistency`
Проверка согласованности матрицы парных сравнений

**Request Body:**
```json
{
  "matrix": [[1, 2, 3], [0.5, 1, 2], [0.33, 0.5, 1]]
}
```

**Response:**
```json
{
  "priorities": [0.539, 0.297, 0.164],
  "lambdaMax": 3.009,
  "ci": 0.005,
  "cr": 0.008,
  "isConsistent": true,
  "n": 3
}
```

### POST `/api/calculate-global-priorities`
Расчет глобальных приоритетов альтернатив

**Request Body:**
```json
{
  "hierarchy": {
    "goal": "Выбор ноутбука",
    "criteria": ["Цена", "Производительность", "Вес"],
    "alternatives": ["Модель A", "Модель B", "Модель C"]
  },
  "criteriaMatrix": [[1, 2, 3], [0.5, 1, 2], [0.33, 0.5, 1]],
  "alternativeMatrices": [
    [[1, 2, 3], [0.5, 1, 2], [0.33, 0.5, 1]],
    [[1, 0.5, 0.33], [2, 1, 0.5], [3, 2, 1]],
    [[1, 3, 2], [0.33, 1, 0.5], [0.5, 2, 1]]
  ]
}
```

## Установка и запуск

```bash
npm install
npm start
```

Сервер запустится на порту, указанном в переменной окружения `PORT` (по умолчанию 3001).
