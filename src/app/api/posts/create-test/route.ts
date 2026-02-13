import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createPipeline, createTopic } from "@/lib/api/db";

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { platform } = await request.json();
        const targetPlatform = platform || "twitter";

        // 1. Find or Create Pipeline
        let { data: pipeline } = await supabase
            .from("pipelines")
            .select("id")
            .eq("user_id", user.id)
            .limit(1)
            .single();

        if (!pipeline) {
            // Create default pipeline via DB helper or raw insert
            // Raw insert to avoid `createPipeline` type strictness if needed, but helper is better.
            const newPipeline = await supabase.from("pipelines").insert({
                user_id: user.id,
                name: "Test Pipeline",
                frequency: "daily",
                platforms: [targetPlatform],
                post_time: "12:00",
                timezone: "UTC",
                review_required: false,
                reminder_minutes: 0
            }).select().single();

            if (newPipeline.error) throw newPipeline.error;
            pipeline = newPipeline.data;
        }

        // 2. Find or Create Topic
        let { data: topic } = await supabase
            .from("topics")
            .select("id")
            .eq("pipeline_id", pipeline!.id)
            .limit(1)
            .single();

        if (!topic) {
            const newTopic = await supabase.from("topics").insert({
                pipeline_id: pipeline!.id,
                title: "Test Topic",
                sort_order: 1,
                is_evergreen: false
            }).select().single();
            if (newTopic.error) throw newTopic.error;
            topic = newTopic.data;
        }

        // 3. Create Post
        const { data: post, error: postError } = await supabase.from("posts").insert({
            user_id: user.id, // RLS requires this to match auth.uid()
            pipeline_id: pipeline!.id,
            topic_id: topic!.id,
            platform: targetPlatform,
            content: `Hello World! This is a test post from NexFlow at ${new Date().toLocaleTimeString()}`,
            status: "draft",
            image_url: null
        }).select().single();

        if (postError) throw postError;

        return NextResponse.json({ success: true, post });

    } catch (error: any) {
        console.error("Test Post Creation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
