-- =============================================
-- Debug: Check Platform Connections
-- Run this in Supabase SQL Editor
-- =============================================

SELECT 
    user_id,
    platform,
    account_id,
    account_name,
    is_active,
    -- Show first 10 chars of token to verify it exists but not expose full secret
    '...' || RIGHT(access_token, 10) as token_fragment,
    updated_at
FROM 
    public.platform_connections;
