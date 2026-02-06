import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Platform } from "@/lib/types";

// Initiate OAuth flow for a platform
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const platform = searchParams.get("platform") as Platform;

    if (!platform || !["facebook", "linkedin", "twitter", "instagram"].includes(platform)) {
        return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    const supabase = await createClient();

    // Map platform to Supabase provider
    const providerMap: Record<string, string> = {
        facebook: "facebook",
        linkedin: "linkedin_oidc",
        twitter: "twitter",
        instagram: "facebook", // Instagram uses Facebook OAuth
    };

    const provider = providerMap[platform];

    // Get the OAuth scopes based on platform
    const scopesMap: Record<string, string> = {
        facebook: "public_profile,email,pages_manage_posts,pages_read_engagement",
        linkedin_oidc: "openid,profile,email,w_member_social",
        twitter: "tweet.read,tweet.write,users.read",
    };

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as "facebook" | "linkedin_oidc" | "twitter",
        options: {
            redirectTo: `${origin}/api/auth/callback/platform?platform=${platform}`,
            scopes: scopesMap[provider],
        },
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data.url) {
        return NextResponse.redirect(data.url);
    }

    return NextResponse.json({ error: "Failed to initiate OAuth" }, { status: 500 });
}
