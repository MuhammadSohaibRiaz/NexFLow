"use client";

import { useDashboardPosts, useDashboardStats } from "@/lib/hooks/use-dashboard-data";
import AnalyticsView from "./analytics-view";
import DashboardLoading from "../loading";

export default function AnalyticsPage() {
    const { posts, isLoading: postsLoading } = useDashboardPosts();
    const { stats, isLoading: statsLoading } = useDashboardStats();

    if (postsLoading || statsLoading || !posts || !stats) {
        return <DashboardLoading />;
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 bg-black min-h-screen border-l border-zinc-800">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-blue-500">
                    Analytics Insights
                </h2>
            </div>

            <AnalyticsView initialPosts={posts} stats={stats} />
        </div>
    );
}
