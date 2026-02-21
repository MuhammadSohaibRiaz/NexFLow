import { createServiceClient } from "@/lib/supabase/service";
import { publishPost } from "@/lib/services/publisher";
import { generateImage } from "@/lib/ai/image-provider";
import { uploadPostImage } from "@/lib/supabase/storage";
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

        // Find posts that are scheduled and due NOW or in the PAST
        const { data: posts, error } = await supabase
            .from("posts")
            .select("id, platform, scheduled_for, status")
            .eq("status", "scheduled")
            .lte("scheduled_for", now);

        if (error) throw error;

        if (!posts || posts.length === 0) {
            // Quick peek at upcoming scheduled posts for diagnostics
            const { count } = await supabase
                .from("posts")
                .select("id", { count: "exact", head: true })
                .eq("status", "scheduled");

            return NextResponse.json({
                success: true,
                message: "No posts due for publishing right now.",
                server_time: now,
                total_scheduled_queue: count || 0
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

        // 3. BACKFILL MISSING IMAGES
        // Look for scheduled posts that need images but don't have them yet
        const { data: missingImages } = await supabase
            .from("posts")
            .select("id, image_prompt")
            .eq("status", "scheduled")
            .is("image_url", null)
            .not("image_prompt", "is", null)
            .limit(2); // Process 2 per run to avoid timeout

        if (missingImages && missingImages.length > 0) {
            console.log(`[Cron:Publish] Backfilling ${missingImages.length} images`);
            for (const post of missingImages) {
                try {
                    const imageBuffer = await generateImage(post.image_prompt!);
                    const filename = `${post.id}_${Date.now()}.webp`;
                    const imageUrl = await uploadPostImage(imageBuffer, filename);

                    await supabase
                        .from("posts")
                        .update({ image_url: imageUrl })
                        .eq("id", post.id);

                    console.log(`[Cron:Publish] ✅ Backfilled image for post ${post.id}`);
                } catch (imgErr: any) {
                    console.error(`[Cron:Publish] Failed to backfill image for ${post.id}:`, imgErr.message);
                }
            }
        }

        return NextResponse.json({
            success: true,
            processed: posts.length,
            results,
            backfilled_images: missingImages?.length || 0
        });

    } catch (error: any) {
        console.error("Cron Publish Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
