-- =============================================
-- Migration 010: Performance Indexes
-- Run this in Supabase SQL Editor to speed up dashboard queries
-- =============================================

-- 1. POSTS TABLE INDEXES
-- Optimizes: Dashboard > Posts (List View), Analytics, Calendar

-- For default post list sorted by creation
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON public.posts(user_id, created_at DESC);

-- For filtered post lists (e.g. "Drafts", "Scheduled")
CREATE INDEX IF NOT EXISTS idx_posts_user_status_created ON public.posts(user_id, status, created_at DESC);

-- For Analytics: "Last 7 days volume" & "Platform distribution" (only published posts matters)
CREATE INDEX IF NOT EXISTS idx_posts_user_published_at_partial ON public.posts(user_id, published_at DESC) 
WHERE status = 'published';

-- For Calendar & Queue: Fetching upcoming scheduled posts
CREATE INDEX IF NOT EXISTS idx_posts_user_scheduled_for_partial ON public.posts(user_id, scheduled_for ASC) 
WHERE status = 'scheduled';


-- 2. TOPICS TABLE INDEXES
-- Optimizes: Pipeline generation & Topic management UI

-- For fetching pending topics in order (FIFO for generation)
CREATE INDEX IF NOT EXISTS idx_topics_pipeline_status_sort ON public.topics(pipeline_id, status, sort_order ASC);


-- 3. PIPELINES TABLE INDEXES
-- Optimizes: Dashboard > Pipelines list & Cron Jobs

-- For User's Pipeline List
CREATE INDEX IF NOT EXISTS idx_pipelines_user_active_created ON public.pipelines(user_id, is_active, created_at DESC);

-- For Cron Job: Finding active pipelines due for execution (Global scan)
CREATE INDEX IF NOT EXISTS idx_pipelines_active_next_run ON public.pipelines(is_active, next_run_at ASC) 
WHERE is_active = TRUE;


-- 4. PLATFORM CONNECTIONS
-- Optimizes: Dashboard > Platforms & posting authentication checks

-- For quickly checking connected platforms
CREATE INDEX IF NOT EXISTS idx_platform_connections_user_active ON public.platform_connections(user_id, is_active);


-- SUCCESS MESSAGE
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 010 complete: Performance indexes applied successfully.';
END $$;
