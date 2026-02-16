import { createServiceClient } from "@/lib/supabase/service";
import { generatePostContent } from "@/lib/ai/provider";
import { Frequency, Pipeline, Topic } from "@/lib/types";

/**
 * Pipeline Runner - Runs in cron context (no user session).
 * Uses Service Role client to bypass RLS.
 * Processes ALL pending topics for each due pipeline.
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

        // If not due yet, skip
        if (nextRun > now) {
            results.push({
                id: pipeline.id,
                name: pipeline.name,
                status: "skipped",
                message: `Scheduled for ${nextRun.toISOString()} (${Math.ceil((nextRun.getTime() - now.getTime()) / 60000)} mins away)`
            });
            continue;
        }

        // If due, process ALL pending topics for this pipeline
        try {
            const result = await processAllTopics(supabase, pipeline);
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

async function processAllTopics(supabase: ReturnType<typeof createServiceClient>, pipeline: Pipeline) {
    // Get ALL pending topics for this pipeline (not just one)
    const { data: topics, error: topicErr } = await supabase
        .from("topics")
        .select("*")
        .eq("pipeline_id", pipeline.id)
        .eq("status", "pending")
        .order("sort_order", { ascending: true });

    if (topicErr) throw topicErr;

    if (!topics || topics.length === 0) {
        console.log(`[PipelineRunner] No pending topics for pipeline ${pipeline.id}. Advancing schedule.`);
        await advancePipeline(supabase, pipeline);
        return { topics_processed: 0, message: "No pending topics" };
    }

    console.log(`[PipelineRunner] Found ${topics.length} pending topics for pipeline "${pipeline.name}"`);

    // Fetch user's connected platforms to validate
    const { data: connections } = await supabase
        .from("platform_connections")
        .select("platform")
        .eq("user_id", pipeline.user_id)
        .eq("is_active", true);

    const connectedPlatforms = new Set((connections || []).map(c => c.platform));

    // Filter pipeline platforms to only include connected ones
    const validPlatforms = pipeline.platforms.filter(p => connectedPlatforms.has(p));
    const skippedPlatforms = pipeline.platforms.filter(p => !connectedPlatforms.has(p));

    if (skippedPlatforms.length > 0) {
        console.log(`[PipelineRunner] ⚠️ Skipping unconnected platforms: ${skippedPlatforms.join(", ")}`);
    }

    if (validPlatforms.length === 0) {
        console.log(`[PipelineRunner] ❌ No connected platforms for pipeline ${pipeline.id}.`);
        await advancePipeline(supabase, pipeline);
        return { topics_processed: 0, message: "No connected platforms" };
    }

    // Fetch User Brand Voice (once for all topics)
    const { data: profile } = await supabase
        .from("profiles")
        .select("brand_voice")
        .eq("id", pipeline.user_id)
        .single();

    const topicResults = [];

    // Process each topic
    for (const topic of topics as Topic[]) {
        try {
            await processSingleTopic(supabase, topic, pipeline, validPlatforms, profile?.brand_voice);
            topicResults.push(topic.title);
        } catch (error: any) {
            console.error(`[PipelineRunner] Failed to generate for topic ${topic.id}:`, error);
        }
    }

    // Advance the pipeline schedule after processing ALL topics
    await advancePipeline(supabase, pipeline);

    return {
        topics_processed: topicResults.length,
        topics: topicResults,
        platforms_used: validPlatforms,
        platforms_skipped: skippedPlatforms
    };
}

// =============================================
// SHARED GENERATION LOGIC (Used by Cron & Instant)
// =============================================

export async function generateTopicContent(topicId: string, pipelineId: string) {
    const supabase = createServiceClient();

    // 1. Fetch Topic & Pipeline
    const { data: topic } = await supabase.from("topics").select("*").eq("id", topicId).single();
    const { data: pipeline } = await supabase.from("pipelines").select("*").eq("id", pipelineId).single();

    if (!topic || !pipeline) throw new Error("Topic or Pipeline not found");

    // 2. Fetch Connected Platforms
    const { data: connections } = await supabase
        .from("platform_connections")
        .select("platform")
        .eq("user_id", pipeline.user_id)
        .eq("is_active", true);

    const connectedPlatforms = new Set((connections || []).map(c => c.platform));
    const validPlatforms = pipeline.platforms.filter(p => connectedPlatforms.has(p));

    if (validPlatforms.length === 0) throw new Error("No connected platforms");

    // 3. Fetch Brand Voice
    const { data: profile } = await supabase
        .from("profiles")
        .select("brand_voice")
        .eq("id", pipeline.user_id)
        .single();

    // 4. Process
    return processSingleTopic(supabase, topic, pipeline, validPlatforms, profile?.brand_voice);
}

async function processSingleTopic(
    supabase: ReturnType<typeof createServiceClient>,
    topic: Topic,
    pipeline: Pipeline,
    platforms: string[],
    brandVoice?: string
) {
    console.log(`[PipelineRunner] Processing topic "${topic.title}"`);

    for (const platform of platforms) {
        try {
            console.log(`[PipelineRunner] Generating ${platform} content for: ${topic.title}`);

            const generated = await generatePostContent({
                topic: topic.title,
                notes: topic.notes,
                platform: platform as any,
                brandVoice: brandVoice
            });

            // If review required → "generated" (user approves in dashboard)
            // If auto-publish  → "scheduled" with scheduled_for set to now
            // (since this pipeline is already due, publish immediately)
            // NOTE FOR INSTANT GENERATION:
            // When triggered instantly, we want it scheduled for the NEXT run time, 
            // unless review is required.

            let status: string;
            let scheduledFor: string | undefined;

            if (pipeline.review_required) {
                status = "generated";
            } else {
                status = "scheduled";
                // For instant generation, we should respect the schedule.
                // If this is running via Cron (due now), next_run_at is now/past.
                // If running via Instant (created now), next_run_at might be in future.
                scheduledFor = pipeline.next_run_at || new Date().toISOString();
            }

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
            throw error;
        }
    }

    // Mark topic as "generated"
    await supabase
        .from("topics")
        .update({ status: "generated", last_used_at: new Date().toISOString() })
        .eq("id", topic.id);

    return true;
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

    console.log(`[PipelineRunner] Pipeline "${pipeline.name}" next run: ${nextRun.toISOString()}`);
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
