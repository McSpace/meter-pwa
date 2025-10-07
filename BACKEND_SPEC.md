# Health Dashboard - Backend Specification

> **Полная спецификация бэкенда для PWA приложения отслеживания здоровья**
>
> Версия: 2.0
> Дата: 2024-10-03

---

## 📖 Оглавление

1. [Основные требования](#основные-требования)
2. [Архитектура](#архитектура)
3. [API Endpoints](#api-endpoints)
4. [Database Schema](#database-schema)
5. [Безопасность](#безопасность)
6. [Tech Stack](#tech-stack)
7. [Клиентский Flow](#клиентский-flow)
8. [UI Изменения](#ui-изменения)

---

## 🎯 Основные требования

### Функциональные требования

1. **Анонимная регистрация** - создание аккаунта без email/password
2. **Управление профилями** - множественные персоны (семья)
3. **Метрики здоровья** - вес, давление, пульс с привязкой к профилю
4. **Медиа файлы** - фото и голосовые заметки
5. **Временные ряды** - история измерений с агрегацией
6. **Offline-first** - синхронизация после офлайн работы

### Нефункциональные требования

1. **REST API** - простой и понятный интерфейс
2. **JWT авторизация** - токены без email/password
3. **PostgreSQL** - основная БД
4. **S3-compatible storage** - для медиа файлов
5. **Stateless** - горизонтальное масштабирование
6. **Безопасность** - HTTPS, валидация, rate limiting

---

## 🏗️ Архитектура

### Концепция: User → Profiles → Data

```
User (Анонимный аккаунт)
├── JWT Token (хранится в localStorage)
└── Profiles (Персоны)
    ├── Profile 1 (Папа - John, M, 1985-05-15)
    │   ├── Metrics (вес, давление, пульс...)
    │   └── Media (фото, голосовые заметки...)
    ├── Profile 2 (Мама - Jane, F, 1987-03-20)
    │   ├── Metrics
    │   └── Media
    └── Profile 3 (Ребёнок - Tom, M, 2015-08-10)
        ├── Metrics
        └── Media
```

### Ключевые принципы

- **Один токен** - всё управление через JWT
- **Множественные профили** - семейное использование
- **Привязка к профилю** - все данные связаны с конкретной персоной
- **Каскадное удаление** - удаление профиля удаляет все его данные

---

## 📋 API Endpoints

### Base URL
```
Production: https://api.health-dashboard.com
Development: http://localhost:3000
```

### Common Headers
```http
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

---

## 1️⃣ Authentication

### `POST /api/auth/register`

**Описание:** Анонимная регистрация - создание нового пользователя без обязательных данных

**Request:**
```json
{}
```

или с опциональным именем:

```json
{
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": null,
    "createdAt": "2024-10-03T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Суть работы:**
1. Генерация UUID для нового пользователя
2. Создание записи в `users` таблице
3. Генерация JWT токена (payload: `{ userId: "uuid" }`)
4. Возврат пользователя и токена
5. **Клиент сохраняет token в localStorage**

**Errors:**
- `429 Too Many Requests` - превышен rate limit (10 запросов/час)

---

### `GET /api/auth/me`

**Описание:** Получение информации о текущем пользователе

**Headers:** `Authorization: Bearer {token}`

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": null,
  "createdAt": "2024-10-03T12:00:00.000Z"
}
```

**Суть работы:**
1. Валидация JWT токена из заголовка
2. Извлечение `userId` из payload
3. SELECT пользователя из БД
4. Возврат данных профиля

**Errors:**
- `401 Unauthorized` - невалидный или отсутствующий токен
- `404 Not Found` - пользователь не найден

---

### `PATCH /api/auth/me`

**Описание:** Обновление профиля пользователя (добавление имени)

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "name": "John Doe"
}
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "updatedAt": "2024-10-03T13:00:00.000Z"
}
```

**Суть работы:**
1. Аутентификация через JWT
2. UPDATE поля `name` в таблице users
3. UPDATE поля `updated_at`
4. Возврат обновлённых данных

---

## 2️⃣ Profiles (Персоны)

### `POST /api/profiles`

**Описание:** Создание новой персоны (член семьи)

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "name": "John Doe",
  "gender": "M",
  "dateOfBirth": "1985-05-15"
}
```

**Поля:**
- `name` (string, required) - имя персоны
- `gender` (string, required) - пол: "M" (male), "F" (female), "O" (other)
- `dateOfBirth` (date, required) - дата рождения в формате YYYY-MM-DD

**Response (201):**
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440001",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "gender": "M",
  "dateOfBirth": "1985-05-15",
  "age": 39,
  "createdAt": "2024-10-03T12:00:00.000Z"
}
```

**Суть работы:**
1. Аутентификация пользователя через JWT
2. Валидация обязательных полей
3. Валидация gender (M, F, O)
4. Валидация dateOfBirth (формат ISO date)
5. Расчёт возраста: `EXTRACT(YEAR FROM age(current_date, date_of_birth))`
6. INSERT в таблицу `profiles`
7. Возврат созданного профиля с вычисленным возрастом

**Errors:**
- `400 Bad Request` - невалидные данные
- `401 Unauthorized` - нет токена

---

### `GET /api/profiles`

**Описание:** Получение списка всех персон текущего пользователя

**Headers:** `Authorization: Bearer {token}`

**Response (200):**
```json
{
  "profiles": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "name": "John Doe",
      "gender": "M",
      "dateOfBirth": "1985-05-15",
      "age": 39,
      "createdAt": "2024-10-03T12:00:00.000Z"
    },
    {
      "id": "650e8400-e29b-41d4-a716-446655440002",
      "name": "Jane Doe",
      "gender": "F",
      "dateOfBirth": "1987-03-20",
      "age": 37,
      "createdAt": "2024-10-03T12:05:00.000Z"
    },
    {
      "id": "650e8400-e29b-41d4-a716-446655440003",
      "name": "Tom Doe",
      "gender": "M",
      "dateOfBirth": "2015-08-10",
      "age": 9,
      "createdAt": "2024-10-03T12:10:00.000Z"
    }
  ],
  "total": 3
}
```

**Суть работы:**
1. Аутентификация пользователя
2. SELECT всех профилей: `WHERE user_id = current_user`
3. Расчёт возраста для каждого профиля
4. Сортировка по `created_at ASC` (сначала созданные)
5. Возврат массива с общим количеством

---

### `GET /api/profiles/:id`

**Описание:** Получение конкретной персоны по ID

**Headers:** `Authorization: Bearer {token}`

**URL Parameters:**
- `id` (uuid) - ID профиля

**Response (200):**
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440001",
  "name": "John Doe",
  "gender": "M",
  "dateOfBirth": "1985-05-15",
  "age": 39,
  "createdAt": "2024-10-03T12:00:00.000Z",
  "updatedAt": "2024-10-03T12:00:00.000Z"
}
```

**Суть работы:**
1. Аутентификация пользователя
2. SELECT профиля: `WHERE id = :id AND user_id = current_user`
3. Проверка владельца (403 если не принадлежит)
4. Расчёт возраста
5. Возврат профиля

**Errors:**
- `404 Not Found` - профиль не найден
- `403 Forbidden` - профиль принадлежит другому пользователю

---

### `PATCH /api/profiles/:id`

**Описание:** Обновление данных персоны

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "name": "John Smith",
  "gender": "M",
  "dateOfBirth": "1985-05-15"
}
```

**Response (200):**
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440001",
  "name": "John Smith",
  "gender": "M",
  "dateOfBirth": "1985-05-15",
  "age": 39,
  "updatedAt": "2024-10-03T13:00:00.000Z"
}
```

**Суть работы:**
1. Аутентификация и проверка владельца
2. Частичное обновление (только переданные поля)
3. Валидация изменённых полей
4. UPDATE в БД
5. Пересчёт возраста если изменилась дата
6. Возврат обновлённого профиля

---

### `DELETE /api/profiles/:id`

**Описание:** Удаление персоны и всех связанных данных

**Headers:** `Authorization: Bearer {token}`

**Response (204):** No Content

**Суть работы:**
1. Аутентификация и проверка владельца
2. (Опционально) Проверка: нельзя удалить последний профиль
3. DELETE из БД (каскадное удаление metrics и media через ON DELETE CASCADE)
4. Или мягкое удаление: UPDATE `deleted_at = NOW()`
5. Возврат 204

**Errors:**
- `400 Bad Request` - попытка удалить последний профиль
- `404 Not Found` - профиль не найден

---

## 3️⃣ Health Metrics

### `POST /api/metrics`

**Описание:** Создание новой метрики здоровья для персоны

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "profileId": "650e8400-e29b-41d4-a716-446655440001",
  "type": "weight",
  "value": 150,
  "unit": "lbs",
  "timestamp": "2024-10-02T08:30:00.000Z",
  "notes": "Morning weight after breakfast"
}
```

**Поля:**
- `profileId` (uuid, required) - ID персоны
- `type` (string, required) - тип метрики: "weight", "bloodPressure", "pulse"
- `value` (number, required) - числовое значение
- `unit` (string, required) - единица измерения: "lbs", "kg", "mmHg", "bpm"
- `timestamp` (datetime, required) - время измерения (ISO 8601)
- `notes` (text, optional) - заметки без ограничения длины

**Response (201):**
```json
{
  "id": "750e8400-e29b-41d4-a716-446655440010",
  "profileId": "650e8400-e29b-41d4-a716-446655440001",
  "type": "weight",
  "value": 150,
  "unit": "lbs",
  "timestamp": "2024-10-02T08:30:00.000Z",
  "notes": "Morning weight after breakfast",
  "createdAt": "2024-10-02T08:30:00.000Z"
}
```

**Суть работы:**
1. Аутентификация пользователя
2. **Проверка что profileId принадлежит текущему пользователю**
3. Валидация типа метрики (enum: weight, bloodPressure, pulse)
4. Валидация значения (число > 0, разумные пределы)
5. Валидация соответствия unit и type
6. INSERT в таблицу `metrics`
7. Возврат созданной записи

**Errors:**
- `400 Bad Request` - невалидные данные
- `403 Forbidden` - profileId не принадлежит пользователю
- `404 Not Found` - профиль не существует

---

### `GET /api/metrics`

**Описание:** Получение списка метрик с фильтрацией и пагинацией

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `profileId` (uuid, **required**) - фильтр по персоне
- `type` (string, optional) - фильтр по типу метрики
- `from` (datetime, optional) - начало периода (ISO 8601)
- `to` (datetime, optional) - конец периода (ISO 8601)
- `limit` (number, optional, default: 100) - количество записей
- `offset` (number, optional, default: 0) - смещение для пагинации

**Example:**
```
GET /api/metrics?profileId=650e8400-e29b-41d4-a716-446655440001&type=weight&from=2024-10-01T00:00:00Z&limit=50
```

**Response (200):**
```json
{
  "metrics": [
    {
      "id": "750e8400-e29b-41d4-a716-446655440010",
      "profileId": "650e8400-e29b-41d4-a716-446655440001",
      "type": "weight",
      "value": 150,
      "unit": "lbs",
      "timestamp": "2024-10-02T08:30:00.000Z",
      "notes": "Morning weight"
    },
    {
      "id": "750e8400-e29b-41d4-a716-446655440011",
      "profileId": "650e8400-e29b-41d4-a716-446655440001",
      "type": "weight",
      "value": 151,
      "unit": "lbs",
      "timestamp": "2024-10-01T08:30:00.000Z",
      "notes": null
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

**Суть работы:**
1. Аутентификация пользователя
2. **Проверка что profileId принадлежит пользователю** (JOIN profiles)
3. Построение SQL с фильтрами:
   ```sql
   WHERE profile_id = :profileId
     AND type = :type (если указан)
     AND timestamp BETWEEN :from AND :to (если указаны)
   ```
4. Сортировка: `ORDER BY timestamp DESC`
5. Пагинация: `LIMIT :limit OFFSET :offset`
6. Подсчёт общего количества: `SELECT COUNT(*)`
7. Возврат массива + метаданные пагинации

**Errors:**
- `400 Bad Request` - profileId не указан
- `403 Forbidden` - profileId не принадлежит пользователю

---

### `GET /api/metrics/aggregate`

**Описание:** Получение агрегированных данных для построения графиков

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `profileId` (uuid, **required**) - ID персоны
- `type` (string, **required**) - тип метрики
- `period` (string, required) - период: "1W", "1M", "1Y"
- `groupBy` (string, optional, default: "day") - группировка: "day", "week", "month"

**Example:**
```
GET /api/metrics/aggregate?profileId=650e8400-e29b-41d4-a716-446655440001&type=weight&period=1W&groupBy=day
```

**Response (200):**
```json
{
  "type": "weight",
  "period": "1W",
  "groupBy": "day",
  "data": [
    {
      "date": "2024-09-26",
      "avg": 152.0,
      "min": 150.0,
      "max": 154.0,
      "count": 3
    },
    {
      "date": "2024-09-27",
      "avg": 151.5,
      "min": 149.0,
      "max": 153.0,
      "count": 2
    },
    {
      "date": "2024-09-28",
      "avg": 150.0,
      "min": 148.0,
      "max": 152.0,
      "count": 4
    }
  ],
  "change": -2.0,
  "changePercent": -1.3,
  "current": 150.0,
  "previous": 152.0
}
```

**Суть работы:**
1. Аутентификация и проверка владельца профиля
2. Расчёт временного диапазона:
   - 1W: последние 7 дней
   - 1M: последние 30 дней
   - 1Y: последние 365 дней
3. SQL агрегация:
   ```sql
   SELECT
     DATE_TRUNC(:groupBy, timestamp) as date,
     AVG(value) as avg,
     MIN(value) as min,
     MAX(value) as max,
     COUNT(*) as count
   FROM metrics
   WHERE profile_id = :profileId
     AND type = :type
     AND timestamp >= :startDate
   GROUP BY DATE_TRUNC(:groupBy, timestamp)
   ORDER BY date ASC
   ```
4. Расчёт изменения:
   - `current` = последнее среднее значение
   - `previous` = среднее за предыдущий период
   - `change` = current - previous
   - `changePercent` = (change / previous) * 100
5. Возврат агрегированных данных

---

### `DELETE /api/metrics/:id`

**Описание:** Удаление метрики

**Headers:** `Authorization: Bearer {token}`

**Response (204):** No Content

**Суть работы:**
1. Аутентификация пользователя
2. Проверка владельца через JOIN:
   ```sql
   SELECT m.* FROM metrics m
   JOIN profiles p ON m.profile_id = p.id
   WHERE m.id = :id AND p.user_id = :currentUserId
   ```
3. DELETE или мягкое удаление (UPDATE deleted_at)
4. Возврат 204

**Errors:**
- `404 Not Found` - метрика не найдена или не принадлежит пользователю

---

## 4️⃣ Media (Photos & Voice)

### `POST /api/media/upload`

**Описание:** Загрузка фото или голосовой заметки

**Headers:**
- `Authorization: Bearer {token}`
- `Content-Type: multipart/form-data`

**Request (FormData):**
```
file: [binary file]
profileId: "650e8400-e29b-41d4-a716-446655440001"
type: "photo" | "voice"
timestamp: "2024-10-02T08:30:00.000Z"
notes: "Optional description"
```

**Response (201):**
```json
{
  "id": "850e8400-e29b-41d4-a716-446655440020",
  "profileId": "650e8400-e29b-41d4-a716-446655440001",
  "type": "photo",
  "url": "https://cdn.example.com/photos/850e8400-e29b-41d4-a716-446655440020.jpg",
  "thumbnailUrl": "https://cdn.example.com/photos/850e8400-e29b-41d4-a716-446655440020_thumb.jpg",
  "size": 1024000,
  "mimeType": "image/jpeg",
  "timestamp": "2024-10-02T08:30:00.000Z",
  "notes": "After morning workout",
  "createdAt": "2024-10-02T08:30:00.000Z"
}
```

**Суть работы:**
1. Аутентификация пользователя
2. **Проверка что profileId принадлежит пользователю**
3. Валидация типа файла:
   - photo: `image/jpeg`, `image/png`, `image/webp`
   - voice: `audio/mpeg`, `audio/mp4`, `audio/webm`, `audio/wav`
4. Проверка размера:
   - photo: максимум 10MB
   - voice: максимум 5MB
5. Генерация уникального имени: `{uuid}.{extension}`
6. Для фото: создание thumbnail:
   - Resize до 300px по ширине
   - Сохранение качества 80%
   - Формат: JPEG или WEBP
7. Загрузка файлов в S3:
   - Основной файл: `/{type}s/{uuid}.{ext}`
   - Thumbnail: `/{type}s/{uuid}_thumb.{ext}`
8. Для аудио: определение длительности (metadata)
9. INSERT в таблицу `media`:
   - file_path, url
   - thumbnail_path, thumbnail_url (если фото)
   - size, mime_type
   - duration (если аудио)
10. Возврат URL и метаданных

**Errors:**
- `400 Bad Request` - невалидный файл или размер
- `403 Forbidden` - profileId не принадлежит пользователю
- `413 Payload Too Large` - файл слишком большой

---

### `GET /api/media`

**Описание:** Получение списка медиа файлов

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `profileId` (uuid, **required**) - фильтр по персоне
- `type` (string, optional) - "photo" или "voice"
- `from`, `to` (datetime, optional) - временной диапазон
- `limit` (number, optional, default: 20) - количество
- `offset` (number, optional, default: 0) - смещение

**Response (200):**
```json
{
  "media": [
    {
      "id": "850e8400-e29b-41d4-a716-446655440020",
      "profileId": "650e8400-e29b-41d4-a716-446655440001",
      "type": "photo",
      "url": "https://cdn.example.com/photos/850e8400.jpg",
      "thumbnailUrl": "https://cdn.example.com/photos/850e8400_thumb.jpg",
      "size": 1024000,
      "mimeType": "image/jpeg",
      "timestamp": "2024-10-02T08:30:00.000Z",
      "notes": "After workout"
    },
    {
      "id": "850e8400-e29b-41d4-a716-446655440021",
      "profileId": "650e8400-e29b-41d4-a716-446655440001",
      "type": "voice",
      "url": "https://cdn.example.com/audio/850e8400.mp3",
      "size": 512000,
      "mimeType": "audio/mpeg",
      "duration": 45,
      "timestamp": "2024-10-01T15:00:00.000Z",
      "notes": null
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

**Суть работы:**
1. Аутентификация и проверка владельца профиля
2. SQL запрос с фильтрами
3. Пагинация и сортировка по timestamp DESC
4. Возврат списка с URL для доступа

---

### `DELETE /api/media/:id`

**Описание:** Удаление медиа файла

**Headers:** `Authorization: Bearer {token}`

**Response (204):** No Content

**Суть работы:**
1. Аутентификация и проверка владельца
2. Получение file_path и thumbnail_path из БД
3. Удаление файлов из S3:
   - Основной файл
   - Thumbnail (если есть)
4. DELETE из таблицы media
5. Возврат 204

**Errors:**
- `404 Not Found` - файл не найден

---

## 5️⃣ Feed (Combined Timeline)

### `GET /api/feed`

**Описание:** Объединённая лента событий персоны (метрики + медиа)

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `profileId` (uuid, **required**) - ID персоны
- `from`, `to` (datetime, optional) - временной диапазон
- `limit` (number, optional, default: 20)
- `offset` (number, optional, default: 0)

**Response (200):**
```json
{
  "items": [
    {
      "id": "750e8400-e29b-41d4-a716-446655440010",
      "profileId": "650e8400-e29b-41d4-a716-446655440001",
      "type": "metric",
      "metricType": "weight",
      "value": 150,
      "unit": "lbs",
      "timestamp": "2024-10-02T08:30:00.000Z",
      "notes": "Morning measurement"
    },
    {
      "id": "850e8400-e29b-41d4-a716-446655440020",
      "profileId": "650e8400-e29b-41d4-a716-446655440001",
      "type": "photo",
      "url": "https://cdn.example.com/photos/850e8400.jpg",
      "thumbnailUrl": "https://cdn.example.com/photos/850e8400_thumb.jpg",
      "timestamp": "2024-10-01T15:00:00.000Z",
      "notes": "Progress photo"
    },
    {
      "id": "850e8400-e29b-41d4-a716-446655440021",
      "profileId": "650e8400-e29b-41d4-a716-446655440001",
      "type": "voice",
      "url": "https://cdn.example.com/audio/850e8400.mp3",
      "duration": 45,
      "timestamp": "2024-10-01T10:00:00.000Z",
      "notes": "Daily note"
    }
  ],
  "profile": {
    "id": "650e8400-e29b-41d4-a716-446655440001",
    "name": "John Doe",
    "age": 39
  },
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

**Суть работы:**
1. Аутентификация и проверка владельца профиля
2. SQL UNION запрос объединяющий metrics и media:
   ```sql
   (SELECT
     id,
     profile_id,
     'metric' as type,
     type as metric_type,
     value,
     unit,
     timestamp,
     notes
   FROM metrics
   WHERE profile_id = :profileId AND deleted_at IS NULL)

   UNION ALL

   (SELECT
     id,
     profile_id,
     type,
     NULL as metric_type,
     NULL as value,
     NULL as unit,
     timestamp,
     notes
   FROM media
   WHERE profile_id = :profileId AND deleted_at IS NULL)

   ORDER BY timestamp DESC
   LIMIT :limit OFFSET :offset
   ```
3. Получение информации о профиле (JOIN profiles)
4. Возврат унифицированного списка + данные профиля

---

## 6️⃣ Sync (Offline-First)

### `POST /api/sync`

**Описание:** Синхронизация данных после офлайн работы клиента

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "lastSyncAt": "2024-10-01T00:00:00.000Z",
  "clientChanges": {
    "profiles": [
      {
        "tempId": "temp-profile-1",
        "name": "New Baby",
        "gender": "M",
        "dateOfBirth": "2024-10-01"
      }
    ],
    "metrics": [
      {
        "tempId": "temp-metric-1",
        "profileId": "650e8400-e29b-41d4-a716-446655440001",
        "type": "weight",
        "value": 149,
        "unit": "lbs",
        "timestamp": "2024-10-02T08:00:00.000Z"
      },
      {
        "tempId": "temp-metric-2",
        "profileId": "temp-profile-1",
        "type": "weight",
        "value": 8.2,
        "unit": "lbs",
        "timestamp": "2024-10-02T09:00:00.000Z"
      }
    ],
    "media": [],
    "deleted": {
      "profiles": [],
      "metrics": ["750e8400-e29b-41d4-a716-446655440011"],
      "media": []
    }
  }
}
```

**Response (200):**
```json
{
  "serverChanges": {
    "profiles": [],
    "metrics": [
      {
        "id": "750e8400-e29b-41d4-a716-446655440015",
        "profileId": "650e8400-e29b-41d4-a716-446655440001",
        "type": "pulse",
        "value": 75,
        "unit": "bpm",
        "timestamp": "2024-10-02T09:00:00.000Z",
        "createdAt": "2024-10-02T09:00:00.000Z"
      }
    ],
    "media": [],
    "deleted": {
      "profiles": [],
      "metrics": [],
      "media": []
    }
  },
  "mapping": {
    "temp-profile-1": "650e8400-e29b-41d4-a716-446655440004",
    "temp-metric-1": "750e8400-e29b-41d4-a716-446655440016",
    "temp-metric-2": "750e8400-e29b-41d4-a716-446655440017"
  },
  "syncedAt": "2024-10-02T12:00:00.000Z"
}
```

**Суть работы:**

**Фаза 1: Обработка клиентских изменений**
1. Обработка в порядке зависимостей: profiles → metrics/media
2. Создание новых профилей:
   - INSERT профилей с temp IDs
   - Сохранение маппинга temp → real UUID
3. Замена temp profileId на real в метриках/медиа
4. Создание метрик и медиа
5. Обработка удалений (мягкое DELETE)
6. Разрешение конфликтов (last-write-wins по timestamp)

**Фаза 2: Получение серверных изменений**
1. SELECT изменений после lastSyncAt:
   ```sql
   WHERE created_at > :lastSyncAt OR updated_at > :lastSyncAt
   ```
2. SELECT удалённых записей:
   ```sql
   WHERE deleted_at > :lastSyncAt
   ```

**Фаза 3: Возврат**
1. Возврат всех серверных изменений
2. Маппинг temp IDs → real UUIDs
3. Новый timestamp синхронизации

---

## 🗄️ Database Schema

### PostgreSQL Tables

#### `users`
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_created_at ON users(created_at);
```

**Описание полей:**
- `id` - UUID пользователя (автогенерация)
- `name` - опциональное имя (может быть NULL)
- `created_at` - дата создания аккаунта
- `updated_at` - дата последнего обновления

---

#### `profiles`
```sql
CREATE TABLE profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  gender        TEXT NOT NULL CHECK (gender IN ('M', 'F', 'O')),
  date_of_birth DATE NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMP
);

CREATE INDEX idx_profiles_user ON profiles(user_id);
CREATE INDEX idx_profiles_deleted ON profiles(deleted_at);
```

**Описание полей:**
- `id` - UUID профиля
- `user_id` - владелец профиля (FK на users)
- `name` - имя персоны (обязательно, без ограничений)
- `gender` - пол: M (male), F (female), O (other)
- `date_of_birth` - дата рождения для расчёта возраста
- `deleted_at` - мягкое удаление (NULL = активен)

**Constraints:**
- `ON DELETE CASCADE` - удаление пользователя удаляет все его профили
- `CHECK (gender IN ('M', 'F', 'O'))` - валидация пола

---

#### `metrics`
```sql
CREATE TABLE metrics (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  value      DECIMAL(10,2) NOT NULL,
  unit       TEXT NOT NULL,
  timestamp  TIMESTAMP NOT NULL,
  notes      TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_metrics_profile_type ON metrics(profile_id, type);
CREATE INDEX idx_metrics_timestamp ON metrics(timestamp DESC);
CREATE INDEX idx_metrics_deleted ON metrics(deleted_at);
```

**Описание полей:**
- `id` - UUID метрики
- `profile_id` - персона (FK на profiles)
- `type` - тип: "weight", "bloodPressure", "pulse"
- `value` - числовое значение (до 2 знаков после запятой)
- `unit` - единица: "lbs", "kg", "mmHg", "bpm"
- `timestamp` - время измерения (важнее чем created_at!)
- `notes` - заметки без ограничений
- `deleted_at` - мягкое удаление

**Индексы:**
- Композитный (profile_id, type) для быстрой фильтрации
- timestamp DESC для сортировки по времени

---

#### `media`
```sql
CREATE TABLE media (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('photo', 'voice')),
  file_path      TEXT NOT NULL,
  thumbnail_path TEXT,
  url            TEXT NOT NULL,
  thumbnail_url  TEXT,
  size           BIGINT NOT NULL,
  mime_type      TEXT NOT NULL,
  duration       INTEGER,
  timestamp      TIMESTAMP NOT NULL,
  notes          TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMP
);

CREATE INDEX idx_media_profile_type ON media(profile_id, type);
CREATE INDEX idx_media_timestamp ON media(timestamp DESC);
CREATE INDEX idx_media_deleted ON media(deleted_at);
```

**Описание полей:**
- `id` - UUID файла
- `profile_id` - персона (FK на profiles)
- `type` - "photo" или "voice"
- `file_path` - путь в S3: `/photos/{uuid}.jpg`
- `thumbnail_path` - путь к превью (только для фото)
- `url` - публичный URL к файлу
- `thumbnail_url` - URL превью
- `size` - размер в байтах
- `mime_type` - MIME type файла
- `duration` - длительность в секундах (только для аудио)
- `timestamp` - время создания контента
- `notes` - заметки

---

### Migrations

**Порядок создания:**
1. `users`
2. `profiles` (зависит от users)
3. `metrics` (зависит от profiles)
4. `media` (зависит от profiles)

**Каскадное удаление:**
- Удаление user → удаляет все profiles → удаляет все metrics/media
- Удаление profile → удаляет все его metrics/media

---

## 🔐 Безопасность

### Rate Limiting

**По endpoint:**
- `POST /api/auth/register` - 10 запросов/час (предотвращение спама)
- `POST /api/media/upload` - 10 файлов/час
- Все остальные API - 100 запросов/минуту на пользователя

**Реализация:**
- Redis для хранения счётчиков
- Ключ: `ratelimit:{endpoint}:{userId или IP}`
- TTL по истечению периода

---

### Валидация

**Входные данные:**
1. **Метрики:**
   - `value > 0`
   - Разумные пределы (например, вес: 1-500 кг)
   - Соответствие unit и type
2. **Файлы:**
   - MIME type из whitelist
   - Размер: макс 10MB (фото), 5MB (аудио)
   - Расширение файла соответствует MIME
3. **Даты:**
   - ISO 8601 формат
   - `dateOfBirth` не в будущем
   - `timestamp` не слишком далеко в будущем (макс +1 день)
4. **UUID:**
   - Валидный формат UUID v4

**Защита от инъекций:**
- Параметризованные запросы (Prisma/TypeORM)
- Никаких сырых SQL с конкатенацией

---

### JWT

**Структура токена:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "iat": 1696339200,
  "exp": 1698931200
}
```

**Параметры:**
- Алгоритм: HS256
- Срок действия: 30 дней
- Secret: из переменной окружения `JWT_SECRET`
- Обновление: нет refresh tokens (для упрощения)

**Проверка:**
- Каждый защищённый endpoint проверяет токен
- Извлечение userId из payload
- Проверка существования пользователя (опционально, кэшировать)

---

### CORS

**Настройки:**
```javascript
{
  origin: [
    'https://meter-pwa-production.up.railway.app',
    'http://localhost:5173'  // dev
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE']
}
```

---

### Хранение файлов

**S3 Security:**
- Приватные bucket (не публичный доступ)
- Signed URLs с ограниченным временем жизни (1 час)
- Или публичный bucket с уникальными UUID именами

**Структура:**
```
bucket/
├── photos/
│   ├── {uuid}.jpg
│   └── {uuid}_thumb.jpg
└── audio/
    └── {uuid}.mp3
```

---

## 📦 Tech Stack

### Backend

**Runtime & Framework:**
- Node.js 20 LTS
- TypeScript 5+
- Fastify (быстрее чем Express, хорошая типизация)

**Database:**
- PostgreSQL 15+
- Prisma ORM (отличная TypeScript интеграция)
- Миграции через Prisma Migrate

**Storage:**
- AWS S3 / MinIO / Cloudflare R2
- SDK: @aws-sdk/client-s3

**Authentication:**
- jsonwebtoken (JWT)

**Validation:**
- Zod (schema validation с TypeScript)

**File Upload:**
- @fastify/multipart
- sharp (image resize для thumbnails)

**Utilities:**
- date-fns (работа с датами)
- dotenv (переменные окружения)

---

### Структура проекта

```
backend/
├── src/
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── profiles.ts
│   │   ├── metrics.ts
│   │   ├── media.ts
│   │   ├── feed.ts
│   │   └── sync.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── profile.service.ts
│   │   ├── metric.service.ts
│   │   ├── media.service.ts
│   │   └── s3.service.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── ratelimit.middleware.ts
│   │   └── validation.middleware.ts
│   ├── schemas/
│   │   └── *.schema.ts (Zod schemas)
│   ├── utils/
│   │   ├── jwt.ts
│   │   └── errors.ts
│   ├── app.ts
│   └── server.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── .env.example
├── package.json
└── tsconfig.json
```

---

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/health_dashboard

# JWT
JWT_SECRET=your-secret-key-here

# S3
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=health-dashboard-media
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_REGION=us-east-1

# CORS
ALLOWED_ORIGINS=https://meter-pwa-production.up.railway.app,http://localhost:5173

# Rate Limiting
REDIS_URL=redis://localhost:6379
```

---

## 🔄 Клиентский Flow

### Первый запуск приложения

```javascript
// 1. Проверка наличия токена
const token = localStorage.getItem('auth_token');

if (!token) {
  // 2. Анонимная регистрация
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });

  const { token: newToken, user } = await response.json();

  // 3. Сохранение токена
  localStorage.setItem('auth_token', newToken);
  localStorage.setItem('user_id', user.id);
}

// 4. Проверка наличия профилей
const profiles = await getProfiles();

if (profiles.length === 0) {
  // 5. Создание первого профиля (онбординг)
  const profile = await createProfile({
    name: "Me",
    gender: "M",
    dateOfBirth: "1990-01-01"
  });

  localStorage.setItem('active_profile_id', profile.id);
} else {
  // Выбор последнего активного или первого
  const activeId = localStorage.getItem('active_profile_id') || profiles[0].id;
  localStorage.setItem('active_profile_id', activeId);
}
```

---

### Работа с метриками

```javascript
// Получение активного профиля
const profileId = localStorage.getItem('active_profile_id');

// Создание метрики
await fetch('/api/metrics', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    profileId,
    type: 'weight',
    value: 150,
    unit: 'lbs',
    timestamp: new Date().toISOString(),
    notes: 'Morning weight'
  })
});

// Получение метрик для графика
const response = await fetch(
  `/api/metrics/aggregate?profileId=${profileId}&type=weight&period=1W`,
  {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
  }
);

const { data } = await response.json();
// data = [{date, avg, min, max}, ...]
```

---

### Переключение профилей

```javascript
// Получение списка профилей
const { profiles } = await fetch('/api/profiles', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  }
}).then(r => r.json());

