-- =============================================
-- 011_setup_image_storage.sql
-- Setup Supabase Storage for Post Images
-- =============================================

-- 1. Create the 'posts' bucket if it doesn't exist
-- Note: 'storage.buckets' table is where buckets are defined.
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up Storage Policies
-- We allow anyone to READ images (public: true handled above)
-- We only allow the service role (meaning our backend) to upload/update/delete

-- POLICY: Allow public access to read
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'posts' );

-- POLICY: Allow service role to manage everything (implicit in service role key, but explicit here for clarity)
-- Usually service role bypasses RLS, but if you want to be extra safe:
CREATE POLICY "Service Role Manage"
ON storage.objects FOR ALL
TO service_role
USING ( bucket_id = 'posts' )
WITH CHECK ( bucket_id = 'posts' );
