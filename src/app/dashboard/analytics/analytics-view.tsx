"use client";

import { useMemo } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    PieChart,
    Pie
} from "recharts";
import { format, subDays, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, Users, Target, CheckCircle2 } from "lucide-react";
import type { Post } from "@/lib/types";

interface AnalyticsViewProps {
    initialPosts: Post[];
    stats: any;
}

const PLATFORM_COLORS: Record<string, string> = {
    twitter: "#0ea5e9",
    linkedin: "#2563eb",
    facebook: "#4f46e5",
    instagram: "#db2777"
};

export default function AnalyticsView({ initialPosts, stats }: AnalyticsViewProps) {
    // 1. Process data for Post Volume Trend (Last 7 Days)
    const volumeData = useMemo(() => {
        const last7Days = eachDayOfInterval({
            start: subDays(new Date(), 6),
            end: new Date()
        });

        return last7Days.map(day => {
            const count = initialPosts.filter(post =>
                post.status === "published" &&
                post.published_at &&
                isSameDay(parseISO(post.published_at), day)
            ).length;

            return {
                name: format(day, "MMM dd"),
                posts: count
            };
        });
    }, [initialPosts]);

    // 2. Process data for Platform Distribution
    const platformData = useMemo(() => {
        const counts: Record<string, number> = {};
        initialPosts.forEach(post => {
            counts[post.platform] = (counts[post.platform] || 0) + 1;
        });

        return Object.entries(counts).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            color: PLATFORM_COLORS[name] || "#71717a"
        }));
    }, [initialPosts]);

    // 3. Status breakdown
    const statusData = useMemo(() => {
        const counts: Record<string, number> = {};
        initialPosts.forEach(post => {
            counts[post.status] = (counts[post.status] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [initialPosts]);

    return (
        <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-zinc-950 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Published</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.published_this_week || 0}</div>
                        <p className="text-xs text-zinc-500 mt-1">This week</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Scheduled Posts</CardTitle>
                        <Target className="h-4 w-4 text-violet-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.scheduled_count || 0}</div>
                        <p className="text-xs text-zinc-500 mt-1">Awaiting publish</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Pipelines</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.pipelines_count || 0}</div>
                        <p className="text-xs text-zinc-500 mt-1">Active systems</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Platforms</CardTitle>
                        <Users className="h-4 w-4 text-pink-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.platforms_connected || 0}</div>
                        <p className="text-xs text-zinc-500 mt-1">Active connections</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Main Trend Chart */}
                <Card className="col-span-4 bg-zinc-950 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-white">Publishing Trend</CardTitle>
                        <CardDescription className="text-zinc-500">Number of published posts over the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={volumeData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#71717a"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#71717a"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#09090b", border: "1px solid #27272a", color: "#fff" }}
                                        itemStyle={{ color: "#a78bfa" }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="posts"
                                        stroke="#8b5cf6"
                                        strokeWidth={2}
                                        dot={{ fill: "#8b5cf6", strokeWidth: 2 }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Distribution Chart */}
                <Card className="col-span-3 bg-zinc-950 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-white">Platform Distribution</CardTitle>
                        <CardDescription className="text-zinc-500">Breakdown of content by social platform</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={platformData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#71717a"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#71717a"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#27272a', opacity: 0.4 }}
                                        contentStyle={{ backgroundColor: "#09090b", border: "1px solid #27272a", color: "#fff" }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {platformData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
