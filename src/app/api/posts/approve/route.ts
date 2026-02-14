import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { postId, scheduledFor } = await request.json();

        if (!postId) {
            return NextResponse.json({ error: "Missing postId" }, { status: 400 });
        }

        // Verify the post belongs to this user and is in an approvable state
        const { data: post, error: fetchErr } = await supabase
            .from("posts")
            .select("id, status, user_id")
            .eq("id", postId)
            .eq("user_id", user.id)
            .single();

        if (fetchErr || !post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        if (post.status !== "generated" && post.status !== "pending" && post.status !== "draft") {
            return NextResponse.json(
                { error: `Cannot approve a post with status '${post.status}'` },
                { status: 400 }
            );
        }

        // Approve → set to 'scheduled' with a publish time
        const publishAt = scheduledFor
            ? new Date(scheduledFor).toISOString()
            : new Date(Date.now() + 60_000).toISOString(); // Default: 1 minute from now

        const { data: updated, error: updateErr } = await supabase
            .from("posts")
            .update({
                status: "scheduled",
                scheduled_for: publishAt,
            })
            .eq("id", postId)
            .select()
            .single();

        if (updateErr) throw updateErr;

        return NextResponse.json({ success: true, post: updated });

    } catch (error: any) {
        console.error("Approve Post Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
