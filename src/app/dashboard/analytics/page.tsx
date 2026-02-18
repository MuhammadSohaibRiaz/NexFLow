import { Suspense } from "react";
import { getPosts, getDashboardStats } from "@/lib/api/db";
import AnalyticsView from "./analytics-view";

export default async function AnalyticsPage() {
    // Fetch all posts to calculate metrics
    // In a larger app, we'd do this via a specialized SQL query or aggregation
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
}
