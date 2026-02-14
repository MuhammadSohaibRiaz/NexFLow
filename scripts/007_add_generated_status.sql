-- =============================================
-- Migration 007: Add 'generated' to posts.status
-- Run this in Supabase SQL Editor
-- =============================================
-- This adds the 'generated' status to the posts table CHECK constraint.
-- Posts will now follow this lifecycle:
--   generated → (user approves) → scheduled → published
--   generated → (auto, no review) → scheduled → published

-- Step 1: Drop the existing CHECK constraint on status
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_status_check;

-- Step 2: Re-create it with 'generated' included
ALTER TABLE public.posts ADD CONSTRAINT posts_status_check CHECK (
    status IN (
        'draft',
        'pending',
        'generated',   -- NEW: AI content generated, awaiting review or scheduling
        'approved',
        'scheduled',
        'published',
        'failed',
        'skipped'
    )
);

-- Step 3 (Optional): Migrate any existing 'pending' posts to 'generated'
-- if they were created by the cron and haven't been manually reviewed.
-- Uncomment the line below ONLY if you want to retroactively fix old posts:
-- UPDATE public.posts SET status = 'generated' WHERE status = 'pending';

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 007 complete: "generated" status added to posts table.';
END $$;
