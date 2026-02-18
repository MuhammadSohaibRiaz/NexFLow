-- 1. Add voice_examples to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS voice_examples JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN profiles.voice_examples IS 'Array of sample user posts for AI few-shot learning';

-- 2. Add retry_count to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
COMMENT ON COLUMN posts.retry_count IS 'Number of times the post has been retried after failure';
