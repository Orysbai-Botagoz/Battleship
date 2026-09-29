# Морской Бой — Strong Level

Полноценное full-stack веб-приложение игры «Морской Бой» с продвинутым AI, авторизацией и сохранением прогресса между устройствами.

## Step 1 (готово)

- Next.js (App Router) + TypeScript + Tailwind CSS.
- Подготовлена архитектура для Supabase Auth + Postgres.
- Добавлены ключевые типы игры: сетка, корабли, ходы, AI state, состояние матча.
- Добавлена SQL-схема таблиц и RLS-политики.

## Step 2 (готово)

- Реализовано ядро поля 10x10: создание доски, выстрел, проверка победы.
- Реализована валидация и расстановка кораблей без пересечений и касаний (включая диагональ).
- Добавлена случайная расстановка полного флота по классическим правилам.
- Реализованы AI стратегии:
   - Easy: случайный выстрел по валидной клетке.
   - Medium: Hunt + Target режим после попадания.
   - Hard: Probability Density Map + target tracking до уничтожения.
- Добавлены sanity-check функции для быстрой проверки логики.

## Step 3 (готово)

- Добавлен `ShipPlacementBoard`:
   - Ручная расстановка по тапу
   - Поворот корабля
   - Авторасстановка
   - Очистка поля
- Добавлен `BattleBoard`:
   - Интерактивная атака по полю противника
   - Индикаторы хода (`Твой ход` / `ИИ думает`)
   - Анимированные попадания/промахи
   - Панель потопленных кораблей
   - История ходов
- Интерфейс реализован в mobile-first стиле с адаптацией до малых экранов.

## Стек

- Frontend: Next.js, React, Tailwind CSS
- Backend: Next.js server runtime + Supabase
- DB: PostgreSQL (Supabase)
- Типизация: TypeScript

## Структура

- src/app — маршруты и UI-слой
- src/types — типы игры и БД
- src/lib/game — базовые константы игрового движка
- src/lib/supabase — клиент Supabase (browser/server)
- supabase/schema.sql — схема таблиц и политики

## Запуск локально

1. Установить Node.js 20+
2. Установить зависимости:

   npm install

3. Создать `.env.local` на основе `.env.example` и заполнить значения.
4. Запустить dev-сервер:

   npm run dev

## Переменные окружения

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (опционально)

## Что дальше

- Step 2: Реализация ядра игры и AI Easy/Medium/Hard.
- Step 3: UI полей расстановки/боя и mobile-first UX.
- Step 4: Auth + auto-save + dashboard статистики.