-- Phase 2: Create private recordings storage bucket
-- Audio files uploaded via signed URLs from /api/storage/upload-url

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recordings',
  'recordings',
  false,
  10485760,  -- 10 MB max
  ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg']
)
ON CONFLICT (id) DO NOTHING;
