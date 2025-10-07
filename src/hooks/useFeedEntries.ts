import { useMemo } from 'react'
import { useMetrics } from './useMetrics'
import { useMedia } from './useMedia'
import type { Metric, MediaWithUrls } from '@/types/database'

export interface FeedEntry {
  id: string
  type: 'metric' | 'media'
  timestamp: string
  date: string
  time: string

  // For metrics
  metricType?: 'weight' | 'bloodPressure' | 'pulse'
  value?: string
  unit?: string

  // For media
  mediaType?: 'photo' | 'voice'
  mediaUrl?: string
  thumbnailUrl?: string

  // Common
  notes?: string | null
}

const metricLabels = {
  weight: 'Weight',
  bloodPressure: 'Blood Pressure',
  pulse: 'Pulse'
}

export function useFeedEntries(profileId: string | null) {
  // Load all metrics (no type filter, no limit)
  const { metrics, loading: metricsLoading, refetch: refetchMetrics } = useMetrics({
    profileId,
  })

  // Load all media
  const { media, loading: mediaLoading, refetch: refetchMedia } = useMedia({
    profileId,
  })

  const entries = useMemo(() => {
    const combined: FeedEntry[] = []

    // Add metrics
    metrics.forEach((metric: Metric) => {
      const date = new Date(metric.timestamp)
      combined.push({
        id: metric.id,
        type: 'metric',
        timestamp: metric.timestamp,
        date: date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        time: date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        metricType: metric.type,
        value: metric.value.toString(),
        unit: metric.unit,
        notes: metric.notes,
      })
    })

    // Add media
    media.forEach((item: MediaWithUrls) => {
      const date = new Date(item.timestamp)
      combined.push({
        id: item.id,
        type: 'media',
        timestamp: item.timestamp,
        date: date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        time: date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        mediaType: item.type,
        mediaUrl: item.url,
        thumbnailUrl: item.thumbnail_url,
        notes: item.notes,
      })
    })

    // Sort by timestamp (newest first)
    combined.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    return combined
  }, [metrics, media])

  const refetch = async () => {
    await Promise.all([refetchMetrics(), refetchMedia()])
  }

  return {
    entries,
    loading: metricsLoading || mediaLoading,
    refetch,
  }
}

export { metricLabels }
