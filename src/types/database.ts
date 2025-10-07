export interface User {
  id: string
  name: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  user_id: string
  name: string
  gender: 'M' | 'F' | 'O'
  date_of_birth: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ProfileWithAge extends Profile {
  age: number
}

export type MetricType = 'weight' | 'bloodPressure' | 'pulse'

export interface Metric {
  id: string
  profile_id: string
  type: MetricType
  value: number
  unit: string
  timestamp: string
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type MediaType = 'photo' | 'voice'

export interface Media {
  id: string
  profile_id: string
  type: MediaType
  file_path: string
  thumbnail_path: string | null
  size: number
  mime_type: string
  duration: number | null
  timestamp: string
  notes: string | null
  created_at: string
  deleted_at: string | null
}

export interface MediaWithUrls extends Media {
  url: string
  thumbnail_url?: string
}
