"use client";

import { useCallback, useEffect, useState } from "react";

type CacheEntry<T> = {
    data: T;
    updatedAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_STALE_MS = 30_000;

async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
        method: "GET",
        credentials: "include",
    });

    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(body || `Request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
}

async function fetchWithDedupe<T>(key: string, url: string): Promise<T> {
    const existing = inflight.get(key);
    if (existing) {
        return existing as Promise<T>;
    }

    const promise = fetchJson<T>(url)
        .finally(() => {
            inflight.delete(key);
        });

    inflight.set(key, promise);
    return promise;
}

export function useDashboardQuery<T>(
    key: string,
    url: string,
    options?: {
        staleMs?: number;
        enabled?: boolean;
    }
) {
    const staleMs = options?.staleMs ?? DEFAULT_STALE_MS;
    const enabled = options?.enabled ?? true;

    const initialEntry = cache.get(key) as CacheEntry<T> | undefined;

    const [data, setData] = useState<T | null>(initialEntry?.data ?? null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(!initialEntry?.data);
    const [isValidating, setIsValidating] = useState(false);

    const revalidate = useCallback(async () => {
        if (!enabled) return;

        setIsValidating(true);
        setError(null);

        try {
            const fresh = await fetchWithDedupe<T>(key, url);
            cache.set(key, { data: fresh, updatedAt: Date.now() });
            setData(fresh);
            setLoading(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load data");
            setLoading(false);
        } finally {
            setIsValidating(false);
        }
    }, [enabled, key, url]);

    useEffect(() => {
        if (!enabled) return;

        const entry = cache.get(key) as CacheEntry<T> | undefined;
        const hasCached = !!entry?.data;
        const isStale = !entry || Date.now() - entry.updatedAt > staleMs;

        if (hasCached) {
            setData(entry.data);
            setLoading(false);
        } else {
            setLoading(true);
        }

        if (!hasCached || isStale) {
            void revalidate();
        }
    }, [enabled, key, staleMs, revalidate]);

    return {
        data,
        error,
        loading,
        isValidating,
        refresh: revalidate,
    };
}

