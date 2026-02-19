"use server";

import { createClient } from "@/lib/supabase/server";
import { generateTopicContent } from "@/lib/services/pipeline-runner";
import type { Pipeline, Topic, Post, PlatformConnection } from "@/lib/types";
import { revalidatePath } from "next/cache";

// =============================================
// PIPELINES API
// =============================================

export async function getPipelines(): Promise<Pipeline[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("pipelines")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Pipeline[];
}

export async function getPipeline(id: string): Promise<Pipeline | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("pipelines")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        if (error.code === "PGRST116") return null; // Not found
        throw error;
    }
    return data as Pipeline;
}

export async function createPipeline(
    pipeline: Omit<Pipeline, "id" | "user_id" | "created_at" | "updated_at">
): Promise<Pipeline> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
        .from("pipelines")
        .insert({ ...pipeline, user_id: user.id })
        .select()
        .single();

    if (error) throw error;
    return data as Pipeline;
}

export async function updatePipeline(
    id: string,
    updates: Partial<Pipeline>
): Promise<Pipeline> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("pipelines")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data as Pipeline;
}

export async function deletePipeline(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("pipelines").delete().eq("id", id);
    if (error) throw error;
}

export async function getActivePipelines(): Promise<Pipeline[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("pipelines")
        .select("*")
        .eq("is_active", true);

    if (error) throw error;
    return data as Pipeline[];
}

export async function getDuePipelines(): Promise<Pipeline[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("pipelines")
        .select("*")
        .eq("is_active", true)
        .lte("next_run_at", new Date().toISOString());

    if (error) throw error;
    return data as Pipeline[];
}

// =============================================
// TOPICS API
// =============================================

export async function getTopics(pipelineId: string): Promise<Topic[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("pipeline_id", pipelineId)
        .order("sort_order", { ascending: true });

    if (error) throw error;
    // When returning topics, if any are "generated", we could fetch the generated post status
    // but the UI currently just shows the topic status.
    return data as Topic[];
}

export async function createTopic(
    pipelineId: string,
    topic: Omit<Topic, "id" | "pipeline_id" | "created_at" | "sort_order">
): Promise<Topic> {
    const supabase = await createClient();

    // Get next sort order
    const { data: existing } = await supabase
        .from("topics")
        .select("sort_order")
        .eq("pipeline_id", pipelineId)
        .order("sort_order", { ascending: false })
        .limit(1);

    const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;

    // 1. Create the topic
    const { data, error } = await supabase
        .from("topics")
        .insert({ ...topic, pipeline_id: pipelineId, sort_order: nextOrder })
        .select()
        .single();

    if (error) throw error;

    // 2. Trigger Instant Generation
    // We launch this asynchronously (without await) if we wanted to return fast, 
    // BUT user wants to see it generated. However, Server Actions limit async background work 
    // that outlives the request.
    // So we await it to ensure it completes before returning.

    try {
        await generateTopicContent(data.id, pipelineId);
        // Re-fetch topic to get updated status
        const { data: updated, error: fetchErr } = await supabase
            .from("topics")
            .select("*")
            .eq("id", data.id)
            .single() as { data: Topic, error: any };

        if (fetchErr) throw fetchErr;

        // Ensure we return a plain, serializable object for Client Components
        const normalizedTopic: Topic = {
            id: updated.id,
            pipeline_id: updated.pipeline_id,
            title: updated.title,
            notes: updated.notes || "",
            is_evergreen: updated.is_evergreen,
            recycle_interval_days: updated.recycle_interval_days,
            last_used_at: updated.last_used_at,
            sort_order: updated.sort_order,
            status: updated.status,
            created_at: updated.created_at
        };

        revalidatePath("/dashboard/pipelines/topics");
        return normalizedTopic;
    } catch (e: any) {
        console.error("[Instant Generation] Failed:", e.message || e);
        revalidatePath("/dashboard/pipelines/topics");
        throw new Error(e.message || "Failed to generate content.");
    }
}

