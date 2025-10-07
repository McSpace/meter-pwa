import { supabase } from '@/lib/supabase'
import type { Metric, MetricType } from '@/types/database'

interface CreateMetricData {
  profile_id: string
  type: MetricType
  value: number
  unit: string
  timestamp: string
  notes?: string
}

interface GetMetricsFilters {
  profileId: string
  type?: MetricType
  from?: string
  to?: string
  limit?: number
}

export async function createMetric(data: CreateMetricData): Promise<Metric> {
  const { data: metric, error } = await supabase
    .from('metrics')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return metric
}

export async function getMetrics(filters: GetMetricsFilters): Promise<Metric[]> {
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

export async function deleteMetric(id: string): Promise<void> {
  // Soft delete
  const { error } = await supabase
    .from('metrics')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// Get aggregated metrics for charts
export async function getMetricStats(
  profileId: string,
  type: MetricType,
  period: '1W' | '1M' | '1Y'
): Promise<{
  data: Array<{
    date: string
    avg: number
    min: number
    max: number
    count: number
  }>
  change: number
  changePercent: number
  current: number
  previous: number
}> {
  const now = new Date()
  const days = period === '1W' ? 7 : period === '1M' ? 30 : 365

  const fromDate = new Date(now)
  fromDate.setDate(fromDate.getDate() - days)

  const { data: metrics, error } = await supabase
    .from('metrics')
    .select('value, timestamp')
    .eq('profile_id', profileId)
    .eq('type', type)
    .is('deleted_at', null)
    .gte('timestamp', fromDate.toISOString())
    .order('timestamp', { ascending: true })

  if (error) throw error

  // Group by date and calculate stats
  const grouped = new Map<string, number[]>()

  metrics.forEach((m) => {
    const date = new Date(m.timestamp).toISOString().split('T')[0]
    if (!grouped.has(date)) {
      grouped.set(date, [])
    }
    grouped.get(date)!.push(parseFloat(m.value.toString()))
  })

  const data = Array.from(grouped.entries()).map(([date, values]) => ({
    date,
    avg: values.reduce((sum, v) => sum + v, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
  }))

  // Calculate change
  const current = data[data.length - 1]?.avg || 0
  const previous = data[0]?.avg || 0
  const change = current - previous
  const changePercent = previous > 0 ? (change / previous) * 100 : 0

  return {
    data,
    change,
    changePercent,
    current,
    previous,
  }
}
