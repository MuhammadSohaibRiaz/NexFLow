-- =============================================
-- NexFlow Database Schema
-- Version: 1.0.0
-- Run this first in Supabase SQL Editor
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. USER PROFILES TABLE
-- Extends Supabase auth.users with app-specific data
-- =============================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    brand_voice TEXT,                    -- Custom AI generation instructions
    timezone TEXT DEFAULT 'Asia/Karachi',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth';
COMMENT ON COLUMN public.profiles.brand_voice IS 'Custom instructions for AI content generation';

-- =============================================
-- 2. PLATFORM CONNECTIONS TABLE
-- Stores OAuth tokens for connected social platforms
-- =============================================

CREATE TABLE IF NOT EXISTS public.platform_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'linkedin', 'twitter', 'instagram')),
    access_token TEXT NOT NULL,           -- Encrypted OAuth access token
    refresh_token TEXT,                   -- For token refresh
    token_expires_at TIMESTAMPTZ,
    account_id TEXT,                      -- Platform-specific account ID
    account_name TEXT,                    -- Display name on platform
    page_id TEXT,                         -- For Facebook pages
    page_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one connection per platform per user
    UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_platform_connections_user ON public.platform_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_connections_platform ON public.platform_connections(platform);

COMMENT ON TABLE public.platform_connections IS 'OAuth connections to social media platforms';

-- =============================================
-- 3. PIPELINES TABLE
-- Topic queues with scheduling configuration
-- =============================================

CREATE TABLE IF NOT EXISTS public.pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    platforms TEXT[] DEFAULT '{}',        -- Array of platform names
    frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'bi-weekly', 'monthly')),
    post_time TIME DEFAULT '18:00',       -- Time of day to post
    timezone TEXT DEFAULT 'Asia/Karachi',
    review_required BOOLEAN DEFAULT TRUE, -- Pause for approval before posting
    reminder_minutes INTEGER DEFAULT 60,  -- Minutes before post to send reminder
    is_active BOOLEAN DEFAULT TRUE,
    next_run_at TIMESTAMPTZ,              -- Next scheduled execution
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipelines_user ON public.pipelines(user_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_active ON public.pipelines(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_pipelines_next_run ON public.pipelines(next_run_at) WHERE is_active = TRUE;

COMMENT ON TABLE public.pipelines IS 'Content pipelines with topic queues and scheduling';

-- =============================================
-- 4. TOPICS TABLE
-- Individual topics within a pipeline
-- =============================================

CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes TEXT,                          -- Additional context for AI
    is_evergreen BOOLEAN DEFAULT FALSE,  -- Can be recycled
    recycle_interval_days INTEGER,       -- Days before recycling
    last_used_at TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'generated', 'skipped')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topics_pipeline ON public.topics(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_topics_status ON public.topics(status);
CREATE INDEX IF NOT EXISTS idx_topics_sort ON public.topics(pipeline_id, sort_order);

COMMENT ON TABLE public.topics IS 'Topics queued for content generation in a pipeline';

-- =============================================
-- 5. POSTS TABLE
-- Generated content for each platform
-- =============================================

CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'linkedin', 'twitter', 'instagram')),
    
    -- Content
    content TEXT NOT NULL,                -- Generated post text
    hashtags TEXT[],                      -- Array of hashtags
    image_url TEXT,                       -- Generated/selected image URL
    image_prompt TEXT,                    -- Prompt used for image generation
    
    -- Status tracking
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft',      -- Just created by AI
        'pending',    -- Awaiting review
        'approved',   -- User approved
        'scheduled',  -- Queued for publishing
        'published',  -- Successfully posted
        'failed',     -- Failed to publish
        'skipped'     -- Skipped by user
    )),
    
    -- Scheduling
    scheduled_for TIMESTAMPTZ,
    reminder_sent_at TIMESTAMPTZ,
    auto_proceeded BOOLEAN DEFAULT FALSE, -- True if published without review
    
    -- Publishing results
    published_at TIMESTAMPTZ,
    platform_post_id TEXT,               -- ID from the social platform
    platform_post_url TEXT,              -- Direct link to the post
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_topic ON public.posts(topic_id);
CREATE INDEX IF NOT EXISTS idx_posts_pipeline ON public.posts(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_posts_user ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON public.posts(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_posts_platform ON public.posts(platform);

COMMENT ON TABLE public.posts IS 'Generated and published social media posts';

-- =============================================
-- 6. POST LOGS TABLE
-- Audit trail for post lifecycle
-- =============================================

CREATE TABLE IF NOT EXISTS public.post_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    action TEXT NOT NULL,                 -- created, approved, published, failed, etc.
    details JSONB,                        -- Additional context
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_logs_post ON public.post_logs(post_id);
CREATE INDEX IF NOT EXISTS idx_post_logs_action ON public.post_logs(action);

COMMENT ON TABLE public.post_logs IS 'Audit log for post status changes';

-- =============================================
-- 7. REMINDERS TABLE
-- Pending review reminders
-- =============================================

CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'slack', 'telegram')),
    send_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    auto_proceed_at TIMESTAMPTZ,         -- When to auto-proceed if ignored
    auto_proceeded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_post ON public.reminders(post_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON public.reminders(send_at) WHERE sent_at IS NULL;

COMMENT ON TABLE public.reminders IS 'Review reminders for pending posts';

-- =============================================
-- 8. ANALYTICS TABLE (Basic metrics)
-- =============================================

CREATE TABLE IF NOT EXISTS public.post_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2),
    raw_data JSONB                        -- Full API response for reference
);

CREATE INDEX IF NOT EXISTS idx_post_analytics_post ON public.post_analytics(post_id);

COMMENT ON TABLE public.post_analytics IS 'Engagement metrics fetched from platforms';

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ NexFlow schema created successfully!';
    RAISE NOTICE 'Tables created: profiles, platform_connections, pipelines, topics, posts, post_logs, reminders, post_analytics';
END $$;
