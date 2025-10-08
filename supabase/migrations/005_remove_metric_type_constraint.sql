-- Remove metric type constraint to allow dynamic types
-- Created: 2024-10-08
-- Description: Allows saving any metric type from AI analysis, not just predefined ones

-- Drop the constraint that limits metric types
ALTER TABLE public.metrics
DROP CONSTRAINT IF EXISTS valid_metric_type;

-- Add comment
COMMENT ON COLUMN public.metrics.type IS 'Metric type - can be any value (weight, bloodPressure, pulse, temperature, etc.)';
