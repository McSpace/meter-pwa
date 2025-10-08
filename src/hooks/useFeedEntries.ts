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
  metricType?: string  // Changed from strict union to string for dynamic types
  value?: string
  unit?: string

  // For media
  mediaType?: 'photo' | 'voice'
  mediaUrl?: string
  thumbnailUrl?: string
  analysisStatus?: 'pending' | 'analyzing' | 'completed' | 'failed' | 'not_applicable'
  analysisError?: string | null
  detectedMetrics?: Array<{
    type: string
    value: string
    unit: string
  }>

  // Common
  notes?: string | null
}

const metricLabels: Record<string, string> = {
  weight: 'Weight',
  bloodPressure: 'Blood Pressure',
  systolicPressure: 'Systolic Pressure',
  diastolicPressure: 'Diastolic Pressure',
  pulse: 'Pulse',
  temperature: 'Temperature',
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

    // Add metrics (exclude those extracted from media)
    metrics.forEach((metric: Metric) => {
      // Skip metrics that were auto-extracted from photos/audio
      if (metric.media_id) {
        return
      }

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

      // Find metrics extracted from this photo
      const detectedMetrics = metrics
        .filter((m: Metric) => m.media_id === item.id)
        .map((m: Metric) => ({
          type: metricLabels[m.type] || m.type.charAt(0).toUpperCase() + m.type.slice(1),
          value: m.value.toString(),
          unit: m.unit,
        }))

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
        analysisStatus: item.analysis_status,
        analysisError: item.analysis_error,
        detectedMetrics: detectedMetrics.length > 0 ? detectedMetrics : undefined,
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