// Отображение списка
profiles.forEach(profile => {
  console.log(`${profile.name} (${profile.age} лет)`);
});

// Переключение на другой профиль
const selectedId = profiles[1].id; // Jane
localStorage.setItem('active_profile_id', selectedId);

// Обновление UI
window.location.reload(); // или Redux/Context update
```

---

### Offline синхронизация

```javascript
// При потере сети
window.addEventListener('offline', () => {
  // Включаем offline режим
  localStorage.setItem('offline_mode', 'true');
});

// Сохранение изменений в IndexedDB
async function createMetricOffline(data) {
  const db = await openIndexedDB();
  const tempId = `temp-${Date.now()}`;

  await db.put('pending_metrics', {
    tempId,
    ...data,
    createdAt: new Date().toISOString()
  });
}

// При восстановлении сети
window.addEventListener('online', async () => {
  const lastSync = localStorage.getItem('last_sync_at');
  const db = await openIndexedDB();

  // Получаем все изменения
  const pendingMetrics = await db.getAll('pending_metrics');
  const pendingMedia = await db.getAll('pending_media');

  // Отправляем на сервер
  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      lastSyncAt: lastSync,
      clientChanges: {
        metrics: pendingMetrics,
        media: pendingMedia,
        deleted: { ... }
      }
    })
  });

  const { serverChanges, mapping, syncedAt } = await response.json();

  // Обновляем temp IDs на real
  for (const [tempId, realId] of Object.entries(mapping)) {
    await db.delete('pending_metrics', tempId);
    // Обновляем UI
  }

  // Сохраняем серверные изменения
  for (const metric of serverChanges.metrics) {
    await db.put('metrics', metric);
  }

  // Обновляем last sync
  localStorage.setItem('last_sync_at', syncedAt);
  localStorage.removeItem('offline_mode');
});
```

---

## 🎨 UI Изменения для клиента

### Новые экраны

#### 1. Profile Selector (Выбор профиля)

```
┌─────────────────────────────────┐
│  ←  Профили                     │
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐ │
│  │ 👨 John Doe               │ │
│  │ Мужчина, 39 лет       ✓   │ │ ← активный
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 👩 Jane Doe               │ │
│  │ Женщина, 37 лет           │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 👦 Tom Doe                │ │
│  │ Мужчина, 9 лет            │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ ➕ Добавить профиль        │ │
│  └───────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

