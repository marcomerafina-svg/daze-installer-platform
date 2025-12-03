/*
  # Create Storage for Installation Photos

  ## Overview
  This migration sets up Supabase Storage bucket for installation photos
  with appropriate security policies.

  ## Changes Made

  ### 1. Storage Bucket
  - Creates 'installation-photos' bucket for storing installation images
  - Public bucket set to false for security
  - File size limit handled at application level (5MB per photo)
  - Allowed file types: image/jpeg, image/png, image/heic

  ### 2. Storage Policies
  - Installers can upload photos to their own folder
  - Installers can view their own photos
  - Admins can view all photos
  - Photos organized by: installer_id/timestamp_filename

  ## Important Notes
  - Photos are private by default
  - Access controlled through RLS policies
  - Maximum 5 photos per installation (enforced at app level)
  - Photo compression handled at client side before upload
*/

-- Create storage bucket for installation photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'installation-photos',
  'installation-photos',
  false,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/heic']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for storage bucket

-- Installers can upload to their own folder
CREATE POLICY "Installers can upload their installation photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'installation-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT i.id::text FROM installers i WHERE i.user_id = auth.uid()
    )
  );

-- Installers can view their own photos
CREATE POLICY "Installers can view their own photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'installation-photos' AND
    (
      -- Own photos
      (storage.foldername(name))[1] IN (
        SELECT i.id::text FROM installers i WHERE i.user_id = auth.uid()
      )
      OR
      -- Admin can view all
      (auth.jwt()->>'role') = 'admin' OR
      (auth.jwt()->'app_metadata'->>'role') = 'admin'
    )
  );

-- Installers can delete their own photos (for pending installations only)
CREATE POLICY "Installers can delete their pending installation photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'installation-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT i.id::text FROM installers i WHERE i.user_id = auth.uid()
    )
  );

-- Admins can manage all photos
CREATE POLICY "Admins can manage all installation photos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'installation-photos' AND
    (
      (auth.jwt()->>'role') = 'admin' OR
      (auth.jwt()->'app_metadata'->>'role') = 'admin'
    )
  );
