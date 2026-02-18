"use client";

import { useDashboardPosts } from "@/lib/hooks/use-dashboard-data";
import { PostsView } from "./posts-view";
import DashboardLoading from "../loading";

export default function PostsPage() {
    const { posts, isLoading } = useDashboardPosts();

    if (isLoading || !posts) {
        return <DashboardLoading />;
    }

    return <PostsView initialPosts={posts} />;
}
