import { createServiceClient } from "@/lib/supabase/service";
import { Post, PlatformConnection } from "@/lib/types";

// ==========================================
// Main Publisher Service (Cron Context)
// Uses Service Role client to bypass RLS.
// ==========================================

/**
 * Compose the final message to post to a platform.
 * Combines post content with hashtags.
 */
function composeMessage(post: Post): string {
    let message = post.content || "";

    // Append hashtags if present
    if (post.hashtags && post.hashtags.length > 0) {
        const tags = post.hashtags
            .map(h => h.startsWith("#") ? h : `#${h}`)
            .join(" ");
        message = `${message}\n\n${tags}`;
    }

    return message.trim();
}

export async function publishPost(postId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceClient();

    // 1. Fetch Post Data
    const { data: post, error: postError } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();

    if (postError || !post) {
        return { success: false, error: "Post not found" };
    }

    const userId = post.user_id;
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
        await supabase.from("posts").update({ status: "failed", error_message: "No platform connection found" }).eq("id", postId);
        return { success: false, error: "No platform connection found" };
    }

    if (!connection.is_active) {
        await supabase.from("posts").update({ status: "failed", error_message: "Platform connection is paused" }).eq("id", postId);
        return { success: false, error: "Platform connection is paused" };
    }

    // 3. Rate Limit Check
    const withinLimit = await checkRateLimit(supabase, userId, post.platform);
    if (!withinLimit) {
        console.log(`[Publisher] Rate limit hit for ${post.platform} (User: ${userId})`);
        return { success: false, error: "Rate limit reached. Try again later." };
    }

    // 4. Dispatch to Platform Handler
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
                throw new Error("Instagram publishing is not yet supported");
            default:
                throw new Error(`Unsupported platform: ${post.platform}`);
        }

        // 5. Success!
        await supabase.from("posts").update({
            status: "published",
            published_at: new Date().toISOString(),
            platform_post_id: platformPostId,
            error_message: null
        }).eq("id", postId);

        return { success: true };

    } catch (error: any) {
        console.error(`[Publisher] Failed for ${post.platform}:`, error.message);

        // Increment retry count
        const newRetryCount = (post.retry_count || 0) + 1;
        await supabase.from("posts").update({
            status: "failed",
            error_message: error.message,
            retry_count: newRetryCount
        }).eq("id", postId);

        return { success: false, error: error.message };
    }
}

async function checkRateLimit(supabase: ReturnType<typeof createServiceClient>, userId: string, platform: string): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("platform", platform)
        .eq("status", "published")
        .gte("published_at", oneHourAgo);

    if (error) {
        console.error("[Publisher] Rate limit check failed:", error);
        return true; // Fail open to avoid blocking valid posts on DB error
    }

    const limit = 5; // Max 5 posts per hour per platform
    return (count || 0) < limit;
}

// ==========================================
// Platform Handlers
// ==========================================

// --- FACEBOOK ---
async function publishToFacebook(post: Post, connection: PlatformConnection): Promise<string> {
    const pageId = connection.account_id;
    const accessToken = connection.access_token;
    const message = composeMessage(post);

    if (!pageId) {
        throw new Error("No Facebook Page ID found. Please reconnect your Facebook account.");
    }

    // API: POST /{page-id}/photos (if image present) or /feed
    const isImage = !!post.image_url;
    const url = `https://graph.facebook.com/v19.0/${pageId}/${isImage ? "photos" : "feed"}`;

    const params = new URLSearchParams();
    if (isImage) {
        params.append("url", post.image_url!);
        params.append("caption", message);
    } else {
        params.append("message", message);
    }
    params.append("access_token", accessToken);

    const res = await fetch(url, { method: "POST", body: params });
    const data = await res.json();

    if (data.error) {
        throw new Error(`Facebook: ${data.error.message}`);
    }

    // For photos, Facebook returns 'id' and 'post_id'. We want the post_id for the link.
    return data.post_id || data.id;
}

