import { runDuePipelines } from "@/lib/services/pipeline-runner";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const authHeader = request.headers.get("Authorization");

    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await runDuePipelines();
        return NextResponse.json({
            success: true,
            ...result
        });

    } catch (error: any) {
        console.error("Pipeline Cron Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
