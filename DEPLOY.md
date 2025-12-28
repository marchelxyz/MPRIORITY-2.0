# Инструкция по развертыванию MPRIORITY 2.0

## Структура проекта

- `backend/` - Express API сервер (деплой на **Railway**)
- `frontend/` - Next.js веб-приложение (деплой на **Vercel**)

## 1. Деплой Backend на Railway

1. Зайдите на [Railway.app](https://railway.app) и войдите через GitHub
2. Нажмите **"New Project"** → **"Deploy from GitHub repo"**
3. Выберите ваш репозиторий с MPRIORITY-2.0
4. В настройках проекта:
   - **Root Directory**: `backend`
   - Railway автоматически определит Node.js проект
5. Railway автоматически установит зависимости и запустит сервер
6. После деплоя Railway предоставит URL (например: `https://your-app.up.railway.app`)
7. **Скопируйте этот URL** - он понадобится для фронтенда

### Переменные окружения Railway

Railway автоматически установит `PORT`. Дополнительные переменные не требуются.

## 2. Деплой Frontend на Vercel

1. Зайдите на [Vercel.com](https://vercel.com) и войдите через GitHub
2. Нажмите **"Add New..."** → **"Project"**
3. Импортируйте ваш GitHub репозиторий
4. В настройках проекта:
   - **Root Directory**: `frontend` (важно!)
   - **Framework Preset**: Next.js (определится автоматически)
   - **Build Command**: `npm run build` (по умолчанию)
   - **Output Directory**: `.next` (по умолчанию)
5. Добавьте переменную окружения:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: URL вашего Railway приложения (например: `https://your-app.up.railway.app`)
6. Нажмите **"Deploy"**
7. После деплоя Vercel предоставит URL вашего приложения

## 3. Проверка работы

1. Откройте URL вашего Vercel приложения
2. Убедитесь, что приложение загружается
3. Попробуйте создать новый анализ - все должно работать

## Локальная разработка

### Backend
```bash
cd backend
npm install
npm start
# Сервер запустится на http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
# Создайте файл .env.local с содержимым:
# NEXT_PUBLIC_API_URL=http://localhost:3001
npm run dev
# Приложение запустится на http://localhost:3000
```

## Важные замечания

- ✅ Backend и Frontend - это **отдельные папки** для раздельного деплоя
- ✅ Railway деплоит только `backend/`
- ✅ Vercel деплоит только `frontend/`
- ✅ Не забудьте указать правильный `Root Directory` в настройках каждого сервиса
- ✅ Переменная окружения `NEXT_PUBLIC_API_URL` должна содержать полный URL Railway backend (с `https://`)

## Troubleshooting

### Backend не запускается на Railway
- Проверьте, что Root Directory установлен в `backend`
- Убедитесь, что `package.json` находится в папке `backend/`
- Проверьте логи в Railway dashboard

### Frontend не может подключиться к Backend
- Проверьте переменную окружения `NEXT_PUBLIC_API_URL` в Vercel
- Убедитесь, что URL начинается с `https://`
- Проверьте, что Railway backend доступен (откройте URL в браузере, должен быть ответ от `/health`)
