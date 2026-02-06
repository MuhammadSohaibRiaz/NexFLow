"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// This will be replaced with actual data from Supabase
const mockPipelines: Array<{
    id: string;
    name: string;
    description: string;
    platforms: string[];
    frequency: string;
    nextPost: string;
    topicCount: number;
    status: "active" | "paused";
}> = [];

export default function PipelinesPage() {
    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Pipelines</h1>
                    <p className="text-muted-foreground">
                        Create topic queues that automatically generate and publish content
                    </p>
                </div>
                <Link href="/dashboard/pipelines/new">
                    <Button className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700">
                        + New Pipeline
                    </Button>
                </Link>
            </div>

            {/* Empty State */}
            {mockPipelines.length === 0 ? (
                <Card className="bg-gradient-to-br from-violet-950/20 to-blue-950/20 border-violet-500/20">
                    <CardContent className="py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-6">
                            <span className="text-3xl">📋</span>
                        </div>
                        <h2 className="text-xl font-semibold mb-2">No pipelines yet</h2>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                            Create your first pipeline to start automating your social media.
                            Add topics, set a schedule, and let AI do the rest.
                        </p>
                        <Link href="/dashboard/pipelines/new">
                            <Button className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700">
                                Create Your First Pipeline
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                /* Pipelines Grid */
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mockPipelines.map((pipeline) => (
                        <Card key={pipeline.id} className="bg-card/50 border-border/50 hover:border-violet-500/30 transition-colors">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-lg">{pipeline.name}</CardTitle>
                                        <CardDescription className="mt-1">{pipeline.description}</CardDescription>
                                    </div>
                                    <Badge variant={pipeline.status === "active" ? "default" : "secondary"}>
                                        {pipeline.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Platforms</span>
                                        <div className="flex gap-1">
                                            {pipeline.platforms.map((p) => (
                                                <Badge key={p} variant="outline" className="text-xs">
                                                    {p}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Frequency</span>
                                        <span>{pipeline.frequency}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Topics</span>
                                        <span>{pipeline.topicCount} queued</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Next Post</span>
                                        <span className="text-violet-400">{pipeline.nextPost}</span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-border/50 flex gap-2">
                                    <Link href={`/dashboard/pipelines/${pipeline.id}`} className="flex-1">
                                        <Button variant="outline" size="sm" className="w-full">
                                            View
                                        </Button>
                                    </Link>
                                    <Link href={`/dashboard/pipelines/${pipeline.id}/topics`} className="flex-1">
                                        <Button size="sm" className="w-full">
                                            + Topics
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
