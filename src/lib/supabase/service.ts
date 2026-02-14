import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase admin client using the Service Role Key.
 * This bypasses Row Level Security (RLS) and should ONLY be used
 * in secure server-side contexts like cron jobs and background services.
 *
 * DO NOT use this in user-facing API routes or components.
 */
export function createServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
