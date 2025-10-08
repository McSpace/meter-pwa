import type { ImageAnalysisResult, DetectedMeasurement } from '@/types/database'

const API_URL = import.meta.env.VITE_AI_ANALYSIS_API_URL

if (!API_URL) {
  console.warn('VITE_AI_ANALYSIS_API_URL not configured - AI analysis will be disabled')
}

// Derive audio analysis URL from image analysis URL
const AUDIO_API_URL = API_URL?.replace('/analizeimage', '/analizeaudio')

/**
 * Analyzes an image URL and extracts health metrics
 * @param imageUrl - Public URL of the image to analyze
 * @returns Analysis result with description and detected measurements
 */
export async function analyzeImage(imageUrl: string): Promise<ImageAnalysisResult> {
  if (!API_URL) {
    throw new Error('AI analysis API URL not configured')
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image_url: imageUrl }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI analysis failed: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  // The API returns a JSON string in the "result" field
  if (data.result && typeof data.result === 'string') {
    const result: ImageAnalysisResult = JSON.parse(data.result)
    return result
  }

  // Fallback for direct JSON response
  if (data.description && data.measurements) {
    return data as ImageAnalysisResult
  }

  throw new Error('Invalid API response format')
}

/**
 * Analyzes an audio URL and extracts health metrics
 * @param audioUrl - Public URL of the audio to analyze
 * @returns Analysis result with description and detected measurements
 */
export async function analyzeAudio(audioUrl: string): Promise<ImageAnalysisResult> {
  if (!AUDIO_API_URL) {
    throw new Error('AI audio analysis API URL not configured')
  }

  const response = await fetch(AUDIO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ audio_url: audioUrl }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI audio analysis failed: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  // The API returns a JSON string in the "result" field
  if (data.result && typeof data.result === 'string') {
    const result: ImageAnalysisResult = JSON.parse(data.result)
    return result
  }

  // Fallback for direct JSON response
  if (data.description && data.measurements) {
    return data as ImageAnalysisResult
  }

  throw new Error('Invalid API response format')
}

/**
 * Maps measurement type string from AI to a normalized metric type string
 * Supports both predefined types and dynamic types
 */
export function mapMeasurementToMetricType(measurementType: string): string {
  const normalized = measurementType.toLowerCase().replace(/\s+/g, '')

  // Map specific pressure types
  if (normalized.includes('systolic')) {
    return 'systolicPressure'
  }

  if (normalized.includes('diastolic')) {
    return 'diastolicPressure'
  }

  if (normalized === 'bloodpressure') {
    return 'bloodPressure'
  }

  if (normalized.includes('pulse') || normalized.includes('heartrate')) {
    return 'pulse'
  }

  if (normalized === 'weight' || normalized.includes('mass')) {
    return 'weight'
  }

  if (normalized === 'temperature' || normalized === 'temp') {
    return 'temperature'
  }

  // For any other type, convert to camelCase
  return measurementType
    .split(/\s+/)
    .map((word, idx) =>
      idx === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('')
}

/**
 * Normalizes unit strings to standard format
 */
export function normalizeUnit(unit: string, metricType: string): string {
  const normalized = unit.toLowerCase().trim()

  // Normalize common units based on metric type
  switch (metricType) {
    case 'bloodPressure':
    case 'systolicPressure':
    case 'diastolicPressure':
      return 'mmHg'
    case 'pulse':
      return 'bpm'
    case 'weight':
      if (normalized.includes('kg')) return 'kg'
      if (normalized.includes('lb')) return 'lbs'
      return normalized
    case 'temperature':
      if (normalized === 'c' || normalized === 'celsius') return '°C'
      if (normalized === 'f' || normalized === 'fahrenheit') return '°F'
      return normalized
    default:
      // For unknown types, return unit as-is
      return unit
  }
}

/**
 * Converts AI measurements to metric creation data
 * Saves ALL measurements, regardless of type
 */
export function convertMeasurementsToMetrics(
  measurements: DetectedMeasurement[],
  profileId: string,
  mediaId: string,
  timestamp: string,
  sourceType: 'photo' | 'audio' = 'photo'
) {
  return measurements
    .map((m) => {
      const value = parseFloat(m.value)
      if (isNaN(value)) {
        console.warn(`Invalid value for ${m.measurement_type}: ${m.value}`)
        return null
      }

      const metricType = mapMeasurementToMetricType(m.measurement_type)
      const normalizedUnit = normalizeUnit(m.unit, metricType)

      return {
        profile_id: profileId,
        type: metricType,
        value,
        unit: normalizedUnit,
        timestamp,
        media_id: mediaId,
        notes: `Auto-detected from ${sourceType}: ${m.measurement_type}`,
      }
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
}
