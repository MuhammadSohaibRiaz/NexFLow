import { createClient } from "@/lib/supabase/server";
import { Post, PlatformConnection } from "@/lib/types";
import { updatePostStatus } from "@/lib/api/db";

// ==========================================
// Main Publisher Service
// ==========================================

export async function publishPost(postId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // 1. Fetch Post Data
    const { data: post, error: postError } = await supabase
        .from("posts")
        .select("*, pipelines(user_id)") // Join to get user_id
        .eq("id", postId)
        .single();

    if (postError || !post) {
        return { success: false, error: "Post not found" };
    }

    const userId = post.pipelines?.user_id;
    if (!userId) {
        return { success: false, error: "User ID not found for this post" };
    }

    // 2. Fetch Platform Credentials
    const { data: connection, error: connError } = await supabase
        .from("platform_connections")
        .select("*")
        .eq("user_id", userId)
        .eq("platform", post.platform)
        .single();

    if (connError || !connection) {
        await updatePostStatus(postId, "failed", "No platform connection found");
        return { success: false, error: "No platform connection found" };
    }

    if (!connection.is_active) {
        await updatePostStatus(postId, "failed", "Platform connection is paused");
        return { success: false, error: "Platform connection is paused" };
    }

    // 3. Dispatch to Platform Handler
    try {
        let platformPostId = "";

        switch (post.platform) {
            case "facebook":
                platformPostId = await publishToFacebook(post, connection);
                break;
            case "linkedin":
                platformPostId = await publishToLinkedIn(post, connection);
                break;
            case "twitter":
                platformPostId = await publishToTwitter(post, connection);
                break;
            case "instagram":
                throw new Error("Instagram publishing logic blocked by Meta");
            default:
                throw new Error(`Unsupported platform: ${post.platform}`);
        }

        // 4. Success!
        await supabase.from("posts").update({
            status: "published",
            published_at: new Date().toISOString(),
            platform_post_id: platformPostId,
            error_message: null
        }).eq("id", postId);

        return { success: true };

    } catch (error: any) {
        console.error(`Publishing failed for ${post.platform}:`, error);
        await updatePostStatus(postId, "failed", error.message);
        return { success: false, error: error.message };
    }
}

// ==========================================
// Platform Handlers
// ==========================================

// --- FACEBOOK ---
async function publishToFacebook(post: Post, connection: PlatformConnection): Promise<string> {
    const pageId = connection.account_id;
    const accessToken = connection.access_token;

    // API: POST /{page-id}/feed
    const url = `https://graph.facebook.com/v19.0/${pageId}/feed`;

    const params = new URLSearchParams();
    params.append("message", post.content);
    params.append("access_token", accessToken);

    if (post.image_url && post.image_url.startsWith("http")) {
        // Use /photos endpoint for image posts
        const photoUrl = `https://graph.facebook.com/v19.0/${pageId}/photos`;
        const photoParams = new URLSearchParams();
        photoParams.append("url", post.image_url);
        photoParams.append("caption", post.content);
        photoParams.append("access_token", accessToken);

        const res = await fetch(photoUrl, { method: "POST", body: photoParams });
        const data = await res.json();
        console.log("[Facebook] Photo Response:", JSON.stringify(data)); // Debug Log
        if (data.error) throw new Error(data.error.message);
        return data.post_id || data.id;
    }

    const res = await fetch(url, {
        method: "POST",
        body: params
    });

    const data = await res.json();
    console.log("[Facebook] Response:", JSON.stringify(data)); // Debug Log
    if (data.error) {
        throw new Error(data.error.message);
    }

    return data.id;
}

// --- LINKEDIN ---
async function publishToLinkedIn(post: Post, connection: PlatformConnection): Promise<string> {
    const personUrn = `urn:li:person:${connection.account_id}`;
    const accessToken = connection.access_token;

    const url = "https://api.linkedin.com/v2/ugcPosts";

    const body = {
        "author": personUrn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {
                    "text": post.content
                },
                "shareMediaCategory": "NONE"
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
    };

    console.log("[LinkedIn] Request:", JSON.stringify(body)); // Debug Log

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0"
        },
        body: JSON.stringify(body)
    });

    const data = await res.json();
    console.log("[LinkedIn] Response:", JSON.stringify(data)); // Debug log

    if (!res.ok) {
        throw new Error(data.message || JSON.stringify(data));
    }

    return data.id;
}

// --- X (TWITTER) ---
async function publishToTwitter(post: Post, connection: PlatformConnection): Promise<string> {
    let accessToken = connection.access_token;

    // 1. Check for Refresh
    const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    const now = new Date();

    if (expiresAt && expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
        // Refresh if expiring in less than 5 mins
        accessToken = await refreshTwitterToken(connection);
    }

    // 2. Post Tweet
    const url = "https://api.twitter.com/2/tweets";

    const body: any = {
        text: post.content
    };

    console.log("[Twitter] Request Body:", JSON.stringify(body)); // Debug Log

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    const data = await res.json();
    console.log("[Twitter] Full Response:", JSON.stringify(data, null, 2)); // Debug Log

    if (data.errors) {
        throw new Error(`Twitter API Error: ${data.errors[0].message}`);
    }

    // Robust Check
    if (!data.data || !data.data.id) {
        throw new Error(`Twitter Unexpected Response: ${JSON.stringify(data)}`);
    }

    return data.data.id;
}

// --- HELPER: TWITTER REFRESH ---
async function refreshTwitterToken(connection: PlatformConnection): Promise<string> {
    if (!connection.refresh_token) {
        throw new Error("No refresh token available for Twitter");
    }

    const basicAuth = Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString("base64");

    const res = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Basic ${basicAuth}`
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: connection.refresh_token,
            client_id: process.env.TWITTER_CLIENT_ID!
        })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);

    // Update DB
    const supabase = await createClient();
    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    await supabase.from("platform_connections")
        .update({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            token_expires_at: newExpiresAt,
            updated_at: new Date().toISOString()
        })
        .eq("id", connection.id);

    return data.access_token;
}
