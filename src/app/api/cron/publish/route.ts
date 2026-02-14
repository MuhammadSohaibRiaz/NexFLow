import { createServiceClient } from "@/lib/supabase/service";
import { publishPost } from "@/lib/services/publisher";
import { NextResponse } from "next/server";

// This endpoint is protected by CRON_SECRET
export async function GET(request: Request) {
    const authHeader = request.headers.get("Authorization");

    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    try {
        const now = new Date().toISOString();
        console.log(`[Cron:Publish] Checking for posts due at or before ${now}`);

        // 1. Find posts that are scheduled for NOW or in the PAST
        const { data: posts, error } = await supabase
            .from("posts")
            .select("id, platform, scheduled_for, status")
            .eq("status", "scheduled")
            .lte("scheduled_for", now);

        if (error) throw error;

        // Debug: check ALL scheduled posts regardless of time
        const { data: allScheduled } = await supabase
            .from("posts")
            .select("id, scheduled_for")
            .eq("status", "scheduled");

        console.log(`[Cron:Publish] Total scheduled in DB: ${allScheduled?.length || 0}`);
        if (allScheduled && allScheduled.length > 0) {
            console.log(`[Cron:Publish] First scheduled post time: ${allScheduled[0].scheduled_for}`);
        }

        if (!posts || posts.length === 0) {
            const nextPost = allScheduled && allScheduled.length > 0
                ? allScheduled.sort((a, b) => new Date(a.scheduled_for!).getTime() - new Date(b.scheduled_for!).getTime())[0]
                : null;

            return NextResponse.json({
                success: true,
                message: "No posts due for publishing right now.",
                next_scheduled_at: nextPost?.scheduled_for || null,
                server_time: now,
                total_scheduled_queue: allScheduled?.length || 0
            });
        }

        console.log(`[Cron:Publish] Found ${posts.length} posts to publish`);

        // 2. Publish them in sequence
        const results = [];
        for (const post of posts) {
            try {
                const res = await publishPost(post.id);
                results.push({ id: post.id, success: res.success, error: res.error });
            } catch (err: any) {
                results.push({ id: post.id, success: false, error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            processed: posts.length,
            results
        });

    } catch (error: any) {
        console.error("Cron Publish Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
