import { NextResponse } from "next/server";
import { getPipelines } from "@/lib/api/db";

export async function GET() {
    try {
        const pipelines = await getPipelines();
        return NextResponse.json(pipelines);
    } catch (error) {
        console.error("API Error [pipelines]:", error);
        return NextResponse.json({ error: "Failed to fetch pipelines" }, { status: 500 });
    }
}
