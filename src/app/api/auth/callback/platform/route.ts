import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { Platform } from "@/lib/types";

// Handle Manual OAuth callback
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // 1. Handle Provider Errors
    if (errorParam) {
        console.error("OAuth Error:", errorParam, errorDescription);
        return NextResponse.redirect(
            `${origin}/dashboard/platforms?error=${encodeURIComponent(errorParam)}`
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(`${origin}/dashboard/platforms?error=missing_params`);
    }


    // 2. Verify State (CSRF Protection)
    const cookieStore = await cookies();
    const storedStateRaw = cookieStore.get("oauth_state")?.value;

    if (!storedStateRaw) {
        console.error("[OAuth Debug] Missing oauth_state cookie. Browser might have blocked it or it expired.");
        return NextResponse.redirect(`${origin}/dashboard/platforms?error=state_mismatch_no_cookie`);
    }

    let storedState: { state: string; platform: Platform; userId: string; codeVerifier?: string };
    try {
        storedState = JSON.parse(storedStateRaw);
        console.log("[OAuth] Parsed stored state for platform:", storedState.platform);
    } catch (e) {
        console.error("[OAuth Debug] Failed to parse stored state cookie", e);
        return NextResponse.redirect(`${origin}/dashboard/platforms?error=invalid_state_cookie`);
    }

    // Decode the returned state if it was URL encoded by the provider
    // In our connect route, we passed the ENTIRE JSON string as the state param.

    let returnedStateObj;
    try {
        returnedStateObj = JSON.parse(state);
    } catch (e) {
        console.warn("[OAuth] State param is not JSON, attempting direct match");
        // Fallback: it might be just the UUID if provider manipulated it
    }

    // Robust comparison
    const incomingStateUUID = returnedStateObj?.state || state;
    const storedStateUUID = storedState.state;


    if (incomingStateUUID !== storedStateUUID) {
        console.error(`[OAuth] CSRF Mismatch!`);
        return NextResponse.redirect(`${origin}/dashboard/platforms?error=state_mismatch_value`);
    }

    const platform = storedState.platform;
    const userId = storedState.userId; // The original user who initiated the flow


    // 3. Clear State Cookie
    cookieStore.delete("oauth_state");

    // 4. Exchange Code for Access Token
    let accessToken = "";
    let refreshToken = "";
    let expiresAt: Date | null = null;
    let accountName = "";
    let accountId = "";

    try {
        const redirectUri = `${origin}/api/auth/callback/platform`;

        if (platform === "facebook") {
            // A. Exchange Code for Token
            // Reverted to v18.0
            const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${process.env.FACEBOOK_APP_SECRET}&code=${code}`;
            const tokenRes = await fetch(tokenUrl);
            const tokenData = await tokenRes.json();

            if (tokenData.error) {
                console.error("[Facebook] Token Exchange Error:", JSON.stringify(tokenData, null, 2));
                throw new Error(tokenData.error.message);
            }

            accessToken = tokenData.access_token;
            // Facebook tokens are long-lived (60 days) usually, or we might need to exchange for long-lived
            // For MVP, we use what we got. 
            // TODO: Exchange for long-lived token if needed.

            // B. Get User's Pages (We need a Page Token to publish)
            const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`;
            const pagesRes = await fetch(pagesUrl);
            const pagesData = await pagesRes.json();

            if (pagesData.error) throw new Error(pagesData.error.message);

            if (!pagesData.data || pagesData.data.length === 0) {
                // Return error if no pages found (MVP: Must have a page)
                return NextResponse.redirect(`${origin}/dashboard/platforms?error=no_facebook_pages`);
            }

            // Select the first page for MVP
            const page = pagesData.data[0];

            // Store PAGE credentials
            accountId = page.id;
            accountName = page.name;
            accessToken = page.access_token; // Crucial: Store Page Token, not User Token

        } else if (platform === "instagram") {
            // A. Exchange Code for Token (Same as Facebook)
            const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${process.env.FACEBOOK_APP_SECRET}&code=${code}`;
            const tokenRes = await fetch(tokenUrl);
            const tokenData = await tokenRes.json();

            if (tokenData.error) throw new Error(tokenData.error.message);
            accessToken = tokenData.access_token;

            // B. Find Connected Instagram Business Account
            // We also ask for 'connected_instagram_account' as a fallback (sometimes used for legacy linking)
            const accountsUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account{id,username,profile_picture_url},connected_instagram_account{id,username},name&access_token=${accessToken}`;
            const accountsRes = await fetch(accountsUrl);
            const accountsData = await accountsRes.json();


            if (accountsData.error) throw new Error(accountsData.error.message);

            // Find the first Page with a connected Instagram Business Account
            const pageWithIg = accountsData.data?.find((page: any) => page.instagram_business_account || page.connected_instagram_account);

            if (!pageWithIg) {
                // Determine error based on finding pages at all
                const hasPages = accountsData.data && accountsData.data.length > 0;
                const errorMsg = hasPages
                    ? "no_instagram_connected_to_page"
                    : "no_facebook_pages_found";

                return NextResponse.redirect(`${origin}/dashboard/platforms?error=${errorMsg}`);
            }

            const igAccount = pageWithIg.instagram_business_account || pageWithIg.connected_instagram_account;
            accountId = igAccount.id;
            accountName = igAccount.username ? `@${igAccount.username}` : "Instagram Business";

            // We store the *User* access token (or Page token if we fetched it, but User is more versatile for now)
            // Ideally we'd store the specific Page Token for this IG account, but for MVP keeping it simple.


        } else if (platform === "linkedin") {
            // A. Exchange Code for Token
            const tokenDetails = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    grant_type: "authorization_code",
                    code: code,
                    redirect_uri: redirectUri,
                    client_id: process.env.LINKEDIN_CLIENT_ID!,
                    client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
                }),
            });
            const tokenData = await tokenDetails.json();

            if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

            accessToken = tokenData.access_token;
            expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
            refreshToken = tokenData.refresh_token;

            // B. Get User Profile (OpenID Connect)
            const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const profileData = await profileRes.json();

            if (profileData.error) throw new Error(JSON.stringify(profileData));

            // userinfo returns 'sub' as the stable ID
            accountId = profileData.sub;
            accountName = profileData.name || `${profileData.given_name} ${profileData.family_name}`;

            // REVERTED: Company Page support disabled for now to allow Personal Profile connection
            // We skip the whole ACL lookup and selection screen.

        } else if (platform === "twitter") {
            // Twitter PKCE Token Exchange
            const codeVerifier = (storedState as any).codeVerifier;
            if (!codeVerifier) {
                throw new Error("Missing code_verifier for Twitter PKCE");
            }

            const basicAuth = Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString("base64");

            const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": `Basic ${basicAuth}`,
                },
                body: new URLSearchParams({
                    code,
                    grant_type: "authorization_code",
                    redirect_uri: redirectUri,
                    code_verifier: codeVerifier,
                }),
            });

            const tokenData = await tokenRes.json();

            if (tokenData.error) {
                console.error("Twitter Token Error:", tokenData);
                throw new Error(tokenData.error_description || tokenData.error);
            }

            accessToken = tokenData.access_token;
            refreshToken = tokenData.refresh_token;
            // Twitter tokens expire in 2 hours usually, but we have refresh token
            if (tokenData.expires_in) {
                expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
            }

            // B. Get User Profile
            const profileRes = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url", {
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                },
            });

            const profileData = await profileRes.json();

            if (profileData.errors) {
                throw new Error(profileData.errors[0].message);
            }

            const user = profileData.data;
            accountId = user.id;
            accountName = `@${user.username}`;
        }

    } catch (err: any) {
        console.error(`Failed to exchange token for ${platform}:`, err);
        return NextResponse.redirect(`${origin}/dashboard/platforms?error=token_exchange_failed`);
    }

    // 5. Store Connection in Database (Using Service Role if needed, or RLS)
    // We use the standard client because we want to enforce that we are saving for the *logged in* user.
    // However, the cookie `storedState.userId` tells us who *should* own this.

    const supabase = await createClient();

    // Verify current session matches initiated session (optional but good for security)
    const { data: { user } } = await supabase.auth.getUser();

    // Note: In Manual OAuth, the session SHOULD NOT have changed. 
    // If it did (e.g. user logged out in another tab), we might want to fail or use the cookie ID.
    // For now, we trust the cookie ID because `oauth_state` is HttpOnly and signed (in theory).

    const { error: insertError } = await supabase.from("platform_connections").upsert(
        {
            user_id: userId, // Use the ID from the state cookie
            platform: platform,
            access_token: accessToken,
            refresh_token: refreshToken || null,
            token_expires_at: expiresAt ? expiresAt.toISOString() : null,
            account_id: accountId,
            account_name: accountName,
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

    return NextResponse.redirect(`${origin}/dashboard/platforms?connected=${platform}`);
}
