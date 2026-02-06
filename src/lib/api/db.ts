import { createClient } from "@/lib/supabase/server";
import type { Pipeline, Topic, Post, PlatformConnection } from "@/lib/types";

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
    return data as Topic[];
}

export async function createTopic(
    pipelineId: string,
    topic: Omit<Topic, "id" | "pipeline_id" | "created_at">
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

    const { data, error } = await supabase
        .from("topics")
        .insert({ ...topic, pipeline_id: pipelineId, sort_order: nextOrder })
        .select()
        .single();

    if (error) throw error;
    return data as Topic;
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

export async function reorderTopics(
    pipelineId: string,
    orderedIds: string[]
): Promise<void> {
    const supabase = await createClient();

    const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index + 1,
    }));

    for (const { id, sort_order } of updates) {
        const { error } = await supabase
            .from("topics")
            .update({ sort_order })
            .eq("id", id);
        if (error) throw error;
    }
}

// =============================================
// POSTS API
// =============================================

export async function getPosts(filters?: {
    pipelineId?: string;
    status?: string;
    platform?: string;
}): Promise<Post[]> {
    const supabase = await createClient();
    let query = supabase.from("posts").select("*");

    if (filters?.pipelineId) {
        query = query.eq("pipeline_id", filters.pipelineId);
    }
    if (filters?.status) {
        query = query.eq("status", filters.status);
    }
    if (filters?.platform) {
        query = query.eq("platform", filters.platform);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;
    return data as Post[];
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
    status: Post["status"]
): Promise<Post> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("posts")
        .update({ status })
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
