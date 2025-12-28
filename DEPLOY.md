# Инструкция по развертыванию MPRIORITY 2.0

## Backend (Railway)

1. Зайдите на [Railway.app](https://railway.app)
2. Создайте новый проект
3. Подключите репозиторий GitHub
4. Выберите папку `backend` как корневую директорию проекта
5. Railway автоматически определит Node.js проект
6. Установите переменную окружения `PORT` (Railway обычно делает это автоматически)
7. После деплоя скопируйте URL вашего приложения (например: `https://your-app.up.railway.app`)

## Frontend (Vercel)

1. Зайдите на [Vercel.com](https://vercel.com)
2. Импортируйте ваш GitHub репозиторий
3. В настройках проекта:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. Добавьте переменную окружения:
   - `NEXT_PUBLIC_API_URL` = URL вашего Railway приложения (например: `https://your-app.up.railway.app`)
5. Обновите `frontend/vercel.json` - замените `your-railway-app.up.railway.app` на ваш реальный Railway URL
6. Деплой произойдет автоматически

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
npm run dev
# Приложение запустится на http://localhost:3000
```

Убедитесь, что переменная окружения `NEXT_PUBLIC_API_URL` в `.env.local` указывает на ваш локальный backend:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```
