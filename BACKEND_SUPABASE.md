# Health Dashboard - Supabase Backend Implementation

> **Updated specification using Supabase**
>
> Version: 3.0 (Supabase)
> Date: 2024-10-06

---

## 📖 Table of Contents

1. [Why Supabase](#why-supabase)
2. [Architecture with Supabase](#architecture-with-supabase)
3. [Key Changes](#key-changes)
4. [Frontend Integration](#frontend-integration)
5. [API Reference](#api-reference)
6. [Authentication Flow](#authentication-flow)
7. [Data Access Patterns](#data-access-patterns)
8. [Storage Integration](#storage-integration)

---

## 🎯 Why Supabase

### Advantages over custom backend

1. **Built-in authentication** - Email + Google OAuth out of the box
2. **Row Level Security (RLS)** - security at the database level
3. **Realtime subscriptions** - automatic UI updates
4. **Storage API** - S3-compatible storage with RLS
5. **Auto-generated REST API** - no need to write CRUD endpoints
6. **TypeScript SDK** - full typing out of the box
7. **Free tier** - 500MB DB, 1GB Storage, 50K MAU

### What we get for free

- ✅ PostgreSQL database
- ✅ RESTful API for all tables
- ✅ Authentication (email, OAuth providers)
- ✅ Storage for files
- ✅ Realtime subscriptions
- ✅ Edge Functions (serverless)
- ✅ Database webhooks

---

## 🏗️ Architecture with Supabase

### Data Schema

```
Supabase Auth (auth.users)
    ↓
public.users (extended data)
    ↓
public.profiles (family profiles)
    ↓
    ├── public.metrics (health metrics)
    └── public.media (file references)
           ↓
    Supabase Storage
    ├── photos bucket (photos)
    └── audio bucket (voice notes)
```

### Security: Row Level Security

All tables are protected by RLS policies:

```sql
-- Example: user sees only their own profiles
CREATE POLICY "Users can view own profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);
```

**Advantages:**
- Impossible to access other users' data even if you know the ID
- Protection at the DB level, not application level
- Automatically works for REST API and Realtime

---

## 🔄 Key Changes

### Before (Custom Backend)

- ❌ Need to write custom auth with JWT
- ❌ Manually create REST endpoints
- ❌ Configure S3 and generate signed URLs
- ❌ Implement rate limiting
- ❌ Write validation and middleware

### After (Supabase)

- ✅ Auth out of the box (email, Google, etc.)
- ✅ Auto-generated REST API
- ✅ Storage with RLS and automatic signed URLs
- ✅ Built-in rate limiting
- ✅ Validation through database constraints

### API endpoints change

**Before:**
```
POST /api/auth/register
POST /api/profiles
GET  /api/metrics?profileId=xxx
```

**After (Supabase REST API):**
```
POST /auth/v1/signup
POST /rest/v1/profiles
GET  /rest/v1/metrics?profile_id=eq.xxx
```

**But we will use Supabase JS SDK**, which wraps these endpoints:

```typescript
// Instead of fetch('/api/profiles')
const { data } = await supabase
  .from('profiles')
  .select('*')
```

---

## 💻 Frontend Integration

### 1. Installing Supabase Client

```bash
npm install @supabase/supabase-js
```

### 2. Creating the client

`src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// TypeScript types (will be auto-generated)
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
# Install Supabase CLI
npm install -g supabase

# Generate types from database
supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts
```

Then use the types:

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

  // Supabase will automatically create a record in auth.users
  // Our trigger will create a record in public.users
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
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Listen for auth state changes
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
      // user_id will be automatically inserted from auth.uid()
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
// Subscribe to metric changes for a profile
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

// Usage in React
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

// Helper: create thumbnail
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

  // Get duration (if available in metadata)
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

## 📚 Additional Resources

### Supabase Documentation

- [Supabase Docs](https://supabase.com/docs)
- [JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Auth Guide](https://supabase.com/docs/guides/auth)
- [Storage Guide](https://supabase.com/docs/guides/storage)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)

### Useful Links

- [SQL Editor](https://supabase.com/dashboard/project/_/sql) - execute SQL queries
- [Table Editor](https://supabase.com/dashboard/project/_/editor) - visual table editing
- [Auth Settings](https://supabase.com/dashboard/project/_/auth/users) - user management
- [Storage Browser](https://supabase.com/dashboard/project/_/storage/buckets) - file browser

---

## ✅ Integration Checklist

### Backend Setup
- [ ] Apply SQL migrations in Supabase
- [ ] Configure Email provider
- [ ] Configure Google OAuth
- [ ] Create Storage buckets
- [ ] Verify RLS policies

### Frontend Integration
- [ ] Install `@supabase/supabase-js`
- [ ] Create `.env.local` with Supabase credentials
- [ ] Create Supabase client (`src/lib/supabase.ts`)
- [ ] Generate TypeScript types
- [ ] Create AuthContext
- [ ] Create service files (auth, profile, metric, media)
- [ ] Update components to use Supabase API
- [ ] Add Auth callback route
- [ ] Test auth flow
- [ ] Test CRUD operations
- [ ] Test file upload

### Production
- [ ] Configure Email templates in Supabase
- [ ] Configure custom domain for Auth redirect
- [ ] Enable email confirmation
- [ ] Configure rate limiting (if more than defaults needed)
- [ ] Monitor usage (Database, Storage, Bandwidth)
- [ ] Backup strategy

---

## 🚀 Next Steps

After setting up Supabase backend:

1. **Update existing components** to work with Supabase
2. **Add offline-first** using [Supabase Realtime](https://supabase.com/docs/guides/realtime/presence)
3. **Optimize performance** with caching
4. **Add Edge Functions** for server-side logic (e.g., thumbnail creation)
5. **Configure analytics** via Supabase Dashboard

Now you have a full-featured Supabase backend! 🎉
