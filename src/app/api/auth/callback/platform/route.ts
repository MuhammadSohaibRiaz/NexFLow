import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Platform } from "@/lib/types";

// Handle OAuth callback for platform connection
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const platform = searchParams.get("platform") as Platform;
    const errorParam = searchParams.get("error");

    if (errorParam) {
        return NextResponse.redirect(
            `${origin}/dashboard/platforms?error=${encodeURIComponent(errorParam)}`
        );
    }

    if (!code || !platform) {
        return NextResponse.redirect(`${origin}/dashboard/platforms?error=missing_params`);
    }

    const supabase = await createClient();

    // Exchange code for session
    const { data: sessionData, error: sessionError } =
        await supabase.auth.exchangeCodeForSession(code);

    if (sessionError || !sessionData.session) {
        return NextResponse.redirect(`${origin}/dashboard/platforms?error=auth_failed`);
    }

    // Get the provider token from the session
    const providerToken = sessionData.session.provider_token;
    const providerRefreshToken = sessionData.session.provider_refresh_token;

    if (!providerToken) {
        return NextResponse.redirect(`${origin}/dashboard/platforms?error=no_token`);
    }

    // Get user info
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
        return NextResponse.redirect(`${origin}/dashboard/platforms?error=no_user`);
    }

    // Store the platform connection
    const { error: insertError } = await supabase.from("platform_connections").upsert(
        {
            user_id: userData.user.id,
            platform: platform,
            access_token: providerToken,
            refresh_token: providerRefreshToken || null,
            token_expires_at: sessionData.session.expires_at
                ? new Date(sessionData.session.expires_at * 1000).toISOString()
                : null,
            account_id: userData.user.user_metadata?.provider_id || null,
            account_name:
                userData.user.user_metadata?.full_name ||
                userData.user.user_metadata?.name ||
                userData.user.email,
            is_active: true,
        },
        {
            onConflict: "user_id,platform",
        }
    );

    if (insertError) {
        console.error("Failed to store platform connection:", insertError);
        return NextResponse.redirect(`${origin}/dashboard/platforms?error=storage_failed`);
    }

    // Success - redirect with success message
    return NextResponse.redirect(`${origin}/dashboard/platforms?connected=${platform}`);
}
