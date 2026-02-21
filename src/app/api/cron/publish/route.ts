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

        // 1. Find posts that are scheduled and due NOW or in the PAST
        const { data: posts, error } = await supabase
            .from("posts")
            .select("id, platform, scheduled_for, status")
            .eq("status", "scheduled")
            .lte("scheduled_for", now);

        if (error) throw error;

        // 2. BACKFILL MISSING IMAGES
        // We do this BEFORE publishing so that posts waiting for images get them first.
        // Include 'scheduled' (auto-post), 'generated' (needs review), and 'published' (recent clean-up)
        const { data: missingImages } = await supabase
            .from("posts")
            .select("id, image_prompt")
            .in("status", ["scheduled", "generated", "published"])
            .is("image_url", null)
            .not("image_prompt", "is", null)
            .order("created_at", { ascending: false })
            .limit(5); // Process up to 5 per run

        let backfilledCount = 0;
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

                    backfilledCount++;
                    console.log(`[Cron:Publish] ✅ Backfilled image for post ${post.id}`);
                } catch (imgErr: any) {
                    console.error(`[Cron:Publish] Failed to backfill image for ${post.id}:`, imgErr.message);
                }
            }
        }

        if ((!posts || posts.length === 0) && backfilledCount === 0) {
            return NextResponse.json({
                success: true,
                message: "Nothing to publish or backfill right now.",
                server_time: now
            });
        }

        // 3. PUBLISH DUE POSTS
        console.log(`[Cron:Publish] Found ${posts?.length || 0} posts to publish`);
        const results = [];
        if (posts) {
            for (const post of posts) {
                try {
                    const res = await publishPost(post.id);
                    results.push({ id: post.id, success: res.success, error: res.error });
                } catch (err: any) {
                    results.push({ id: post.id, success: false, error: err.message });
                }
            }
        }

        return NextResponse.json({
            success: true,
            processed: posts?.length || 0,
            results,
            backfilled_images: backfilledCount
        });

    } catch (error: any) {
        console.error("Cron Publish Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
