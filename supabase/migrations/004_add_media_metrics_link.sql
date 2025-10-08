-- Add AI Analysis Support
-- Created: 2024-10-07
-- Description: Links media (photos) to extracted metrics and tracks analysis status

-- ============================================================================
-- Add analysis tracking to media table
-- ============================================================================

-- Add analysis status column
ALTER TABLE public.media
ADD COLUMN analysis_status TEXT CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed', 'not_applicable')),
ADD COLUMN analysis_error TEXT;

-- Set default status for photos to 'pending', others to 'not_applicable'
UPDATE public.media
SET analysis_status = CASE
  WHEN type = 'photo' THEN 'pending'
  ELSE 'not_applicable'
END
WHERE analysis_status IS NULL;

-- Set NOT NULL constraint after setting defaults
ALTER TABLE public.media
ALTER COLUMN analysis_status SET DEFAULT 'not_applicable',
ALTER COLUMN analysis_status SET NOT NULL;

-- Index for filtering by analysis status
CREATE INDEX idx_media_analysis_status ON public.media(analysis_status);

-- ============================================================================
-- Add media_id link to metrics table
-- ============================================================================

-- Add optional foreign key to link metrics extracted from photos
ALTER TABLE public.metrics
ADD COLUMN media_id UUID REFERENCES public.media(id) ON DELETE SET NULL;

-- Index for finding metrics by media
CREATE INDEX idx_metrics_media_id ON public.metrics(media_id);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN public.media.analysis_status IS 'AI analysis status: pending=not analyzed, analyzing=in progress, completed=done, failed=error, not_applicable=voice notes';
COMMENT ON COLUMN public.media.analysis_error IS 'Error message if analysis failed';
COMMENT ON COLUMN public.metrics.media_id IS 'Optional link to media (photo) from which this metric was extracted';
