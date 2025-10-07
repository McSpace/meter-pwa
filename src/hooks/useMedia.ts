import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { MediaWithUrls, MediaType } from '@/types/database'
import * as mediaService from '@/services/media.service'

interface UseMediaOptions {
  profileId: string | null
  type?: MediaType
}

export function useMedia(options: UseMediaOptions) {
  const [media, setMedia] = useState<MediaWithUrls[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!options.profileId) {
      setMedia([])
      setLoading(false)
      return
    }

    async function fetchMedia() {
      try {
        setLoading(true)
        const data = await mediaService.getMedia(
          options.profileId!,
          options.type
        )
        setMedia(data)
        setError(null)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchMedia()

    // Subscribe to changes
    const subscription = supabase
      .channel(`media-${options.profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media',
          filter: `profile_id=eq.${options.profileId}`,
        },
        () => {
          fetchMedia()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [options.profileId, options.type])

  return {
    media,
    loading,
    error,
    refetch: async () => {
      if (!options.profileId) return
      const data = await mediaService.getMedia(
        options.profileId,
        options.type
      )
      setMedia(data)
    }
  }
}
