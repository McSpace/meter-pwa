import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Metric, MetricType } from '@/types/database'
import * as metricService from '@/services/metric.service'

interface UseMetricsOptions {
  profileId: string | null
  type?: MetricType
  limit?: number
}

export function useMetrics(options: UseMetricsOptions) {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!options.profileId) {
      setMetrics([])
      setLoading(false)
      return
    }

    async function fetchMetrics() {
      try {
        setLoading(true)
        const data = await metricService.getMetrics({
          profileId: options.profileId!,
          type: options.type,
          limit: options.limit,
        })
        setMetrics(data)
        setError(null)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()

    // Subscribe to changes
    const subscription = supabase
      .channel(`metrics-${options.profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'metrics',
          filter: `profile_id=eq.${options.profileId}`,
        },
        () => {
          fetchMetrics()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [options.profileId, options.type, options.limit])

  return {
    metrics,
    loading,
    error,
    refetch: async () => {
      if (!options.profileId) return
      const data = await metricService.getMetrics({
        profileId: options.profileId,
        type: options.type,
        limit: options.limit,
      })
      setMetrics(data)
    }
  }
}