---

#### 2. Create/Edit Profile

```
┌─────────────────────────────────┐
│  ←  Новый профиль               │
├─────────────────────────────────┤
│                                 │
│  Имя                            │
│  ┌───────────────────────────┐ │
│  │ John Doe                  │ │
│  └───────────────────────────┘ │
│                                 │
│  Пол                            │
│  ○ Мужской  ● Женский  ○ Другой│
│                                 │
│  Дата рождения                  │
│  ┌───────────────────────────┐ │
│  │ 15.05.1985                │ │
│  └───────────────────────────┘ │
│                                 │
│  Возраст: 39 лет                │
│                                 │
│  ┌───────────────────────────┐ │
│  │     Сохранить             │ │
│  └───────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

---

#### 3. Dashboard с селектором профиля

```
┌─────────────────────────────────┐
│  Dashboard                      │
│                                 │
│  Профиль: John (39) ▼           │ ← выпадающий список
├─────────────────────────────────┤
│  Weight                     ▼   │
├─────────────────────────────────┤
│  ┌───────────────────────────┐ │
│  │  Weight                   │ │
│  │  150 lbs                  │ │
│  │  -2% vs last week         │ │
│  │                           │ │
│  │  1W  1M  1Y               │ │
│  │                           │ │
│  │  [График]                 │ │
│  │                           │ │
│  └───────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

