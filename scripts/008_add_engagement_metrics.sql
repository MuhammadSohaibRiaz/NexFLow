-- Add engagement_metrics column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS engagement_metrics JSONB DEFAULT '{}'::jsonb;

-- Update the check constraint to include generated status (previously added, but ensuring it's here for consistency if needed)
-- ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
-- ALTER TABLE posts ADD CONSTRAINT posts_status_check CHECK (status IN ('draft', 'pending', 'approved', 'generated', 'scheduled', 'published', 'failed', 'skipped'));

COMMENT ON COLUMN posts.engagement_metrics IS 'Stores platform-specific metrics like likes, shares, views, etc.';
