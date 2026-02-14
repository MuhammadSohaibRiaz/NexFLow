"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";

interface DashboardStats {
    pipelines: number;
    scheduled: number;
    published: number;
    generated: number;
    platforms: number;
}

interface RecentPost {
    id: string;
    platform: string;
    status: string;
    content: string;
    created_at: string;
    published_at: string | null;
}

export default function DashboardPage() {
    const [userName, setUserName] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({
        pipelines: 0,
        scheduled: 0,
        published: 0,
        generated: 0,
        platforms: 0,
    });
    const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);

    useEffect(() => {
        const loadDashboard = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            setUserName(user.user_metadata?.full_name || "there");

            // Fetch all stats in parallel
            const [pipelinesRes, scheduledRes, publishedRes, generatedRes, platformsRes, recentRes] = await Promise.all([
                supabase
                    .from("pipelines")
                    .select("id", { count: "exact", head: true })
                    .eq("user_id", user.id)
                    .eq("is_active", true),
                supabase
                    .from("posts")
                    .select("id", { count: "exact", head: true })
                    .eq("user_id", user.id)
                    .eq("status", "scheduled"),
                supabase
                    .from("posts")
                    .select("id", { count: "exact", head: true })
                    .eq("user_id", user.id)
                    .eq("status", "published"),
                supabase
                    .from("posts")
                    .select("id", { count: "exact", head: true })
                    .eq("user_id", user.id)
                    .eq("status", "generated"),
                supabase
                    .from("platform_connections")
                    .select("id", { count: "exact", head: true })
                    .eq("user_id", user.id)
                    .eq("is_active", true),
                supabase
                    .from("posts")
                    .select("id, platform, status, content, created_at, published_at")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false })
                    .limit(5),
            ]);

            setStats({
                pipelines: pipelinesRes.count || 0,
                scheduled: scheduledRes.count || 0,
                published: publishedRes.count || 0,
                generated: generatedRes.count || 0,
                platforms: platformsRes.count || 0,
            });

            setRecentPosts(recentRes.data || []);
            setLoading(false);
        };

        loadDashboard();
    }, []);

    const statusColors: Record<string, string> = {
        generated: "text-blue-400",
        scheduled: "text-yellow-400",
        published: "text-emerald-400",
        failed: "text-red-400",
        pending: "text-orange-400",
    };

    if (loading) {
        return (
            <div className="p-8">
                <Skeleton className="h-10 w-64 mb-8" />
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Welcome back, {userName}! 👋</h1>
                <p className="text-muted-foreground">
                    Here&apos;s what&apos;s happening with your social media automation.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
                <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-2">
                        <CardDescription>Active Pipelines</CardDescription>
                        <CardTitle className="text-3xl">{stats.pipelines}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Link href="/dashboard/pipelines">
                            <Button variant="link" className="p-0 h-auto text-violet-400">
                                {stats.pipelines > 0 ? "View pipelines →" : "Create first pipeline →"}
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-2">
                        <CardDescription>Awaiting Review</CardDescription>
                        <CardTitle className="text-3xl">{stats.generated}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Link href="/dashboard/posts">
                            <Button variant="link" className="p-0 h-auto text-blue-400">
                                {stats.generated > 0 ? "Review posts →" : "No posts to review"}
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-2">
                        <CardDescription>Scheduled Posts</CardDescription>
                        <CardTitle className="text-3xl">{stats.scheduled}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Link href="/dashboard/posts">
                            <Button variant="link" className="p-0 h-auto text-yellow-400">
                                {stats.scheduled > 0 ? "View scheduled →" : "None scheduled"}
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-2">
                        <CardDescription>Connected Platforms</CardDescription>
                        <CardTitle className="text-3xl">{stats.platforms}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Link href="/dashboard/platforms">
                            <Button variant="link" className="p-0 h-auto text-violet-400">
                                {stats.platforms > 0 ? "Manage platforms →" : "Connect platforms →"}
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-violet-950/30 to-blue-950/30 border-violet-500/20 mb-8">
                <CardHeader>
                    <CardTitle>Get Started</CardTitle>
                    <CardDescription>
                        Complete these steps to start automating your social media
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${stats.platforms > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-violet-500/20 text-violet-400"}`}>
                                {stats.platforms > 0 ? "✓" : "1"}
                            </div>
                            <div>
                                <h3 className="font-medium mb-1">Connect Platforms</h3>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Link your Facebook, LinkedIn, or other accounts
                                </p>
                                <Link href="/dashboard/platforms">
                                    <Button size="sm" variant="outline">
                                        {stats.platforms > 0 ? "Manage" : "Connect"}
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${stats.pipelines > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"}`}>
                                {stats.pipelines > 0 ? "✓" : "2"}
                            </div>
                            <div>
                                <h3 className="font-medium mb-1">Create a Pipeline</h3>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Set up your first topic queue and schedule
                                </p>
                                <Link href="/dashboard/pipelines/new">
                                    <Button size="sm" variant="outline">
                                        Create
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${stats.published > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                                {stats.published > 0 ? "✓" : "3"}
                            </div>
                            <div>
                                <h3 className="font-medium mb-1">Add Topics</h3>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Queue topics and let AI generate content
                                </p>
                                <Link href="/dashboard/pipelines">
                                    <Button size="sm" variant="outline">
                                        Add Topics
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-card/50 border-border/50">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your latest posts and updates</CardDescription>
                </CardHeader>
                <CardContent>
                    {recentPosts.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p className="text-4xl mb-4">🚀</p>
                            <p>No activity yet. Create your first pipeline to get started!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentPosts.map((post) => (
                                <div key={post.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Badge variant="outline" className="text-xs shrink-0 capitalize">
                                            {post.platform}
                                        </Badge>
                                        <p className="text-sm truncate text-muted-foreground">
                                            {post.content?.substring(0, 80)}{(post.content?.length || 0) > 80 ? "..." : ""}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0 ml-4">
                                        <span className={`text-xs font-medium capitalize ${statusColors[post.status] || "text-muted-foreground"}`}>
                                            {post.status}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(post.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div className="text-center pt-2">
                                <Link href="/dashboard/posts">
                                    <Button variant="link" className="text-violet-400">
                                        View all posts →
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
