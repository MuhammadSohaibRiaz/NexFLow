import { createServiceClient } from "@/lib/supabase/service";
import { generatePostContent } from "@/lib/ai/provider";
import { Frequency, Pipeline, Topic } from "@/lib/types";

/**
 * Pipeline Runner - Runs in cron context (no user session).
 * Uses Service Role client to bypass RLS.
 */

export async function runDuePipelines() {
    const supabase = createServiceClient();

    console.log("[PipelineRunner] Checking all active pipelines...");

    const { data: pipelines, error: pipeErr } = await supabase
        .from("pipelines")
        .select("*")
        .eq("is_active", true);

    if (pipeErr) throw pipeErr;
    if (!pipelines || pipelines.length === 0) {
        console.log("[PipelineRunner] No active pipelines found.");
        return { total_active: 0, processed: 0, results: [] };
    }

    console.log(`[PipelineRunner] Found ${pipelines.length} active pipelines.`);

    const results = [];
    const now = new Date();

    for (const pipeline of pipelines as Pipeline[]) {
        const nextRun = new Date(pipeline.next_run_at || 0);

        // If not due yet
        if (nextRun > now) {
            results.push({
                id: pipeline.id,
                name: pipeline.name,
                status: "skipped",
                message: `Scheduled for ${nextRun.toISOString()} (${Math.ceil((nextRun.getTime() - now.getTime()) / 60000)} mins away)`
            });
            continue;
        }

        // If due, process it
        try {
            const result = await processPipeline(supabase, pipeline);
            results.push({
                id: pipeline.id,
                name: pipeline.name,
                status: "processed",
                success: true,
                ...result
            });
        } catch (error: any) {
            console.error(`[PipelineRunner] Error processing pipeline ${pipeline.id}:`, error);
            results.push({
                id: pipeline.id,
                name: pipeline.name,
                status: "failed",
                success: false,
                error: error.message
            });
        }
    }

    return {
        total_active: pipelines.length,
        processed: results.filter(r => r.status === "processed").length,
        results
    };
}

async function processPipeline(supabase: ReturnType<typeof createServiceClient>, pipeline: Pipeline) {
    // 1. Get next pending topic
    const { data: topic, error: topicErr } = await supabase
        .from("topics")
        .select("*")
        .eq("pipeline_id", pipeline.id)
        .eq("status", "pending")
        .order("sort_order", { ascending: true })
        .limit(1)
        .single();

    if (topicErr) {
        if (topicErr.code === "PGRST116") {
            console.log(`[PipelineRunner] No pending topics for pipeline ${pipeline.id}. Advancing schedule.`);
            await advancePipeline(supabase, pipeline);
            return { topic: null, message: "No pending topics" };
        }
        throw topicErr;
    }

    console.log(`[PipelineRunner] Processing topic "${topic.title}" for pipeline ${pipeline.id}`);

    // 2. Fetch User Brand Voice
    const { data: profile } = await supabase
        .from("profiles")
        .select("brand_voice")
        .eq("id", pipeline.user_id)
        .single();

    // 3. Generate content for each platform
    for (const platform of pipeline.platforms) {
        try {
            console.log(`[PipelineRunner] Generating ${platform} content for topic: ${topic.title}`);

            const generated = await generatePostContent({
                topic: topic.title,
                notes: topic.notes,
                platform: platform,
                brandVoice: profile?.brand_voice
            });

            // 4. Create Post - If review required → "pending", otherwise → "scheduled"
            const status = pipeline.review_required ? "pending" : "scheduled";
            const scheduledFor = pipeline.review_required ? undefined : new Date().toISOString();

            const { error: postErr } = await supabase
                .from("posts")
                .insert({
                    topic_id: topic.id,
                    pipeline_id: pipeline.id,
                    user_id: pipeline.user_id,
                    platform: platform,
                    content: generated.content,
                    hashtags: generated.hashtags,
                    image_prompt: generated.imagePrompt,
                    status: status,
                    scheduled_for: scheduledFor
                });

            if (postErr) {
                console.error(`[PipelineRunner] Failed to create post for ${platform}:`, postErr);
            } else {
                console.log(`[PipelineRunner] ✅ Created ${status} post for ${platform}`);
            }

        } catch (error: any) {
            console.error(`[PipelineRunner] Failed to generate ${platform} for topic ${topic.id}:`, error);
        }
    }

    // 5. Update topic status to "generated"
    await supabase
        .from("topics")
        .update({ status: "generated", last_used_at: new Date().toISOString() })
        .eq("id", topic.id);

    // 6. Schedule next run
    await advancePipeline(supabase, pipeline);

    return { topic: topic.title, platforms: pipeline.platforms };
}

async function advancePipeline(supabase: ReturnType<typeof createServiceClient>, pipeline: Pipeline) {
    const nextRun = calculateNextRunAt(pipeline.frequency, new Date(pipeline.next_run_at || new Date()));

    await supabase
        .from("pipelines")
        .update({
            last_run_at: new Date().toISOString(),
            next_run_at: nextRun.toISOString()
        })
        .eq("id", pipeline.id);
}

function calculateNextRunAt(frequency: Frequency, lastScheduled: Date): Date {
    const next = new Date(lastScheduled);
    const now = new Date();

    if (next < now) {
        next.setTime(now.getTime());
    }

    switch (frequency) {
        case "daily":
            next.setDate(next.getDate() + 1);
            break;
        case "weekly":
            next.setDate(next.getDate() + 7);
            break;
        case "bi-weekly":
            next.setDate(next.getDate() + 14);
            break;
        case "monthly":
            next.setMonth(next.getMonth() + 1);
            break;
    }
    return next;
}
