import { NextResponse } from "next/server";
import { getPosts } from "@/lib/api/db";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;
        const status = searchParams.get("status") || undefined;
        const platform = searchParams.get("platform") || undefined;

        const posts = await getPosts({
            limit,
            status,
            platform,
            // Minimal columns for listing
            columns: "id, platform, status, content, created_at, published_at, scheduled_for, topics(title)"
        });

        return NextResponse.json(posts);
    } catch (error) {
        console.error("API Error [posts]:", error);
        return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }
}
