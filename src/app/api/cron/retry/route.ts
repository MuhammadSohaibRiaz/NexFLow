import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { publishPost } from "@/lib/services/publisher";

/**
 * Retries failed posts
 * Logic:
 * - Find posts with status "failed"
 * - Created in the last 24 hours
 * - Retry count < 3
 * - Try to publish again
 */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    // Simple auth check for Cron (should use CRON_SECRET header in prod)
    // For local/dev, we just run it.

    const supabase = createServiceClient();

    try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data: failedPosts, error } = await supabase
            .from("posts")
            .select("id, platform, retry_count")
            .eq("status", "failed")
            .lt("retry_count", 3)
            .gte("created_at", oneDayAgo)
            .limit(10); // Batch size

        if (error) throw error;

        if (!failedPosts || failedPosts.length === 0) {
            return NextResponse.json({ message: "No failed posts to retry" });
        }

        const results = [];

        for (const post of failedPosts) {
            console.log(`[RetryCron] Retrying post ${post.id} (${post.platform})...`);
            const result = await publishPost(post.id);
            results.push({ id: post.id, success: result.success, error: result.error });
        }

        return NextResponse.json({
            processed: results.length,
            results
        });

    } catch (error: any) {
        console.error("[RetryCron] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
