import { supabase } from '@/lib/supabase'
import type { MediaWithUrls, MediaType } from '@/types/database'
import * as aiAnalysisService from './ai-analysis.service'
import * as metricService from './metric.service'

interface UploadMediaData {
  profileId: string
  file: File | Blob
  type: MediaType
  timestamp?: string
  notes?: string
}

export async function uploadMedia(data: UploadMediaData): Promise<MediaWithUrls> {
  const user = await supabase.auth.getUser()
  if (!user.data.user) throw new Error('Not authenticated')

  const timestamp = data.timestamp || new Date().toISOString()
  const fileExt = data.file instanceof File ? data.file.name.split('.').pop() : 'jpg'
  const fileName = `${crypto.randomUUID()}.${fileExt}`
  const filePath = `${user.data.user.id}/${data.profileId}/${fileName}`

  // Upload to appropriate bucket
  const bucket = data.type === 'photo' ? 'photos' : 'audio'

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, data.file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) throw uploadError

  // Get signed URL (for private buckets)
  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 3600 * 24 * 365) // 1 year

  if (signedError) throw signedError
  const publicUrl = signedData.signedUrl

  // For photos, create thumbnail
  let thumbnailPath: string | null = null
  let thumbnailUrl: string | undefined

  if (data.type === 'photo' && data.file instanceof File) {
    try {
      const thumbnail = await createThumbnail(data.file)
      const thumbFileName = fileName.replace('.', '_thumb.')
      thumbnailPath = `${user.data.user.id}/${data.profileId}/${thumbFileName}`

      await supabase.storage
        .from(bucket)
        .upload(thumbnailPath, thumbnail)

      const { data: thumbSignedData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(thumbnailPath, 3600 * 24 * 365) // 1 year

      thumbnailUrl = thumbSignedData?.signedUrl
    } catch (err) {
      console.error('Failed to create thumbnail:', err)
    }
  }

  // Get duration for audio
  let duration: number | null = null
  if (data.type === 'voice') {
    duration = await getAudioDuration(data.file)
  }

  // Save metadata to database
  const { data: media, error: dbError } = await supabase
    .from('media')
    .insert({
      profile_id: data.profileId,
      type: data.type,
      file_path: filePath,
      thumbnail_path: thumbnailPath,
      size: data.file.size,
      mime_type: data.file instanceof File ? data.file.type : 'image/jpeg',
      duration,
      timestamp,
      notes: data.notes,
      analysis_status: (data.type === 'photo' || data.type === 'voice') ? 'pending' : 'not_applicable',
    })
    .select()
    .single()

  if (dbError) throw dbError

  const result: MediaWithUrls = {
    ...media,
    url: publicUrl,
    thumbnail_url: thumbnailUrl,
  }

  // Trigger AI analysis for photos and audio (async, don't wait)
  if (data.type === 'photo') {
    analyzePhotoAndExtractMetrics(media.id, publicUrl, data.profileId, timestamp)
      .catch(err => console.error('AI photo analysis failed:', err))
  } else if (data.type === 'voice') {
    analyzeAudioAndExtractMetrics(media.id, publicUrl, data.profileId, timestamp)
      .catch(err => console.error('AI audio analysis failed:', err))
  }

  return result
}

