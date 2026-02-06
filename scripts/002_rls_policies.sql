-- =============================================
-- NexFlow Row Level Security Policies
-- Version: 1.0.0
-- Run this SECOND after 001_schema.sql
-- =============================================

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES POLICIES
-- Users can only access their own profile
-- =============================================

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- =============================================
-- PLATFORM CONNECTIONS POLICIES
-- Users can only manage their own connections
-- =============================================

CREATE POLICY "Users can view own platform connections"
    ON public.platform_connections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own platform connections"
    ON public.platform_connections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own platform connections"
    ON public.platform_connections FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own platform connections"
    ON public.platform_connections FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- PIPELINES POLICIES
-- Users can only manage their own pipelines
-- =============================================

CREATE POLICY "Users can view own pipelines"
    ON public.pipelines FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pipelines"
    ON public.pipelines FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pipelines"
    ON public.pipelines FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pipelines"
    ON public.pipelines FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- TOPICS POLICIES
-- Users can manage topics in their own pipelines
-- =============================================

CREATE POLICY "Users can view topics in own pipelines"
    ON public.topics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.pipelines p 
            WHERE p.id = pipeline_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create topics in own pipelines"
    ON public.topics FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pipelines p 
            WHERE p.id = pipeline_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update topics in own pipelines"
    ON public.topics FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.pipelines p 
            WHERE p.id = pipeline_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete topics in own pipelines"
    ON public.topics FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.pipelines p 
            WHERE p.id = pipeline_id AND p.user_id = auth.uid()
        )
    );

-- =============================================
-- POSTS POLICIES
-- Users can manage their own posts
-- =============================================

CREATE POLICY "Users can view own posts"
    ON public.posts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own posts"
    ON public.posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
    ON public.posts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
    ON public.posts FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- POST LOGS POLICIES
-- Users can view logs for their own posts
-- =============================================

CREATE POLICY "Users can view logs for own posts"
    ON public.post_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.posts p 
            WHERE p.id = post_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create logs for own posts"
    ON public.post_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.posts p 
            WHERE p.id = post_id AND p.user_id = auth.uid()
        )
    );

-- =============================================
-- REMINDERS POLICIES
-- Users can manage their own reminders
-- =============================================

CREATE POLICY "Users can view own reminders"
    ON public.reminders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reminders"
    ON public.reminders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
    ON public.reminders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
    ON public.reminders FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- POST ANALYTICS POLICIES
-- Users can view analytics for their own posts
-- =============================================

CREATE POLICY "Users can view analytics for own posts"
    ON public.post_analytics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.posts p 
            WHERE p.id = post_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert analytics for own posts"
    ON public.post_analytics FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.posts p 
            WHERE p.id = post_id AND p.user_id = auth.uid()
        )
    );

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Row Level Security policies created successfully!';
    RAISE NOTICE 'All tables now have RLS enabled with user-scoped access';
END $$;
