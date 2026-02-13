import { createClient } from "@/lib/supabase/server";
import { getActivePipelines, getNextPendingTopic, createPost, updatePipeline, updateTopic } from "@/lib/api/db";
import { generatePostContent } from "@/lib/ai/provider";
import { Frequency, Pipeline, Topic } from "@/lib/types";

export async function runDuePipelines() {
    console.log("[PipelineRunner] Checking all active pipelines...");
    const pipelines = await getActivePipelines();

    const results = [];
    const now = new Date();

    for (const pipeline of pipelines) {
        const nextRun = new Date(pipeline.next_run_at || 0);

        // If not due yet
        if (nextRun > now) {
            results.push({
                id: pipeline.id,
                name: pipeline.name,
                status: "skipped",
                message: `Scheduled for ${nextRun.toLocaleTimeString()} (${Math.ceil((nextRun.getTime() - now.getTime()) / 60000)} mins)`
            });
            continue;
        }

        // If due, process it
        try {
            const result = await processPipeline(pipeline);
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

async function processPipeline(pipeline: Pipeline) {
    // 1. Get next topic
    const topic = await getNextPendingTopic(pipeline.id);

    if (!topic) {
        console.log(`[PipelineRunner] No pending topics for pipeline ${pipeline.id}. Skipping.`);
        // Even if no topic, we should probably advance the next_run_at? 
        // Or keep it 'due' until they add a topic? 
        // Let's advance it to avoid infinite loops of "nothing to do".
        await advancePipeline(pipeline);
        return { topic: null, message: "No pending topics" };
    }

    console.log(`[PipelineRunner] Processing topic "${topic.title}" for pipeline ${pipeline.id}`);

    // 2. Fetch User Brand Voice
    const supabase = await createClient();
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

            // 4. Create Post
            const status = pipeline.review_required ? "pending" : "scheduled";
            const scheduledFor = pipeline.review_required ? undefined : new Date().toISOString();

            await createPost({
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

        } catch (error: any) {
            console.error(`[PipelineRunner] Failed to generate ${platform} for topic ${topic.id}:`, error);
            // We continue with other platforms
        }
    }

    // 5. Update topic status
    await updateTopic(topic.id, {
        status: "generated",
        last_used_at: new Date().toISOString()
    });

    // 6. Schedule next run
    await advancePipeline(pipeline);

    return { topic: topic.title, platforms: pipeline.platforms };
}

async function advancePipeline(pipeline: Pipeline) {
    const nextRun = calculateNextRunAt(pipeline.frequency, new Date(pipeline.next_run_at || new Date()));

    await updatePipeline(pipeline.id, {
        last_run_at: new Date().toISOString(),
        next_run_at: nextRun.toISOString()
    });
}

function calculateNextRunAt(frequency: Frequency, lastScheduled: Date): Date {
    const next = new Date(lastScheduled);
    const now = new Date();

    // If lastScheduled is in the past, start from now
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
