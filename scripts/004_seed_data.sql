-- =============================================
-- NexFlow Seed Data (Optional - for Development)
-- Version: 1.0.0
-- Run this LAST - only for testing/development
-- =============================================

-- NOTE: This script creates sample data for testing.
-- DO NOT run this in production!

-- =============================================
-- SAMPLE DATA WILL BE CREATED FOR THE FIRST USER
-- After running 001-003, sign up a user first,
-- then run this script to populate test data.
-- =============================================

-- Create a sample pipeline for the first user
DO $$
DECLARE
    v_user_id UUID;
    v_pipeline_id UUID;
    v_topic_id UUID;
BEGIN
    -- Get the first user (if any)
    SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '⚠️ No users found. Sign up first, then run this script.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Creating sample data for user: %', v_user_id;
    
    -- Create a sample pipeline
    INSERT INTO public.pipelines (
        id, user_id, name, description, platforms, frequency, post_time, timezone, review_required, reminder_minutes
    ) VALUES (
        uuid_generate_v4(),
        v_user_id,
        'DevOps Weekly Tips',
        'Weekly tips and best practices for DevOps engineers and cloud enthusiasts',
        ARRAY['facebook', 'linkedin'],
        'weekly',
        '18:00',
        'Asia/Karachi',
        TRUE,
        60
    ) RETURNING id INTO v_pipeline_id;
    
    RAISE NOTICE 'Created pipeline: %', v_pipeline_id;
    
    -- Add sample topics
    INSERT INTO public.topics (pipeline_id, title, notes, is_evergreen, sort_order) VALUES
        (v_pipeline_id, 'Docker Best Practices for 2026', 'Focus on multi-stage builds and security scanning', FALSE, 1),
        (v_pipeline_id, 'Kubernetes Cost Optimization Tips', 'Resource limits, right-sizing, spot instances', FALSE, 2),
        (v_pipeline_id, 'CI/CD Pipeline Security Essentials', 'Secret management, SAST/DAST, supply chain', FALSE, 3),
        (v_pipeline_id, 'Infrastructure as Code with Terraform', 'State management, modules, best practices', TRUE, 4),
        (v_pipeline_id, 'Monitoring and Observability Stack', 'Prometheus, Grafana, OpenTelemetry setup', TRUE, 5);
    
    RAISE NOTICE 'Created 5 sample topics';
    
    -- Create a second sample pipeline
    INSERT INTO public.pipelines (
        id, user_id, name, description, platforms, frequency, post_time, timezone, review_required, reminder_minutes
    ) VALUES (
        uuid_generate_v4(),
        v_user_id,
        'SEO Tips for Startups',
        'Actionable SEO strategies for bootstrapped founders',
        ARRAY['linkedin'],
        'bi-weekly',
        '10:00',
        'Asia/Karachi',
        FALSE,
        30
    ) RETURNING id INTO v_pipeline_id;
    
    RAISE NOTICE 'Created second pipeline: %', v_pipeline_id;
    
    -- Add topics to second pipeline
    INSERT INTO public.topics (pipeline_id, title, notes, is_evergreen, sort_order) VALUES
        (v_pipeline_id, 'Technical SEO Audit Checklist', 'Core Web Vitals, crawlability, schema markup', TRUE, 1),
        (v_pipeline_id, 'Content Strategy for B2B SaaS', 'Topic clusters, TOFU/MOFU/BOFU approach', FALSE, 2),
        (v_pipeline_id, 'Link Building for Dev Tools', 'Developer communities, open source, guest posts', FALSE, 3);
    
    RAISE NOTICE 'Created 3 more sample topics';
    
    RAISE NOTICE '✅ Seed data created successfully!';
    RAISE NOTICE 'You now have 2 pipelines with 8 topics total.';
    
END $$;
