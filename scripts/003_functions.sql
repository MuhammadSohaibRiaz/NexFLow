-- =============================================
-- NexFlow Database Functions & Triggers
-- Version: 1.0.0
-- Run this THIRD after 002_rls_policies.sql
-- =============================================

-- =============================================
-- 1. AUTO-CREATE PROFILE ON USER SIGNUP
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, timezone)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'timezone', 'Asia/Karachi')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 2. AUTO-UPDATE updated_at TIMESTAMP
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_connections_updated_at
    BEFORE UPDATE ON public.platform_connections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pipelines_updated_at
    BEFORE UPDATE ON public.pipelines
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 3. LOG POST STATUS CHANGES
-- =============================================

CREATE OR REPLACE FUNCTION public.log_post_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.post_logs (post_id, action, details)
        VALUES (
            NEW.id,
            NEW.status,
            jsonb_build_object(
                'previous_status', OLD.status,
                'new_status', NEW.status,
                'changed_at', NOW()
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_post_status_change
    AFTER UPDATE OF status ON public.posts
    FOR EACH ROW EXECUTE FUNCTION public.log_post_status_change();

-- =============================================
-- 4. CALCULATE NEXT RUN TIME FOR PIPELINE
-- =============================================

CREATE OR REPLACE FUNCTION public.calculate_next_run(
    p_frequency TEXT,
    p_post_time TIME,
    p_timezone TEXT,
    p_last_run TIMESTAMPTZ DEFAULT NULL
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_base_date DATE;
    v_next_run TIMESTAMPTZ;
    v_interval INTERVAL;
BEGIN
    -- Determine interval based on frequency
    CASE p_frequency
        WHEN 'daily' THEN v_interval := INTERVAL '1 day';
        WHEN 'weekly' THEN v_interval := INTERVAL '1 week';
        WHEN 'bi-weekly' THEN v_interval := INTERVAL '2 weeks';
        WHEN 'monthly' THEN v_interval := INTERVAL '1 month';
        ELSE v_interval := INTERVAL '1 week';
    END CASE;
    
    -- Calculate base date
    IF p_last_run IS NULL THEN
        v_base_date := CURRENT_DATE;
    ELSE
        v_base_date := (p_last_run AT TIME ZONE p_timezone)::DATE + v_interval;
    END IF;
    
    -- Combine date and time in the specified timezone
    v_next_run := (v_base_date || ' ' || p_post_time)::TIMESTAMP AT TIME ZONE p_timezone;
    
    -- If the calculated time is in the past, add interval
    WHILE v_next_run <= NOW() LOOP
        v_next_run := v_next_run + v_interval;
    END LOOP;
    
    RETURN v_next_run;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. AUTO-SET NEXT RUN ON PIPELINE CREATE/UPDATE
-- =============================================

CREATE OR REPLACE FUNCTION public.set_pipeline_next_run()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = TRUE THEN
        NEW.next_run_at := public.calculate_next_run(
            NEW.frequency,
            NEW.post_time,
            NEW.timezone,
            NEW.last_run_at
        );
    ELSE
        NEW.next_run_at := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_pipeline_schedule_change
    BEFORE INSERT OR UPDATE OF frequency, post_time, timezone, is_active, last_run_at
    ON public.pipelines
    FOR EACH ROW EXECUTE FUNCTION public.set_pipeline_next_run();

-- =============================================
-- 6. GET USER DASHBOARD STATS
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_dashboard_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'pipelines_count', (SELECT COUNT(*) FROM public.pipelines WHERE user_id = p_user_id AND is_active = TRUE),
        'scheduled_count', (SELECT COUNT(*) FROM public.posts WHERE user_id = p_user_id AND status = 'scheduled'),
        'pending_count', (SELECT COUNT(*) FROM public.posts WHERE user_id = p_user_id AND status = 'pending'),
        'published_this_week', (
            SELECT COUNT(*) FROM public.posts 
            WHERE user_id = p_user_id 
            AND status = 'published' 
            AND published_at >= NOW() - INTERVAL '7 days'
        ),
        'platforms_connected', (SELECT COUNT(*) FROM public.platform_connections WHERE user_id = p_user_id AND is_active = TRUE)
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. GET NEXT TOPICS TO PROCESS
-- =============================================

CREATE OR REPLACE FUNCTION public.get_next_topics_for_pipeline(p_pipeline_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
    id UUID,
    title TEXT,
    notes TEXT,
    is_evergreen BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.title, t.notes, t.is_evergreen
    FROM public.topics t
    WHERE t.pipeline_id = p_pipeline_id
    AND t.status = 'pending'
    ORDER BY t.sort_order ASC, t.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. MARK POST AS PUBLISHED
-- =============================================

CREATE OR REPLACE FUNCTION public.mark_post_published(
    p_post_id UUID,
    p_platform_post_id TEXT,
    p_platform_post_url TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.posts
    SET 
        status = 'published',
        published_at = NOW(),
        platform_post_id = p_platform_post_id,
        platform_post_url = p_platform_post_url
    WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 9. MARK POST AS FAILED
-- =============================================

CREATE OR REPLACE FUNCTION public.mark_post_failed(
    p_post_id UUID,
    p_error_message TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.posts
    SET 
        status = 'failed',
        error_message = p_error_message,
        retry_count = retry_count + 1
    WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Database functions and triggers created successfully!';
    RAISE NOTICE 'Functions: handle_new_user, update_updated_at, log_post_status_change, calculate_next_run, get_user_dashboard_stats, etc.';
END $$;
