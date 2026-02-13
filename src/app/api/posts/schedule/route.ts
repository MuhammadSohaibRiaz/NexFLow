import { createClient } from "@/lib/supabase/server";
import { schedulePost } from "@/lib/api/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { postId, scheduledFor } = await request.json();

        if (!postId || !scheduledFor) {
            return NextResponse.json({ error: "Missing postId or scheduledFor" }, { status: 400 });
        }

        const post = await schedulePost(postId, scheduledFor);

        return NextResponse.json({ success: true, post });

    } catch (error: any) {
        console.error("Scheduling Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
