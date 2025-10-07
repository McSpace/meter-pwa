# Supabase Backend для Health Dashboard

## 🎯 Быстрый старт

### 1. Применить миграции

Откройте Supabase Dashboard → SQL Editor и выполните по порядку:

1. `migrations/001_initial_schema.sql` - создание таблиц
2. `migrations/002_row_level_security.sql` - настройка безопасности
3. `migrations/003_storage_setup.sql` - создание storage buckets

### 2. Настроить Auth

**Authentication → Providers**:
- ✅ Email (уже включен)
- ✅ Google OAuth ([инструкции в SETUP.md](./SETUP.md#22-google-oauth-provider))

**URL Configuration**:
```
Site URL: https://meter-pwa-production.up.railway.app
Redirect URLs:
  - https://meter-pwa-production.up.railway.app/auth/callback
  - http://localhost:5173/auth/callback
```

### 3. Создать .env.local

```bash
cp .env.example .env.local
```

Заполните значениями из **Settings → API**:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

### 4. Установить Supabase клиент

```bash
npm install @supabase/supabase-js
```

---

## 📁 Структура файлов

```
supabase/
├── README.md                  # Этот файл
├── SETUP.md                   # Полная инструкция
└── migrations/
    ├── 001_initial_schema.sql       # Таблицы
    ├── 002_row_level_security.sql   # RLS политики
    └── 003_storage_setup.sql        # Storage buckets
```

---

## 📚 Документация

- **[SETUP.md](./SETUP.md)** - подробная инструкция по настройке
- **[BACKEND_SUPABASE.md](../BACKEND_SUPABASE.md)** - API reference и примеры кода
- **[BACKEND_SPEC.md](../BACKEND_SPEC.md)** - оригинальная спецификация (для справки)

---

## 🔍 Проверка установки

После применения миграций:

```sql
-- Проверить таблицы
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- Должны быть: users, profiles, metrics, media

-- Проверить Storage buckets
SELECT * FROM storage.buckets;
-- Должны быть: photos, audio
```

---

## 🚀 Следующие шаги

1. ✅ Применить миграции
2. ✅ Настроить Auth providers
3. ⬜ Создать Supabase client в frontend
4. ⬜ Реализовать auth flow
5. ⬜ Обновить компоненты для работы с API

См. [BACKEND_SUPABASE.md](../BACKEND_SUPABASE.md) для примеров кода.
