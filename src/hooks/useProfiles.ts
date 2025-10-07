import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ProfileWithAge } from '@/types/database'
import * as profileService from '@/services/profile.service'

export function useProfiles() {
  const [profiles, setProfiles] = useState<ProfileWithAge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchProfiles() {
      try {
        setLoading(true)
        const data = await profileService.getProfiles()
        setProfiles(data)
        setError(null)
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

  return { profiles, loading, error, refetch: async () => {
    const data = await profileService.getProfiles()
    setProfiles(data)
  }}
}
