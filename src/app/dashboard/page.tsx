"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";

// Mock data for now - will be replaced with real data
const mockStats = {
    pipelines: 0,
    scheduled: 0,
    published: 0,
    platforms: 0,
};

export default function DashboardPage() {
    const [userName, setUserName] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserName(user.user_metadata?.full_name || "there");
            }
            setLoading(false);
        };
        getUser();
    }, []);

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
                        <CardTitle className="text-3xl">{mockStats.pipelines}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Link href="/dashboard/pipelines">
                            <Button variant="link" className="p-0 h-auto text-violet-400">
                                Create first pipeline →
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-2">
                        <CardDescription>Scheduled Posts</CardDescription>
                        <CardTitle className="text-3xl">{mockStats.scheduled}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="secondary" className="text-xs">
                            Coming soon
                        </Badge>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-2">
                        <CardDescription>Published This Week</CardDescription>
                        <CardTitle className="text-3xl">{mockStats.published}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="secondary" className="text-xs">
                            No posts yet
                        </Badge>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-2">
                        <CardDescription>Connected Platforms</CardDescription>
                        <CardTitle className="text-3xl">{mockStats.platforms}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Link href="/dashboard/platforms">
                            <Button variant="link" className="p-0 h-auto text-violet-400">
                                Connect platforms →
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
                            <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold shrink-0">
                                1
                            </div>
                            <div>
                                <h3 className="font-medium mb-1">Connect Platforms</h3>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Link your Facebook, LinkedIn, or other accounts
                                </p>
                                <Link href="/dashboard/platforms">
                                    <Button size="sm" variant="outline">
                                        Connect
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0">
                                2
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
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                                3
                            </div>
                            <div>
                                <h3 className="font-medium mb-1">Add Topics</h3>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Queue topics and let AI generate content
                                </p>
                                <Button size="sm" variant="outline" disabled>
                                    Add Topics
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-card/50 border-border/50">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your latest automated posts and updates</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                        <p className="text-4xl mb-4">🚀</p>
                        <p>No activity yet. Create your first pipeline to get started!</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
