import useSWR from "swr";
import type { Post, Pipeline } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useDashboardPosts(options?: { status?: string; limit?: number }) {
    const query = new URLSearchParams();
    if (options?.status) query.append("status", options.status);
    if (options?.limit) query.append("limit", options.limit.toString());

    const { data, error, isLoading, mutate } = useSWR<Post[]>(
        `/api/dashboard/posts?${query.toString()}`,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000, // 30 seconds
        }
    );

    return {
        posts: data,
        isLoading,
        isError: error,
        mutate
    };
}

export function useDashboardPipelines() {
    const { data, error, isLoading, mutate } = useSWR<Pipeline[]>(
        "/api/dashboard/pipelines",
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        pipelines: data,
        isLoading,
        isError: error,
        mutate
    };
}

export function useDashboardStats() {
    const { data, error, isLoading, mutate } = useSWR(
        "/api/dashboard/stats",
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        stats: data,
        isLoading,
        isError: error,
        mutate
    };
}
