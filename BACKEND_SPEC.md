# Health Dashboard - Backend Specification

> **Complete backend specification for health tracking PWA application**
>
> Version: 2.0
> Date: 2024-10-03

---

## 📖 Table of Contents

1. [Core Requirements](#core-requirements)
2. [Architecture](#architecture)
3. [API Endpoints](#api-endpoints)
4. [Database Schema](#database-schema)
5. [Security](#security)
6. [Tech Stack](#tech-stack)
7. [Client Flow](#client-flow)
8. [UI Changes](#ui-changes)

---

## 🎯 Core Requirements

### Functional Requirements

1. **Anonymous Registration** - account creation without email/password
2. **Profile Management** - multiple personas (family members)
3. **Health Metrics** - weight, blood pressure, pulse linked to profiles
4. **Media Files** - photos and voice notes
5. **Time Series** - measurement history with aggregation
6. **Offline-first** - synchronization after offline work

### Non-functional Requirements

1. **REST API** - simple and clear interface
2. **JWT Authorization** - tokens without email/password
3. **PostgreSQL** - primary database
4. **S3-compatible storage** - for media files
5. **Stateless** - horizontal scaling
6. **Security** - HTTPS, validation, rate limiting

---

## 🏗️ Architecture

### Concept: User → Profiles → Data

```
User (Anonymous account)
├── JWT Token (stored in localStorage)
└── Profiles (Personas)
    ├── Profile 1 (Dad - John, M, 1985-05-15)
    │   ├── Metrics (weight, blood pressure, pulse...)
    │   └── Media (photos, voice notes...)
    ├── Profile 2 (Mom - Jane, F, 1987-03-20)
    │   ├── Metrics
    │   └── Media
    └── Profile 3 (Child - Tom, M, 2015-08-10)
        ├── Metrics
        └── Media
```

### Key Principles

- **Single token** - all management through JWT
- **Multiple profiles** - family usage
- **Profile binding** - all data linked to specific persona
- **Cascade deletion** - deleting profile removes all its data

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

**Description:** Anonymous registration - creating a new user without required data

**Request:**
```json
{}
```

or with optional name:

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

**How it works:**
1. Generate UUID for new user
2. Create record in `users` table
3. Generate JWT token (payload: `{ userId: "uuid" }`)
4. Return user and token
5. **Client saves token in localStorage**

**Errors:**
- `429 Too Many Requests` - rate limit exceeded (10 requests/hour)

---

### `GET /api/auth/me`

**Description:** Get current user information

**Headers:** `Authorization: Bearer {token}`

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": null,
  "createdAt": "2024-10-03T12:00:00.000Z"
}
```

**How it works:**
1. Validate JWT token from header
2. Extract `userId` from payload
3. SELECT user from DB
4. Return profile data

**Errors:**
- `401 Unauthorized` - invalid or missing token
- `404 Not Found` - user not found

---

### `PATCH /api/auth/me`

**Description:** Update user profile (add name)

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

**How it works:**
1. Authenticate via JWT
2. UPDATE `name` field in users table
3. UPDATE `updated_at` field
4. Return updated data

---

## 2️⃣ Profiles (Personas)

### `POST /api/profiles`

**Description:** Create a new persona (family member)

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "name": "John Doe",
  "gender": "M",
  "dateOfBirth": "1985-05-15"
}
```

**Fields:**
- `name` (string, required) - persona name
- `gender` (string, required) - gender: "M" (male), "F" (female), "O" (other)
- `dateOfBirth` (date, required) - birth date in YYYY-MM-DD format

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

**How it works:**
1. Authenticate user via JWT
2. Validate required fields
3. Validate gender (M, F, O)
4. Validate dateOfBirth (ISO date format)
5. Calculate age: `EXTRACT(YEAR FROM age(current_date, date_of_birth))`
6. INSERT into `profiles` table
7. Return created profile with calculated age

**Errors:**
- `400 Bad Request` - invalid data
- `401 Unauthorized` - no token

---

### `GET /api/profiles`

**Description:** Get list of all current user's personas

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

**How it works:**
1. Authenticate user
2. SELECT all profiles: `WHERE user_id = current_user`
3. Calculate age for each profile
4. Sort by `created_at ASC` (oldest first)
5. Return array with total count

---

### `GET /api/profiles/:id`

**Description:** Get specific persona by ID

**Headers:** `Authorization: Bearer {token}`

**URL Parameters:**
- `id` (uuid) - profile ID

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

**How it works:**
1. Authenticate user
2. SELECT profile: `WHERE id = :id AND user_id = current_user`
3. Check ownership (403 if doesn't belong)
4. Calculate age
5. Return profile

**Errors:**
- `404 Not Found` - profile not found
- `403 Forbidden` - profile belongs to another user

---

### `PATCH /api/profiles/:id`

**Description:** Update persona data

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

**How it works:**
1. Authenticate and verify ownership
2. Partial update (only provided fields)
3. Validate changed fields
4. UPDATE in DB
5. Recalculate age if date changed
6. Return updated profile

---

### `DELETE /api/profiles/:id`

**Description:** Delete persona and all related data

**Headers:** `Authorization: Bearer {token}`

**Response (204):** No Content

**How it works:**
1. Authenticate and verify ownership
2. (Optional) Check: cannot delete last profile
3. DELETE from DB (cascade delete metrics and media via ON DELETE CASCADE)
4. Or soft delete: UPDATE `deleted_at = NOW()`
5. Return 204

**Errors:**
- `400 Bad Request` - attempt to delete last profile
- `404 Not Found` - profile not found

---

## 3️⃣ Health Metrics

### `POST /api/metrics`

**Description:** Create new health metric for persona

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

**Fields:**
- `profileId` (uuid, required) - persona ID
- `type` (string, required) - metric type: "weight", "bloodPressure", "pulse"
- `value` (number, required) - numeric value
- `unit` (string, required) - unit of measurement: "lbs", "kg", "mmHg", "bpm"
- `timestamp` (datetime, required) - measurement time (ISO 8601)
- `notes` (text, optional) - notes without length limit

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

**How it works:**
1. Authenticate user
2. **Verify that profileId belongs to current user**
3. Validate metric type (enum: weight, bloodPressure, pulse)
4. Validate value (number > 0, reasonable limits)
5. Validate unit and type match
6. INSERT into `metrics` table
7. Return created record

**Errors:**
- `400 Bad Request` - invalid data
- `403 Forbidden` - profileId doesn't belong to user
- `404 Not Found` - profile doesn't exist

---

### `GET /api/metrics`

**Description:** Get list of metrics with filtering and pagination

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `profileId` (uuid, **required**) - filter by persona
- `type` (string, optional) - filter by metric type
- `from` (datetime, optional) - period start (ISO 8601)
- `to` (datetime, optional) - period end (ISO 8601)
- `limit` (number, optional, default: 100) - number of records
- `offset` (number, optional, default: 0) - offset for pagination

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

**How it works:**
1. Authenticate user
2. **Verify that profileId belongs to user** (JOIN profiles)
3. Build SQL with filters:
   ```sql
   WHERE profile_id = :profileId
     AND type = :type (if specified)
     AND timestamp BETWEEN :from AND :to (if specified)
   ```
4. Sort: `ORDER BY timestamp DESC`
5. Pagination: `LIMIT :limit OFFSET :offset`
6. Count total: `SELECT COUNT(*)`
7. Return array + pagination metadata

**Errors:**
- `400 Bad Request` - profileId not specified
- `403 Forbidden` - profileId doesn't belong to user

---

### `GET /api/metrics/aggregate`

**Description:** Get aggregated data for building charts

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `profileId` (uuid, **required**) - persona ID
- `type` (string, **required**) - metric type
- `period` (string, required) - period: "1W", "1M", "1Y"
- `groupBy` (string, optional, default: "day") - grouping: "day", "week", "month"

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

**How it works:**
1. Authenticate and verify profile ownership
2. Calculate time range:
   - 1W: last 7 days
   - 1M: last 30 days
   - 1Y: last 365 days
3. SQL aggregation:
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
4. Calculate change:
   - `current` = last average value
   - `previous` = average for previous period
   - `change` = current - previous
   - `changePercent` = (change / previous) * 100
5. Return aggregated data

---

### `DELETE /api/metrics/:id`

**Description:** Delete metric

**Headers:** `Authorization: Bearer {token}`

**Response (204):** No Content

**How it works:**
1. Authenticate user
2. Verify ownership via JOIN:
   ```sql
   SELECT m.* FROM metrics m
   JOIN profiles p ON m.profile_id = p.id
   WHERE m.id = :id AND p.user_id = :currentUserId
   ```
3. DELETE or soft delete (UPDATE deleted_at)
4. Return 204

**Errors:**
- `404 Not Found` - metric not found or doesn't belong to user

---

## 4️⃣ Media (Photos & Voice)

### `POST /api/media/upload`

**Description:** Upload photo or voice note

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

**How it works:**
1. Authenticate user
2. **Verify that profileId belongs to user**
3. Validate file type:
   - photo: `image/jpeg`, `image/png`, `image/webp`
   - voice: `audio/mpeg`, `audio/mp4`, `audio/webm`, `audio/wav`
4. Check size:
   - photo: max 10MB
   - voice: max 5MB
5. Generate unique name: `{uuid}.{extension}`
6. For photos: create thumbnail:
   - Resize to 300px width
   - Save quality 80%
   - Format: JPEG or WEBP
7. Upload files to S3:
   - Main file: `/{type}s/{uuid}.{ext}`
   - Thumbnail: `/{type}s/{uuid}_thumb.{ext}`
8. For audio: determine duration (metadata)
9. INSERT into `media` table:
   - file_path, url
   - thumbnail_path, thumbnail_url (if photo)
   - size, mime_type
   - duration (if audio)
10. Return URL and metadata

**Errors:**
- `400 Bad Request` - invalid file or size
- `403 Forbidden` - profileId doesn't belong to user
- `413 Payload Too Large` - file too large

---

### `GET /api/media`

**Description:** Get list of media files

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `profileId` (uuid, **required**) - filter by persona
- `type` (string, optional) - "photo" or "voice"
- `from`, `to` (datetime, optional) - time range
- `limit` (number, optional, default: 20) - quantity
- `offset` (number, optional, default: 0) - offset

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

**How it works:**
1. Authenticate and verify profile ownership
2. SQL query with filters
3. Pagination and sort by timestamp DESC
4. Return list with URLs for access

---

### `DELETE /api/media/:id`

**Description:** Delete media file

**Headers:** `Authorization: Bearer {token}`

**Response (204):** No Content

**How it works:**
1. Authenticate and verify ownership
2. Get file_path and thumbnail_path from DB
3. Delete files from S3:
   - Main file
   - Thumbnail (if exists)
4. DELETE from media table
5. Return 204

**Errors:**
- `404 Not Found` - file not found

---

## 5️⃣ Feed (Combined Timeline)

### `GET /api/feed`

**Description:** Combined event feed for persona (metrics + media)

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `profileId` (uuid, **required**) - persona ID
- `from`, `to` (datetime, optional) - time range
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

**How it works:**
1. Authenticate and verify profile ownership
2. SQL UNION query combining metrics and media:
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
3. Get profile information (JOIN profiles)
4. Return unified list + profile data

---

## 6️⃣ Sync (Offline-First)

### `POST /api/sync`

**Description:** Data synchronization after client offline work

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

**How it works:**

**Phase 1: Process client changes**
1. Process in dependency order: profiles → metrics/media
2. Create new profiles:
   - INSERT profiles with temp IDs
   - Save mapping temp → real UUID
3. Replace temp profileId with real in metrics/media
4. Create metrics and media
5. Process deletions (soft DELETE)
6. Resolve conflicts (last-write-wins by timestamp)

**Phase 2: Get server changes**
1. SELECT changes after lastSyncAt:
   ```sql
   WHERE created_at > :lastSyncAt OR updated_at > :lastSyncAt
   ```
2. SELECT deleted records:
   ```sql
   WHERE deleted_at > :lastSyncAt
   ```

**Phase 3: Return**
1. Return all server changes
2. Mapping temp IDs → real UUIDs
3. New sync timestamp

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

**Field descriptions:**
- `id` - user UUID (auto-generated)
- `name` - optional name (can be NULL)
- `created_at` - account creation date
- `updated_at` - last update date

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

**Field descriptions:**
- `id` - profile UUID
- `user_id` - profile owner (FK to users)
- `name` - persona name (required, no constraints)
- `gender` - gender: M (male), F (female), O (other)
- `date_of_birth` - birth date for age calculation
- `deleted_at` - soft delete (NULL = active)

**Constraints:**
- `ON DELETE CASCADE` - deleting user deletes all their profiles
- `CHECK (gender IN ('M', 'F', 'O'))` - gender validation

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

**Field descriptions:**
- `id` - metric UUID
- `profile_id` - persona (FK to profiles)
- `type` - type: "weight", "bloodPressure", "pulse"
- `value` - numeric value (up to 2 decimal places)
- `unit` - unit: "lbs", "kg", "mmHg", "bpm"
- `timestamp` - measurement time (more important than created_at!)
- `notes` - notes without limits
- `deleted_at` - soft delete

**Indexes:**
- Composite (profile_id, type) for fast filtering
- timestamp DESC for time sorting

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

**Field descriptions:**
- `id` - file UUID
- `profile_id` - persona (FK to profiles)
- `type` - "photo" or "voice"
- `file_path` - S3 path: `/photos/{uuid}.jpg`
- `thumbnail_path` - thumbnail path (photos only)
- `url` - public URL to file
- `thumbnail_url` - thumbnail URL
- `size` - size in bytes
- `mime_type` - file MIME type
- `duration` - duration in seconds (audio only)
- `timestamp` - content creation time
- `notes` - notes

---

### Migrations

**Creation order:**
1. `users`
2. `profiles` (depends on users)
3. `metrics` (depends on profiles)
4. `media` (depends on profiles)

**Cascade deletion:**
- Delete user → deletes all profiles → deletes all metrics/media
- Delete profile → deletes all its metrics/media

---

## 🔐 Security

### Rate Limiting

**Per endpoint:**
- `POST /api/auth/register` - 10 requests/hour (spam prevention)
- `POST /api/media/upload` - 10 files/hour
- All other APIs - 100 requests/minute per user

**Implementation:**
- Redis for storing counters
- Key: `ratelimit:{endpoint}:{userId or IP}`
- TTL at end of period

---

### Validation

**Input data:**
1. **Metrics:**
   - `value > 0`
   - Reasonable limits (e.g., weight: 1-500 kg)
   - Unit and type match
2. **Files:**
   - MIME type from whitelist
   - Size: max 10MB (photo), 5MB (audio)
   - File extension matches MIME
3. **Dates:**
   - ISO 8601 format
   - `dateOfBirth` not in future
   - `timestamp` not too far in future (max +1 day)
4. **UUID:**
   - Valid UUID v4 format

**Injection protection:**
- Parameterized queries (Prisma/TypeORM)
- No raw SQL with concatenation

---

### JWT

**Token structure:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "iat": 1696339200,
  "exp": 1698931200
}
```

**Parameters:**
- Algorithm: HS256
- Expiration: 30 days
- Secret: from environment variable `JWT_SECRET`
- Refresh: no refresh tokens (for simplicity)

**Verification:**
- Each protected endpoint verifies token
- Extract userId from payload
- Check user exists (optional, cache)

---

### CORS

**Settings:**
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

### File Storage

**S3 Security:**
- Private bucket (no public access)
- Signed URLs with limited lifetime (1 hour)
- Or public bucket with unique UUID names

**Structure:**
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
- Fastify (faster than Express, good typing)

**Database:**
- PostgreSQL 15+
- Prisma ORM (excellent TypeScript integration)
- Migrations via Prisma Migrate

**Storage:**
- AWS S3 / MinIO / Cloudflare R2
- SDK: @aws-sdk/client-s3

**Authentication:**
- jsonwebtoken (JWT)

**Validation:**
- Zod (schema validation with TypeScript)

**File Upload:**
- @fastify/multipart
- sharp (image resize for thumbnails)

**Utilities:**
- date-fns (date handling)
- dotenv (environment variables)

---

### Project Structure

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

## 🔄 Client Flow

### First App Launch

```javascript
// 1. Check for token
const token = localStorage.getItem('auth_token');

if (!token) {
  // 2. Anonymous registration
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });

  const { token: newToken, user } = await response.json();

  // 3. Save token
  localStorage.setItem('auth_token', newToken);
  localStorage.setItem('user_id', user.id);
}

// 4. Check for profiles
const profiles = await getProfiles();

if (profiles.length === 0) {
  // 5. Create first profile (onboarding)
  const profile = await createProfile({
    name: "Me",
    gender: "M",
    dateOfBirth: "1990-01-01"
  });

  localStorage.setItem('active_profile_id', profile.id);
} else {
  // Select last active or first
  const activeId = localStorage.getItem('active_profile_id') || profiles[0].id;
  localStorage.setItem('active_profile_id', activeId);
}
```

---

### Working with Metrics

```javascript
// Get active profile
const profileId = localStorage.getItem('active_profile_id');

// Create metric
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

// Get metrics for chart
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

### Profile Switching

```javascript
// Get profile list
const { profiles } = await fetch('/api/profiles', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  }
}).then(r => r.json());

// Display list
profiles.forEach(profile => {
  console.log(`${profile.name} (${profile.age} years old)`);
});

// Switch to another profile
const selectedId = profiles[1].id; // Jane
localStorage.setItem('active_profile_id', selectedId);

// Update UI
window.location.reload(); // or Redux/Context update
```

---

### Offline Synchronization

```javascript
// On network loss
window.addEventListener('offline', () => {
  // Enable offline mode
  localStorage.setItem('offline_mode', 'true');
});

// Save changes to IndexedDB
async function createMetricOffline(data) {
  const db = await openIndexedDB();
  const tempId = `temp-${Date.now()}`;

  await db.put('pending_metrics', {
    tempId,
    ...data,
    createdAt: new Date().toISOString()
  });
}

// On network recovery
window.addEventListener('online', async () => {
  const lastSync = localStorage.getItem('last_sync_at');
  const db = await openIndexedDB();

  // Get all changes
  const pendingMetrics = await db.getAll('pending_metrics');
  const pendingMedia = await db.getAll('pending_media');

  // Send to server
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

  // Update temp IDs to real
  for (const [tempId, realId] of Object.entries(mapping)) {
    await db.delete('pending_metrics', tempId);
    // Update UI
  }

  // Save server changes
  for (const metric of serverChanges.metrics) {
    await db.put('metrics', metric);
  }

  // Update last sync
  localStorage.setItem('last_sync_at', syncedAt);
  localStorage.removeItem('offline_mode');
});
```

---

## 🎨 UI Changes for Client

### New Screens

#### 1. Profile Selector

```
┌─────────────────────────────────┐
│  ←  Profiles                    │
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐ │
│  │ 👨 John Doe               │ │
│  │ Male, 39 years old    ✓   │ │ ← active
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 👩 Jane Doe               │ │
│  │ Female, 37 years old      │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 👦 Tom Doe                │ │
│  │ Male, 9 years old         │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ ➕ Add Profile             │ │
│  └───────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

---

#### 2. Create/Edit Profile

```
┌─────────────────────────────────┐
│  ←  New Profile                 │
├─────────────────────────────────┤
│                                 │
│  Name                           │
│  ┌───────────────────────────┐ │
│  │ John Doe                  │ │
│  └───────────────────────────┘ │
│                                 │
│  Gender                         │
│  ○ Male  ● Female  ○ Other     │
│                                 │
│  Date of Birth                  │
│  ┌───────────────────────────┐ │
│  │ 05/15/1985                │ │
│  └───────────────────────────┘ │
│                                 │
│  Age: 39 years old              │
│                                 │
│  ┌───────────────────────────┐ │
│  │     Save                  │ │
│  └───────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

---

#### 3. Dashboard with Profile Selector

```
┌─────────────────────────────────┐
│  Dashboard                      │
│                                 │
│  Profile: John (39) ▼           │ ← dropdown
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
│  │  [Chart]                  │ │
│  │                           │ │
│  └───────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

---

### Updated Components

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
  profileId={activeProfileId}  // new field
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

### LocalStorage Structure

```javascript
{
  // Auth
  "auth_token": "eyJhbGciOiJIUzI1NiIs...",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",

  // Profile
  "active_profile_id": "650e8400-e29b-41d4-a716-446655440001",
  "profiles": "[{...}, {...}]",  // profile cache

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
- Configure all variables from `.env.example`
- Connect PostgreSQL database (Railway addon)
- Configure S3 (AWS or Cloudflare R2)

---

## ✅ Implementation Checklist

### Backend
- [ ] Set up Fastify server
- [ ] Set up Prisma ORM + PostgreSQL
- [ ] Implement JWT middleware
- [ ] Implement rate limiting
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
- [ ] Deploy to Railway

### Frontend
- [ ] API client with axios/fetch
- [ ] Auth flow (register, token storage)
- [ ] Profile selector UI
- [ ] Create/Edit profile forms
- [ ] Update Dashboard for multi-profile
- [ ] Update Feed for multi-profile
- [ ] Update Media upload with profileId
- [ ] IndexedDB for offline
- [ ] Sync mechanism
- [ ] Loading states
- [ ] Error handling

---

## 📝 Notes

### Future Improvements

1. **Email Binding:**
   - Optional email linking to anonymous account
   - Login with email/password
   - Password recovery

2. **Extended Metrics:**
   - Blood (sugar, cholesterol)
   - Temperature
   - Sleep
   - Mood

3. **Sharing:**
   - Invite other users
   - View family member profiles
   - Access rights (read-only, edit)

4. **Analytics:**
   - Correlations between metrics
   - Trend predictions
   - Recommendations

5. **Export:**
   - PDF reports
   - CSV export
   - Google Fit / Apple Health integration

---

**End of specification**
