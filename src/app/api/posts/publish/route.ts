import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { publishPost } from "@/lib/services/publisher";

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { postId } = await request.json();

        if (!postId) {
            return NextResponse.json({ error: "Missing postId" }, { status: 400 });
        }

        // Verify ownership (or relies on publishPost failing if no conn found, but best to check here)
        // publishPost checks if post's pipeline belongs to user via fetching connection for that user

        const result = await publishPost(postId);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Publishing API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
