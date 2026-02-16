import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import type { Platform } from "@/lib/types";

// Initiate Manual OAuth flow
// This bypasses Supabase Auth to prevent session switching
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const platform = searchParams.get("platform") as Platform;

    if (!platform || !["facebook", "linkedin", "twitter", "instagram"].includes(platform)) {
        return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Verify User is Logged In
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.redirect(`${origin}/login?error=must_be_logged_in`);
    }

    // 2. Generate Random State (CSRF Protection)
    const state = crypto.randomUUID();
    const cookieStore = await cookies();

    // Store state in secure HTTP-only cookie
    // We also store the platform to verify it later
    const stateValue = JSON.stringify({ state, platform, userId: user.id });
    cookieStore.set("oauth_state", stateValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 10, // 10 minutes
        path: "/",
        sameSite: "lax",
    });

    // 3. Construct Provider Authorization URL
    let authUrl = "";
    const redirectUri = `${origin}/api/auth/callback/platform`;

    if (platform === "facebook") {
        const appId = process.env.FACEBOOK_APP_ID;
        const scopes = "public_profile,pages_manage_posts,pages_read_engagement,pages_show_list";
        // Reverted to v18.0 as v19.0 caused transient errors
        authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(stateValue)}&scope=${scopes}`;
    }
    else if (platform === "instagram") {
        // Instagram via Facebook Graph API
        const appId = process.env.FACEBOOK_APP_ID;
        // Scopes needed for Instagram Publishing
        // Added business_management to ensure we can see Pages owned by a Business Manager
        const scopes = "public_profile,instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management";
        // auth_type=reauthenticate forces the user to re-enter password, clearing any stale session issues
        authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(stateValue)}&scope=${scopes}&auth_type=reauthenticate`;
    }
    else if (platform === "linkedin") {
        const clientId = process.env.LINKEDIN_CLIENT_ID;
        // Added rw_organization_admin and w_organization_social to support Company Pages
        const scopes = "openid profile email w_member_social rw_organization_admin w_organization_social";
        authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(stateValue)}&scope=${encodeURIComponent(scopes)}`;
    }
    else if (platform === "twitter") {
        const clientId = process.env.TWITTER_CLIENT_ID;
        // PKCE Flow
        const codeVerifier = crypto.randomUUID() + crypto.randomUUID(); // Simple enough entropy
        const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

        // Update state to include codeVerifier
        const stateObj = JSON.parse(stateValue);
        stateObj.codeVerifier = codeVerifier;
        const updatedStateValue = JSON.stringify(stateObj);

        // Update cookie with new state containing verifier
        cookieStore.set("oauth_state", updatedStateValue, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 10, // 10 minutes
            path: "/",
            sameSite: "lax",
        });

        // tweet.read tweet.write users.read offline.access
        const scopes = "tweet.read tweet.write users.read offline.access";
        // We accept that we are sending a larger state object (JSON) encoded in the URL.
        authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    }

    // 4. Redirect User to Provider
    return NextResponse.redirect(authUrl);
}
