# Supabase Setup Guide

Полная инструкция по настройке Supabase backend для Health Dashboard PWA.

## 📋 Требования

- Аккаунт Supabase (https://supabase.com)
- Созданный проект в Supabase
- Access Token: `sbp_4e3b3f1701d356232d618e0a324dc65a70bb2f38`

---

## 🚀 Шаг 1: Применение SQL Миграций

### Через Supabase Dashboard (SQL Editor)

1. Откройте ваш проект в Supabase Dashboard
2. Перейдите в **SQL Editor** (левое меню)
3. Нажмите **New Query**
4. Примените миграции в следующем порядке:

#### 1.1 Основная схема базы данных

Скопируйте содержимое файла `migrations/001_initial_schema.sql` и выполните:

```sql
-- Paste entire content of 001_initial_schema.sql
```

#### 1.2 Row Level Security политики

Скопируйте содержимое файла `migrations/002_row_level_security.sql` и выполните:

```sql
-- Paste entire content of 002_row_level_security.sql
```

#### 1.3 Storage buckets и политики

Скопируйте содержимое файла `migrations/003_storage_setup.sql` и выполните:

```sql
-- Paste entire content of 003_storage_setup.sql
```

### Через Supabase CLI (альтернатива)

```bash
# Установите Supabase CLI
npm install -g supabase

# Войдите в аккаунт
supabase login

# Свяжите локальный проект
supabase link --project-ref YOUR_PROJECT_REF

# Примените миграции
supabase db push
```

---

## 🔐 Шаг 2: Настройка Authentication

### 2.1 Email Provider (уже включен по умолчанию)

1. Перейдите в **Authentication** → **Providers**
2. Email provider должен быть уже включен
3. Настройте (опционально):
   - **Enable email confirmations**: ✅ (рекомендуется для продакшн)
   - **Enable email change confirmations**: ✅
   - Настройте email templates по желанию

### 2.2 Google OAuth Provider

1. Перейдите в **Authentication** → **Providers**
2. Найдите **Google** и нажмите **Enable**
3. Вам понадобится создать OAuth credentials в Google Cloud Console:

#### Создание Google OAuth Credentials:

1. Откройте [Google Cloud Console](https://console.cloud.google.com)
2. Создайте новый проект или выберите существующий
3. Перейдите в **APIs & Services** → **Credentials**
4. Нажмите **Create Credentials** → **OAuth 2.0 Client ID**
5. Если требуется, настройте OAuth consent screen:
   - **User Type**: External
   - **App name**: Health Dashboard
   - **User support email**: ваш email
   - **Authorized domains**: добавьте ваш домен
   - **Scopes**: `email`, `profile`, `openid`

6. Создайте OAuth Client ID:
   - **Application type**: Web application
   - **Name**: Health Dashboard Web
   - **Authorized JavaScript origins**:
     - `https://YOUR_PROJECT_REF.supabase.co`
     - `http://localhost:5173` (для разработки)
   - **Authorized redirect URIs**:
     - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
     - `http://localhost:54321/auth/v1/callback` (для локальной разработки)

7. Скопируйте **Client ID** и **Client Secret**

8. Вернитесь в Supabase Dashboard → **Authentication** → **Providers** → **Google**:
   - Вставьте **Client ID**
   - Вставьте **Client Secret**
   - Нажмите **Save**

### 2.3 Настройка Redirect URLs

В **Authentication** → **URL Configuration** добавьте:

**Site URL**:
```
https://meter-pwa-production.up.railway.app
```

**Redirect URLs**:
```
https://meter-pwa-production.up.railway.app/auth/callback
http://localhost:5173/auth/callback
```

---

## 🗂️ Шаг 3: Проверка Storage Buckets

1. Перейдите в **Storage** (левое меню)
2. Убедитесь, что созданы два bucket'а:
   - `photos` - для фотографий (лимит 10MB)
   - `audio` - для голосовых заметок (лимит 5MB)

3. Проверьте настройки каждого bucket:
   - **Public**: ❌ (должно быть выключено)
   - **File size limit**: 10MB для photos, 5MB для audio
   - **Allowed MIME types**: настроено согласно миграции

4. Проверьте RLS политики в **Policies** для каждого bucket

---

## 🔑 Шаг 4: Получение API Credentials

1. Перейдите в **Settings** → **API**
2. Скопируйте следующие данные:

```
Project URL: https://YOUR_PROJECT_REF.supabase.co
Project API keys:
  - anon/public key: eyJhbG...
  - service_role key: eyJhbG... (держите в секрете!)
```

3. Создайте файл `.env.local` в корне проекта (см. следующий шаг)

---

## 📝 Шаг 5: Конфигурация Frontend (.env.local)

Создайте файл `.env.local` в корне проекта:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Configuration
VITE_APP_NAME=Health Dashboard
VITE_APP_URL=https://meter-pwa-production.up.railway.app
```

**⚠️ ВАЖНО**: Добавьте `.env.local` в `.gitignore`:

```bash
echo ".env.local" >> .gitignore
```

---

## ✅ Шаг 6: Проверка установки

### 6.1 Проверка базы данных

Выполните в SQL Editor:

```sql
-- Проверка таблиц
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- Должны быть: users, profiles, metrics, media

-- Проверка RLS
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';

-- Должны быть политики для всех таблиц
```

### 6.2 Проверка Storage

```sql
-- Проверка buckets
SELECT * FROM storage.buckets;

-- Должны быть: photos, audio
```

### 6.3 Проверка Auth

1. Перейдите в **Authentication** → **Users**
2. Попробуйте создать тестового пользователя через Dashboard
3. После создания проверьте:

```sql
-- Проверка автоматического создания записи в public.users
SELECT * FROM public.users;

-- Должна быть запись с id созданного пользователя
```

---

## 🧪 Шаг 7: Тестирование API

### 7.1 Тест регистрации через email

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/auth/v1/signup' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "secure-password-123"
  }'
```

### 7.2 Тест создания профиля

```bash
# Сначала получите access_token из предыдущего запроса

curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/rest/v1/profiles' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "John Doe",
    "gender": "M",
    "date_of_birth": "1985-05-15"
  }'
```

### 7.3 Тест загрузки файла

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/photos/USER_ID/test.jpg' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F file=@/path/to/test.jpg
```

---

## 🐛 Troubleshooting

### Ошибка: "relation does not exist"
- Убедитесь, что все миграции выполнены в правильном порядке
- Проверьте логи в **Database** → **Logs**

### Ошибка: "new row violates row-level security policy"
- Проверьте, что RLS политики созданы правильно
- Убедитесь, что используете правильный JWT token
- Проверьте `auth.uid()` в SQL Editor: `SELECT auth.uid();`

### Ошибка при загрузке файлов: "new row violates row-level security policy for table objects"
- Убедитесь, что путь файла начинается с `{user_id}/`
- Проверьте Storage RLS политики в миграции 003

### Google OAuth не работает
- Проверьте правильность Client ID и Client Secret
- Убедитесь, что Authorized redirect URIs совпадают с Supabase URL
- Проверьте статус OAuth consent screen (должен быть Published для продакшн)

---

## 📚 Дополнительные ресурсы

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)

---

## 🔄 Следующие шаги

После успешной настройки Supabase:

1. Установите Supabase клиент в frontend:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Создайте Supabase client в `src/lib/supabase.ts`

3. Реализуйте интеграцию с компонентами:
   - Authentication flow
   - Profile management
   - Metrics tracking
   - Media upload

4. Обновите компоненты для работы с реальными данными из Supabase

---

## 📧 Поддержка

Если возникли проблемы:
1. Проверьте логи в Supabase Dashboard → **Logs**
2. Используйте SQL Editor для отладки запросов
3. Проверьте Network tab в браузере для API запросов