// --- LINKEDIN ---
async function publishToLinkedIn(post: Post, connection: PlatformConnection): Promise<string> {
    if (!connection.account_id) {
        throw new Error("LinkedIn Account ID is missing");
    }

    // Determine if it's a person or organization URN
    // If account_id is numeric, it's likely an Organization ID. If it has characters, it's a Person ID (sub).
    // Better yet: we should store the URN prefix in the DB, but for now we infer.
    // Person IDs from OpenID Connect (sub) are usually alphanumeric.
    // Organization IDs are pure numbers.

    const isOrganization = /^\d+$/.test(connection.account_id);
    const authorUrn = isOrganization
        ? `urn:li:organization:${connection.account_id}`
        : `urn:li:person:${connection.account_id}`;

    const accessToken = connection.access_token;
    const message = composeMessage(post);
    let imageUrn = "";

    // --- Media Upload (if image present) ---
    if (post.image_url) {
        try {
            // 1. Register Upload
            const regRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "registerUploadRequest": {
                        "recipes": ["urn:li:digitalassetRecipe:feedshare-image"],
                        "owner": authorUrn,
                        "serviceRelationships": [{
                            "relationshipType": "OWNER",
                            "identifier": "urn:li:userGeneratedContent"
                        }]
                    }
                })
            });
            const regData = await regRes.json();
            const uploadUrl = regData.value.uploadMechanism["com.linkedin.digitalasset.uploadMechanism.MediaUpload"].uploadUrl;
            imageUrn = regData.value.asset;

            // 2. Upload Binary
            const imageRes = await fetch(post.image_url);
            const imageBlob = await imageRes.blob();
            await fetch(uploadUrl, {
                method: "POST",
                headers: { "Authorization": `Bearer ${accessToken}` },
                body: imageBlob
            });
        } catch (e: any) {
            console.error("[LinkedIn] Media upload failed, falling back to text-only:", e.message);
        }
    }

    const url = "https://api.linkedin.com/v2/ugcPosts";

    const body: any = {
        "author": authorUrn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": { "text": message },
                "shareMediaCategory": imageUrn ? "IMAGE" : "NONE",
                "media": imageUrn ? [{
                    "status": "READY",
                    "description": { "text": post.topic_id || "Post Image" },
                    "media": imageUrn,
                    "title": { "text": "Post Image" }
                }] : []
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
    };

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

    if (!res.ok) {
        throw new Error(`LinkedIn: ${data.message || JSON.stringify(data)}`);
    }

    return data.id;
}

// --- X (TWITTER) ---
async function publishToTwitter(post: Post, connection: PlatformConnection): Promise<string> {
    let accessToken = connection.access_token;
    const supabase = createServiceClient();
    const message = composeMessage(post);

    // 1. Check for Refresh
    const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    const now = new Date();

    if (expiresAt && expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
        accessToken = await refreshTwitterToken(supabase, connection);
    }

    // 2. Media Upload (if image present)
    let mediaIds: string[] = [];
    if (post.image_url) {
        try {
            // Fetch Image as Base64 (Standard for v1.1 upload)
            const imgRes = await fetch(post.image_url);
            const arrayBuffer = await imgRes.arrayBuffer();
            const base64Image = Buffer.from(arrayBuffer).toString("base64");

            // Upload to v1.1 Media Endpoint
            const uploadRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    media_data: base64Image
                })
            });

            const uploadData = await uploadRes.json();
            if (uploadData.media_id_string) {
                mediaIds = [uploadData.media_id_string];
            } else {
                console.error("[Twitter] Upload failed:", JSON.stringify(uploadData));
            }
        } catch (e: any) {
            console.error("[Twitter] Media upload flow failed:", e.message);
        }
    }

    // 3. Post Tweet (v2)
    const payload: any = { text: message };
    if (mediaIds.length > 0) {
        payload.media = { media_ids: mediaIds };
    }

    const res = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.errors) {
        throw new Error(`Twitter: ${data.errors[0].message}`);
    }

    if (!data.data || !data.data.id) {
        throw new Error(`Twitter unexpected response: ${JSON.stringify(data)}`);
    }

    return data.data.id;
}

// --- HELPER: TWITTER REFRESH ---
async function refreshTwitterToken(supabase: ReturnType<typeof createServiceClient>, connection: PlatformConnection): Promise<string> {
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
