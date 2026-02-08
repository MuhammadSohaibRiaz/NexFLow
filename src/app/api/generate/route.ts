import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePostContent } from "@/lib/ai";
import type { Platform } from "@/lib/types";

export async function POST(request: Request) {
    try {
        // Verify authentication
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's brand voice
        const { data: profile } = await supabase
            .from("profiles")
            .select("brand_voice")
            .eq("id", user.id)
            .single();

        // Parse request body
        const body = await request.json();
        const { topic, notes, platform } = body as {
            topic: string;
            notes?: string;
            platform: Platform;
        };

        if (!topic || !platform) {
            return NextResponse.json(
                { error: "Missing required fields: topic, platform" },
                { status: 400 }
            );
        }

        // Generate content using AI provider
        const content = await generatePostContent({
            topic,
            notes,
            platform,
            brandVoice: profile?.brand_voice,
        });

        return NextResponse.json({
            success: true,
            data: content,
        });
    } catch (error) {
        console.error("Content generation error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Generation failed" },
            { status: 500 }
        );
    }
}
