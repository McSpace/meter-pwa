-- Health Dashboard - Initial Schema Migration
-- Created: 2024-10-06
-- Description: Creates users, profiles, metrics, and media tables with proper relationships

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Note: Supabase Auth already creates auth.users table
-- We'll create a public.users table that references auth.users
-- This allows us to extend user data while leveraging Supabase Auth

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_users_created_at ON public.users(created_at);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PROFILES TABLE (Family Members)
-- ============================================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F', 'O')),
  date_of_birth DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_deleted_at ON public.profiles(deleted_at);

-- Updated_at trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- METRICS TABLE (Health Measurements)
-- ============================================================================

CREATE TABLE public.metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT valid_metric_type CHECK (type IN ('weight', 'bloodPressure', 'pulse')),
  CONSTRAINT valid_value CHECK (value > 0)
);

-- Indexes for fast queries
CREATE INDEX idx_metrics_profile_id ON public.metrics(profile_id);
CREATE INDEX idx_metrics_type ON public.metrics(type);
CREATE INDEX idx_metrics_timestamp ON public.metrics(timestamp DESC);
CREATE INDEX idx_metrics_deleted_at ON public.metrics(deleted_at);
CREATE INDEX idx_metrics_profile_type ON public.metrics(profile_id, type);

-- Updated_at trigger
CREATE TRIGGER update_metrics_updated_at
  BEFORE UPDATE ON public.metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MEDIA TABLE (Photos & Voice Notes)
-- ============================================================================

CREATE TABLE public.media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('photo', 'voice')),

  -- Storage paths (in Supabase Storage)
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,

  -- File metadata
  size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  duration INTEGER, -- seconds, for audio only

  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT valid_size CHECK (size > 0),
  CONSTRAINT valid_duration CHECK (duration IS NULL OR duration > 0)
);

-- Indexes
CREATE INDEX idx_media_profile_id ON public.media(profile_id);
CREATE INDEX idx_media_type ON public.media(type);
CREATE INDEX idx_media_timestamp ON public.media(timestamp DESC);
CREATE INDEX idx_media_deleted_at ON public.media(deleted_at);
CREATE INDEX idx_media_profile_type ON public.media(profile_id, type);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate age from date of birth
CREATE OR REPLACE FUNCTION calculate_age(date_of_birth DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get profile with age
CREATE OR REPLACE FUNCTION get_profile_with_age(profile_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  gender TEXT,
  date_of_birth DATE,
  age INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.name,
    p.gender,
    p.date_of_birth,
    calculate_age(p.date_of_birth) as age,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.id = profile_id AND p.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.users IS 'Extended user data referencing Supabase Auth users';
COMMENT ON TABLE public.profiles IS 'Family member profiles - one user can have multiple profiles';
COMMENT ON TABLE public.metrics IS 'Health metrics (weight, blood pressure, pulse)';
COMMENT ON TABLE public.media IS 'Photos and voice notes stored in Supabase Storage';

COMMENT ON COLUMN public.profiles.gender IS 'M=Male, F=Female, O=Other';
COMMENT ON COLUMN public.metrics.type IS 'weight, bloodPressure, pulse';
COMMENT ON COLUMN public.media.duration IS 'Duration in seconds for audio files only';