export async function updateTopic(
    id: string,
    updates: Partial<Topic>
): Promise<Topic> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("topics")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data as Topic;
}

export async function deleteTopic(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("topics").delete().eq("id", id);
    if (error) throw error;
}

export async function getNextPendingTopic(pipelineId: string): Promise<Topic | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("pipeline_id", pipelineId)
        .eq("status", "pending")
        .order("sort_order", { ascending: true })
        .limit(1)
        .single();

    if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
    }
    return data as Topic;
}

export async function reorderTopics(
    pipelineId: string,
    orderedIds: string[]
): Promise<void> {
    const supabase = await createClient();

    const updates = orderedIds.map((id, index) =>
        supabase
            .from("topics")
            .update({ sort_order: index + 1 })
            .eq("id", id)
    );

    const results = await Promise.all(updates);
    const firstError = results.find(r => r.error)?.error;
    if (firstError) throw firstError;
}

// =============================================
// POSTS API
// =============================================

export async function getPosts(filters?: {
    pipelineId?: string;
    status?: string;
    platform?: string;
    limit?: number;
    offset?: number;
    fromDate?: string;
    toDate?: string;
    columns?: string;
}): Promise<Post[]> {
    const supabase = await createClient();
    let query = supabase.from("posts").select(filters?.columns ?? "*, topics(title)");

    if (filters?.pipelineId) {
        query = query.eq("pipeline_id", filters.pipelineId);
    }
    if (filters?.status) {
        query = query.eq("status", filters.status);
    }
    if (filters?.platform) {
        query = query.eq("platform", filters.platform);
    }
    if (filters?.fromDate) {
        query = query.gte("created_at", filters.fromDate);
    }
    if (filters?.toDate) {
        query = query.lte("created_at", filters.toDate);
    }
    if (typeof filters?.offset === "number" && typeof filters?.limit === "number") {
        const to = filters.offset + Math.max(filters.limit - 1, 0);
        query = query.range(filters.offset, to);
    } else if (typeof filters?.limit === "number") {
        query = query.limit(filters.limit);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;
    return (data as any) as Post[];
}

export async function getPost(id: string): Promise<Post | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
    }
    return data as Post;
}

export async function updatePostStatus(
    id: string,
    status: Post["status"],
    errorMessage?: string | null
): Promise<Post> {
    const supabase = await createClient();
    const updates: any = { status };

    if (errorMessage !== undefined) {
        updates.error_message = errorMessage;
    }

    const { data, error } = await supabase
        .from("posts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data as Post;
}

export async function schedulePost(id: string, scheduledFor: string): Promise<Post> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("posts")
        .update({
            status: "scheduled",
            scheduled_for: scheduledFor,
            error_message: null
        })
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data as Post;
}

export async function approvePost(id: string): Promise<Post> {
    return updatePostStatus(id, "approved");
}

export async function skipPost(id: string): Promise<Post> {
    return updatePostStatus(id, "skipped");
}

export async function createPost(post: Omit<Post, "id" | "created_at" | "updated_at" | "topics">): Promise<Post> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("posts")
        .insert(post)
        .select()
        .single();

    if (error) throw error;
    return data as Post;
}

// =============================================
// PLATFORM CONNECTIONS API
// =============================================

export async function getPlatformConnections(): Promise<PlatformConnection[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("platform_connections")
        .select("*")
        .order("platform");

    if (error) throw error;
    return data as PlatformConnection[];
}

export async function disconnectPlatform(platform: string): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
        .from("platform_connections")
        .delete()
        .eq("user_id", user.id)
        .eq("platform", platform);

    if (error) throw error;
}

// =============================================
// DASHBOARD STATS API
// =============================================

export async function getDashboardStats() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase.rpc("get_user_dashboard_stats", {
        p_user_id: user.id,
    });

    if (error) throw error;
    return data as {
        pipelines_count: number;
        scheduled_count: number;
        pending_count: number;
        published_this_week: number;
        platforms_connected: number;
    };
}
