import { supabase } from '@/lib/supabase'
import type { Profile, ProfileWithAge } from '@/types/database'

interface CreateProfileData {
  name: string
  gender: 'M' | 'F' | 'O'
  date_of_birth: string
}

interface UpdateProfileData {
  name?: string
  gender?: 'M' | 'F' | 'O'
  date_of_birth?: string
}

export async function createProfile(data: CreateProfileData): Promise<Profile> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      name: data.name,
      gender: data.gender,
      date_of_birth: data.date_of_birth,
    })
    .select()
    .single()

  if (error) throw error
  return profile
}

export async function getProfiles(): Promise<ProfileWithAge[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) throw error

  // Calculate age for each profile
  return data.map((profile) => ({
    ...profile,
    age: calculateAge(profile.date_of_birth),
  }))
}

export async function getProfile(id: string): Promise<ProfileWithAge> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) throw error

  return {
    ...data,
    age: calculateAge(data.date_of_birth),
  }
}

export async function updateProfile(
  id: string,
  updates: UpdateProfileData
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteProfile(id: string): Promise<void> {
  // Soft delete
  const { error } = await supabase
    .from('profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// Helper function to calculate age
function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}