---

### Обновлённые компоненты

**1. Header:**
```jsx
<Header>
  <ProfileSelector
    activeProfile={currentProfile}
    onChange={handleProfileChange}
  />
</Header>
```

**2. Metrics Form:**
```jsx
<MetricForm
  profileId={activeProfileId}  // новое поле
  onSubmit={handleSubmit}
/>
```

**3. Feed:**
```jsx
<Feed
  profileId={activeProfileId}
  items={feedItems}
/>
```

---

### LocalStorage структура

```javascript
{
  // Auth
  "auth_token": "eyJhbGciOiJIUzI1NiIs...",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",

  // Profile
  "active_profile_id": "650e8400-e29b-41d4-a716-446655440001",
  "profiles": "[{...}, {...}]",  // кэш профилей

  // Sync
  "last_sync_at": "2024-10-03T12:00:00.000Z",
  "offline_mode": "false"
}
```

---

## 🚀 Deployment

### Railway Backend

**Dockerfile:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**Environment:**
- Настроить все переменные из `.env.example`
- Подключить PostgreSQL database (Railway addon)
- Настроить S3 (AWS или Cloudflare R2)

---

## ✅ Чеклист реализации

### Backend
- [ ] Настроить Fastify сервер
- [ ] Настроить Prisma ORM + PostgreSQL
- [ ] Реализовать JWT middleware
- [ ] Реализовать rate limiting
- [ ] Endpoints: Auth (register, me, update)
- [ ] Endpoints: Profiles (CRUD)
- [ ] Endpoints: Metrics (CRUD + aggregate)
- [ ] Endpoints: Media (upload, list, delete)
- [ ] Endpoints: Feed (unified timeline)
- [ ] Endpoints: Sync (offline sync)
- [ ] S3 integration (upload, delete)
- [ ] Image thumbnails (sharp)
- [ ] Error handling
- [ ] Validation (Zod)
- [ ] Tests (Jest)
- [ ] Deploy на Railway

### Frontend
- [ ] API client с axios/fetch
- [ ] Auth flow (register, token storage)
- [ ] Profile selector UI
- [ ] Create/Edit profile forms
- [ ] Update Dashboard для multi-profile
- [ ] Update Feed для multi-profile
- [ ] Update Media upload с profileId
- [ ] IndexedDB для offline
- [ ] Sync mechanism
- [ ] Loading states
- [ ] Error handling

---

## 📝 Примечания

### Будущие улучшения

1. **Email привязка:**
   - Опциональная привязка email к анонимному аккаунту
   - Вход с email/password
   - Восстановление пароля

2. **Расширенные метрики:**
   - Кровь (сахар, холестерин)
   - Температура
   - Сон
   - Настроение

3. **Sharing:**
   - Приглашение других пользователей
   - Просмотр профилей членов семьи
   - Права доступа (read-only, edit)

4. **Analytics:**
   - Корреляции между метриками
   - Предсказания трендов
   - Рекомендации

5. **Export:**
   - PDF отчёты
   - CSV экспорт
   - Google Fit / Apple Health интеграция

---

**Конец спецификации**
