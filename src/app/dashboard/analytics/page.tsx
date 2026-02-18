import { Suspense } from "react";
import { getPosts, getDashboardStats } from "@/lib/api/db";
import AnalyticsView from "./analytics-view";

// Force dynamic rendering to ensure auth state is fresh
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
    // We don't need to explicitly check user here because:
    // 1. Middleware protects the route
    // 2. getPosts/getDashboardStats throw if not authenticated
    // 3. The try/catch below handles the error safely without looping

    try {
        const posts = await getPosts();
        const stats = await getDashboardStats();

        return (
            <div className="flex-1 space-y-4 p-8 pt-6 bg-black min-h-screen border-l border-zinc-800">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-blue-500">
                        Analytics Insights
                    </h2>
                </div>

                <Suspense fallback={<div className="text-zinc-500">Loading Analytics...</div>}>
                    <AnalyticsView initialPosts={posts} stats={stats} />
                </Suspense>
            </div>
        );
    } catch (error) {
        console.error("Failed to load analytics:", error);
        return (
            <div className="p-8 text-red-500">
                Failed to load analytics data. Please try refreshing.
            </div>
        );
    }
}