export async function getMedia(
  profileId: string,
  type?: MediaType
): Promise<MediaWithUrls[]> {
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

  // Add signed URLs
  const itemsWithUrls = await Promise.all(
    data.map(async (item) => {
      const bucket = item.type === 'photo' ? 'photos' : 'audio'

      // Get signed URL for main file
      const { data: signedData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(item.file_path, 3600 * 24 * 365) // 1 year

      let thumbnail_url: string | undefined
      if (item.thumbnail_path) {
        const { data: thumbSignedData } = await supabase.storage
          .from(bucket)
          .createSignedUrl(item.thumbnail_path, 3600 * 24 * 365)
        thumbnail_url = thumbSignedData?.signedUrl
      }

      return {
        ...item,
        url: signedData?.signedUrl || '',
        thumbnail_url,
      }
    })
  )

  return itemsWithUrls
}

export async function deleteMedia(id: string): Promise<void> {
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

  if (storageError) console.error('Failed to delete files:', storageError)

  // Soft delete from DB
  const { error: dbError } = await supabase
    .from('media')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (dbError) throw dbError
}

// Helper: create thumbnail for images
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

// Helper: get audio duration
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

// Analyze photo and extract metrics
async function analyzePhotoAndExtractMetrics(
  mediaId: string,
  imageUrl: string,
  profileId: string,
  timestamp: string
): Promise<void> {
  try {
    // Update status to analyzing
    await supabase
      .from('media')
      .update({ analysis_status: 'analyzing' })
      .eq('id', mediaId)

    // Call AI analysis API
    const analysisResult = await aiAnalysisService.analyzeImage(imageUrl)

    // Convert measurements to metrics
    const metricsData = aiAnalysisService.convertMeasurementsToMetrics(
      analysisResult.measurements,
      profileId,
      mediaId,
      timestamp,
      'photo'
    )

    // Save metrics to database
    if (metricsData.length > 0) {
      await Promise.all(
        metricsData.map(metricData => metricService.createMetric(metricData))
      )
    }

    // Update status to completed
    await supabase
      .from('media')
      .update({
        analysis_status: 'completed',
        analysis_error: null,
      })
      .eq('id', mediaId)
  } catch (error: any) {
    console.error('AI analysis error:', error)

    // Update status to failed with error message
    await supabase
      .from('media')
      .update({
        analysis_status: 'failed',
        analysis_error: error.message || 'Unknown error',
      })
      .eq('id', mediaId)
  }
}

// Analyze audio and extract metrics
async function analyzeAudioAndExtractMetrics(
  mediaId: string,
  audioUrl: string,
  profileId: string,
  timestamp: string
): Promise<void> {
  try {
    // Update status to analyzing
    await supabase
      .from('media')
      .update({ analysis_status: 'analyzing' })
      .eq('id', mediaId)

    // Call AI analysis API
    const analysisResult = await aiAnalysisService.analyzeAudio(audioUrl)

    // Convert measurements to metrics
    const metricsData = aiAnalysisService.convertMeasurementsToMetrics(
      analysisResult.measurements,
      profileId,
      mediaId,
      timestamp,
      'audio'
    )

    // Save metrics to database
    if (metricsData.length > 0) {
      await Promise.all(
        metricsData.map(metricData => metricService.createMetric(metricData))
      )
    }

    // Update status to completed
    await supabase
      .from('media')
      .update({
        analysis_status: 'completed',
        analysis_error: null,
      })
      .eq('id', mediaId)
  } catch (error: any) {
    console.error('AI audio analysis error:', error)

    // Update status to failed with error message
    await supabase
      .from('media')
      .update({
        analysis_status: 'failed',
        analysis_error: error.message || 'Unknown error',
      })
      .eq('id', mediaId)
  }
}

// Retry failed analysis
export async function retryAnalysis(mediaId: string): Promise<void> {
  // Get media info
  const { data: media, error } = await supabase
    .from('media')
    .select('*')
    .eq('id', mediaId)
    .single()

  if (error || !media) throw new Error('Media not found')

  // Get bucket based on media type
  const bucket = media.type === 'photo' ? 'photos' : 'audio'

  // Get signed URL
  const { data: signedData } = await supabase.storage
    .from(bucket)
    .createSignedUrl(media.file_path, 3600)

  if (!signedData?.signedUrl) throw new Error('Failed to get media URL')

  // Retry analysis based on type
  if (media.type === 'photo') {
    await analyzePhotoAndExtractMetrics(
      media.id,
      signedData.signedUrl,
      media.profile_id,
      media.timestamp
    )
  } else if (media.type === 'voice') {
    await analyzeAudioAndExtractMetrics(
      media.id,
      signedData.signedUrl,
      media.profile_id,
      media.timestamp
    )
  } else {
    throw new Error('Media type does not support analysis')
  }
}
