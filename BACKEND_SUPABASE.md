# Health Dashboard - Supabase Backend Implementation

> **Обновленная спецификация с использованием Supabase**
>
> Версия: 3.0 (Supabase)
> Дата: 2024-10-06

---

## 📖 Оглавление

1. [Почему Supabase](#почему-supabase)
2. [Архитектура с Supabase](#архитектура-с-supabase)
3. [Ключевые изменения](#ключевые-изменения)
4. [Интеграция с Frontend](#интеграция-с-frontend)
5. [API Reference](#api-reference)
6. [Authentication Flow](#authentication-flow)
7. [Data Access Patterns](#data-access-patterns)
8. [Storage Integration](#storage-integration)

---

## 🎯 Почему Supabase

### Преимущества перед custom backend

1. **Встроенная аутентификация** - Email + Google OAuth из коробки
2. **Row Level Security (RLS)** - безопасность на уровне базы данных
3. **Realtime subscriptions** - автоматические обновления UI
4. **Storage API** - S3-совместимое хранилище с RLS
5. **Auto-generated REST API** - не нужно писать CRUD endpoints
6. **TypeScript SDK** - полная типизация из коробки
7. **Бесплатный tier** - 500MB БД, 1GB Storage, 50K MAU

### Что мы получаем бесплатно

- ✅ PostgreSQL база данных
- ✅ RESTful API для всех таблиц
- ✅ Authentication (email, OAuth providers)
- ✅ Storage для файлов
- ✅ Realtime subscriptions
- ✅ Edge Functions (serverless)
- ✅ Database webhooks

---

## 🏗️ Архитектура с Supabase

### Схема данных

```
Supabase Auth (auth.users)
    ↓
public.users (расширенные данные)
    ↓
public.profiles (семейные профили)
    ↓
    ├── public.metrics (метрики здоровья)
    └── public.media (ссылки на файлы)
           ↓
    Supabase Storage
    ├── photos bucket (фото)
    └── audio bucket (голосовые заметки)
```

### Безопасность: Row Level Security

Все таблицы защищены RLS политиками:

```sql
-- Пример: пользователь видит только свои профили
CREATE POLICY "Users can view own profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);
```

**Преимущества:**
- Невозможно получить чужие данные даже если знаешь ID
- Защита на уровне БД, а не приложения
- Автоматически работает для REST API и Realtime

---

## 🔄 Ключевые изменения

### Было (Custom Backend)

- ❌ Нужно писать свой auth с JWT
- ❌ Вручную создавать REST endpoints
- ❌ Настраивать S3 и генерировать signed URLs
- ❌ Реализовывать rate limiting
- ❌ Писать валидацию и middleware

### Стало (Supabase)

- ✅ Auth из коробки (email, Google, и др.)
- ✅ Auto-generated REST API
- ✅ Storage с RLS и автоматическими signed URLs
- ✅ Rate limiting встроен
- ✅ Валидация через database constraints

### Изменение API endpoints

**Было:**
```
POST /api/auth/register
POST /api/profiles
GET  /api/metrics?profileId=xxx
```

**Стало (Supabase REST API):**
```
POST /auth/v1/signup
POST /rest/v1/profiles
GET  /rest/v1/metrics?profile_id=eq.xxx
```

**Но мы будем использовать Supabase JS SDK**, который оборачивает эти endpoints:

```typescript
// Вместо fetch('/api/profiles')
const { data } = await supabase
  .from('profiles')
  .select('*')
```

---

## 💻 Интеграция с Frontend

### 1. Установка Supabase Client

```bash
npm install @supabase/supabase-js
```

### 2. Создание клиента

`src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// TypeScript types (будут сгенерированы автоматически)
export type Database = {
  public: {
    Tables: {
      users: { ... }
      profiles: { ... }
      metrics: { ... }
      media: { ... }
    }
  }
}
```

### 3. TypeScript Types Generation

```bash
# Установка Supabase CLI
npm install -g supabase

# Генерация типов из базы
supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts
```

Затем используем типы:

```typescript
import { Database } from './types/database'

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
)
```

---

## 🔐 Authentication Flow

### Email/Password Registration

```typescript
// src/services/auth.service.ts
import { supabase } from '@/lib/supabase'

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) throw error

  // Supabase автоматически создаст запись в auth.users
  // Наш trigger создаст запись в public.users
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
```

### Google OAuth

```typescript
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  if (error) throw error
  return data
}
```

### Auth State Listener

```typescript
// src/App.tsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function App() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Получить текущего пользователя
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Слушать изменения auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user }}>
      {/* Your app */}
    </AuthContext.Provider>
  )
}
```

---

## 📊 Data Access Patterns

### Profiles CRUD

```typescript
// src/services/profile.service.ts
import { supabase } from '@/lib/supabase'

export interface Profile {
  id: string
  user_id: string
  name: string
  gender: 'M' | 'F' | 'O'
  date_of_birth: string
  created_at: string
  updated_at: string
}

// CREATE
export async function createProfile(data: {
  name: string
  gender: 'M' | 'F' | 'O'
  date_of_birth: string
}) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({
      name: data.name,
      gender: data.gender,
      date_of_birth: data.date_of_birth,
      // user_id автоматически подставится из auth.uid()
    })
    .select()
    .single()

  if (error) throw error
  return profile
}

// READ ALL
export async function getProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

// READ ONE with calculated age
export async function getProfile(id: string) {
  const { data, error } = await supabase
    .rpc('get_profile_with_age', { profile_id: id })
    .single()

  if (error) throw error
  return data
}

// UPDATE
export async function updateProfile(
  id: string,
  updates: Partial<Pick<Profile, 'name' | 'gender' | 'date_of_birth'>>
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// DELETE (soft delete)
export async function deleteProfile(id: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}
```

### Metrics CRUD

```typescript
// src/services/metric.service.ts
import { supabase } from '@/lib/supabase'

export interface Metric {
  id: string
  profile_id: string
  type: 'weight' | 'bloodPressure' | 'pulse'
  value: number
  unit: string
  timestamp: string
  notes?: string
  created_at: string
}

// CREATE
export async function createMetric(data: {
  profile_id: string
  type: Metric['type']
  value: number
  unit: string
  timestamp: string
  notes?: string
}) {
  const { data: metric, error } = await supabase
    .from('metrics')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return metric
}

// READ with filters
export async function getMetrics(filters: {
  profileId: string
  type?: Metric['type']
  from?: string
  to?: string
  limit?: number
}) {
  let query = supabase
    .from('metrics')
    .select('*')
    .eq('profile_id', filters.profileId)
    .is('deleted_at', null)
    .order('timestamp', { ascending: false })

  if (filters.type) {
    query = query.eq('type', filters.type)
  }

  if (filters.from) {
    query = query.gte('timestamp', filters.from)
  }

  if (filters.to) {
    query = query.lte('timestamp', filters.to)
  }

  if (filters.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

// DELETE
export async function deleteMetric(id: string) {
  const { error } = await supabase
    .from('metrics')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}
```

### Realtime Subscriptions

```typescript
// Подписка на изменения метрик для профиля
export function subscribeToMetrics(
  profileId: string,
  callback: (metric: Metric) => void
) {
  const subscription = supabase
    .channel(`metrics:${profileId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'metrics',
        filter: `profile_id=eq.${profileId}`,
      },
      (payload) => {
        callback(payload.new as Metric)
      }
    )
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}

// Использование в React
useEffect(() => {
  const unsubscribe = subscribeToMetrics(profileId, (newMetric) => {
    setMetrics((prev) => [newMetric, ...prev])
  })

  return unsubscribe
}, [profileId])
```

---

## 📁 Storage Integration

### Upload Photo

```typescript
// src/services/media.service.ts
import { supabase } from '@/lib/supabase'

export async function uploadPhoto(
  profileId: string,
  file: File,
  notes?: string
) {
  const user = await supabase.auth.getUser()
  if (!user.data.user) throw new Error('Not authenticated')

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${crypto.randomUUID()}.${fileExt}`
  const filePath = `${user.data.user.id}/${profileId}/${fileName}`

  // Upload to Storage
  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) throw uploadError

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('photos')
    .getPublicUrl(filePath)

  // Create thumbnail (на стороне клиента или через Edge Function)
  const thumbnail = await createThumbnail(file)
  const thumbPath = `${user.data.user.id}/${profileId}/${fileName.replace('.', '_thumb.')}`

  await supabase.storage
    .from('photos')
    .upload(thumbPath, thumbnail)

  const { data: { publicUrl: thumbUrl } } = supabase.storage
    .from('photos')
    .getPublicUrl(thumbPath)

  // Save metadata to database
  const { data, error } = await supabase
    .from('media')
    .insert({
      profile_id: profileId,
      type: 'photo',
      file_path: filePath,
      thumbnail_path: thumbPath,
      size: file.size,
      mime_type: file.type,
      timestamp: new Date().toISOString(),
      notes,
    })
    .select()
    .single()

  if (error) throw error

  return {
    ...data,
    url: publicUrl,
    thumbnail_url: thumbUrl,
  }
}

// Helper: создание thumbnail
async function createThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      const MAX_WIDTH = 300
      const scale = MAX_WIDTH / img.width
      canvas.width = MAX_WIDTH
      canvas.height = img.height * scale

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create thumbnail'))
        },
        'image/jpeg',
        0.8
      )
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
```

### Upload Audio

```typescript
export async function uploadAudio(
  profileId: string,
  audioBlob: Blob,
  notes?: string
) {
  const user = await supabase.auth.getUser()
  if (!user.data.user) throw new Error('Not authenticated')

  const fileName = `${crypto.randomUUID()}.mp3`
  const filePath = `${user.data.user.id}/${profileId}/${fileName}`

  // Upload
  const { error: uploadError } = await supabase.storage
    .from('audio')
    .upload(filePath, audioBlob, {
      contentType: 'audio/mpeg',
      cacheControl: '3600',
    })

  if (uploadError) throw uploadError

  // Get URL
  const { data: { publicUrl } } = supabase.storage
    .from('audio')
    .getPublicUrl(filePath)

  // Get duration (если доступно в metadata)
  const duration = await getAudioDuration(audioBlob)

  // Save to DB
  const { data, error } = await supabase
    .from('media')
    .insert({
      profile_id: profileId,
      type: 'voice',
      file_path: filePath,
      size: audioBlob.size,
      mime_type: 'audio/mpeg',
      duration,
      timestamp: new Date().toISOString(),
      notes,
    })
    .select()
    .single()

  if (error) throw error

  return { ...data, url: publicUrl }
}

async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio()
    audio.onloadedmetadata = () => {
      resolve(Math.floor(audio.duration))
    }
    audio.onerror = () => resolve(0)
    audio.src = URL.createObjectURL(blob)
  })
}
```

### Get Media List

```typescript
export async function getMedia(profileId: string, type?: 'photo' | 'voice') {
  let query = supabase
    .from('media')
    .select('*')
    .eq('profile_id', profileId)
    .is('deleted_at', null)
    .order('timestamp', { ascending: false })

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query

  if (error) throw error

  // Add URLs
  return data.map((item) => {
    const bucket = item.type === 'photo' ? 'photos' : 'audio'
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(item.file_path)

    let thumbnail_url
    if (item.thumbnail_path) {
      const { data: { publicUrl: thumbUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(item.thumbnail_path)
      thumbnail_url = thumbUrl
    }

    return {
      ...item,
      url: publicUrl,
      thumbnail_url,
    }
  })
}
```

### Delete Media

```typescript
export async function deleteMedia(id: string) {
  // Get file paths
  const { data: media, error: fetchError } = await supabase
    .from('media')
    .select('type, file_path, thumbnail_path')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  const bucket = media.type === 'photo' ? 'photos' : 'audio'

  // Delete files from storage
  const filesToDelete = [media.file_path]
  if (media.thumbnail_path) {
    filesToDelete.push(media.thumbnail_path)
  }

  const { error: storageError } = await supabase.storage
    .from(bucket)
    .remove(filesToDelete)

  if (storageError) throw storageError

  // Soft delete from DB
  const { error: dbError } = await supabase
    .from('media')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (dbError) throw dbError
}
```

---

## 🔄 Feed (Combined Timeline)

```typescript
// src/services/feed.service.ts
import { supabase } from '@/lib/supabase'

export interface FeedItem {
  id: string
  profileId: string
  type: 'metric' | 'photo' | 'voice'
  timestamp: string
  notes?: string

  // Metric fields
  metricType?: 'weight' | 'bloodPressure' | 'pulse'
  value?: number
  unit?: string

  // Media fields
  url?: string
  thumbnailUrl?: string
  duration?: number
}

export async function getFeed(
  profileId: string,
  limit = 20,
  offset = 0
): Promise<FeedItem[]> {
  // Get metrics
  const { data: metrics } = await supabase
    .from('metrics')
    .select('*')
    .eq('profile_id', profileId)
    .is('deleted_at', null)
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1)

  // Get media
  const { data: media } = await supabase
    .from('media')
    .select('*')
    .eq('profile_id', profileId)
    .is('deleted_at', null)
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1)

  // Combine and sort
  const feedItems: FeedItem[] = []

  if (metrics) {
    metrics.forEach((m) => {
      feedItems.push({
        id: m.id,
        profileId: m.profile_id,
        type: 'metric',
        timestamp: m.timestamp,
        notes: m.notes,
        metricType: m.type,
        value: parseFloat(m.value),
        unit: m.unit,
      })
    })
  }

  if (media) {
    media.forEach((m) => {
      const bucket = m.type === 'photo' ? 'photos' : 'audio'
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(m.file_path)

      let thumbnailUrl
      if (m.thumbnail_path) {
        const { data: { publicUrl: thumbUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(m.thumbnail_path)
        thumbnailUrl = thumbUrl
      }

      feedItems.push({
        id: m.id,
        profileId: m.profile_id,
        type: m.type,
        timestamp: m.timestamp,
        notes: m.notes,
        url: publicUrl,
        thumbnailUrl,
        duration: m.duration,
      })
    })
  }

  // Sort by timestamp
  return feedItems.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}
```

---

## 🎨 React Integration Examples

### Auth Context

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

### Profile Selector Hook

```typescript
// src/hooks/useProfiles.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/services/profile.service'

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .is('deleted_at', null)
          .order('created_at')

        if (error) throw error
        setProfiles(data)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfiles()

    // Subscribe to changes
    const subscription = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          fetchProfiles()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { profiles, loading, error }
}
```

---

## 📚 Дополнительные ресурсы

### Документация Supabase

- [Supabase Docs](https://supabase.com/docs)
- [JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Auth Guide](https://supabase.com/docs/guides/auth)
- [Storage Guide](https://supabase.com/docs/guides/storage)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)

### Полезные ссылки

- [SQL Editor](https://supabase.com/dashboard/project/_/sql) - выполнение SQL запросов
- [Table Editor](https://supabase.com/dashboard/project/_/editor) - визуальное редактирование таблиц
- [Auth Settings](https://supabase.com/dashboard/project/_/auth/users) - управление пользователями
- [Storage Browser](https://supabase.com/dashboard/project/_/storage/buckets) - просмотр файлов

---

## ✅ Чек-лист интеграции

### Backend Setup
- [ ] Применить SQL миграции в Supabase
- [ ] Настроить Email provider
- [ ] Настроить Google OAuth
- [ ] Создать Storage buckets
- [ ] Проверить RLS политики

### Frontend Integration
- [ ] Установить `@supabase/supabase-js`
- [ ] Создать `.env.local` с Supabase credentials
- [ ] Создать Supabase client (`src/lib/supabase.ts`)
- [ ] Сгенерировать TypeScript types
- [ ] Создать AuthContext
- [ ] Создать service файлы (auth, profile, metric, media)
- [ ] Обновить компоненты для использования Supabase API
- [ ] Добавить Auth callback route
- [ ] Тестирование auth flow
- [ ] Тестирование CRUD операций
- [ ] Тестирование file upload

### Production
- [ ] Настроить Email templates в Supabase
- [ ] Настроить custom domain для Auth redirect
- [ ] Включить email confirmation
- [ ] Настроить rate limiting (если нужно больше чем defaults)
- [ ] Мониторинг использования (Database, Storage, Bandwidth)
- [ ] Backup стратегия

---

## 🚀 Следующие шаги

После настройки Supabase backend:

1. **Обновить существующие компоненты** для работы с Supabase
2. **Добавить offline-first** с помощью [Supabase Realtime](https://supabase.com/docs/guides/realtime/presence)
3. **Оптимизировать производительность** с помощью caching
4. **Добавить Edge Functions** для server-side logic (например, создание thumbnails)
5. **Настроить аналитику** через Supabase Dashboard

Теперь у вас есть полноценный backend на Supabase! 🎉
