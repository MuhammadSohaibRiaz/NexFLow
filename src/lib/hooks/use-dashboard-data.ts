import useSWR from "swr";
import type { Post, Pipeline } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useDashboardPosts(options?: { status?: string; limit?: number }) {
    const query = new URLSearchParams();
    if (options?.status) query.append("status", options.status);
    if (options?.limit) query.append("limit", options.limit.toString());

    const { data, error, isLoading, mutate, isValidating } = useSWR<Post[]>(
        `/api/dashboard/posts?${query.toString()}`,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateIfStale: true,
            dedupingInterval: 1000,
        }
    );

    return {
        posts: data,
        isLoading,
        isValidating,
        isError: error,
        mutate
    };
}

export function useDashboardPipelines() {
    const { data, error, isLoading, mutate, isValidating } = useSWR<Pipeline[]>(
        "/api/dashboard/pipelines",
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateIfStale: true,
            dedupingInterval: 1000,
        }
    );

    return {
        pipelines: data,
        isLoading,
        isValidating,
        isError: error,
        mutate
    };
}

export function useDashboardStats() {
    const { data, error, isLoading, mutate, isValidating } = useSWR(
        "/api/dashboard/stats",
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateIfStale: true,
            dedupingInterval: 1000,
        }
    );

    return {
        stats: data,
        isLoading,
        isValidating,
        isError: error,
        mutate
    };
}
