"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pipeline } from "@/lib/types";
import { deletePipeline } from "@/lib/api/db";
import { mutate } from "swr";
import { toast } from "sonner";

interface PipelinesViewProps {
    initialPipelines: Pipeline[];
}

export function PipelinesView({ initialPipelines }: PipelinesViewProps) {
    const [pipelines, setPipelines] = useState<Pipeline[]>(initialPipelines);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [pipelineToDelete, setPipelineToDelete] = useState<string | null>(null);

    // Keep local state in sync with props from SWR
    useEffect(() => {
        setPipelines(initialPipelines);
    }, [initialPipelines]);

    const handleDelete = async () => {
        if (!pipelineToDelete) return;

        const pipelineId = pipelineToDelete;
        setPipelineToDelete(null); // Close dialog

        // Optimistically remove from UI immediately
        setDeletingIds(prev => new Set(prev).add(pipelineId));
        // ...

        try {
            await deletePipeline(pipelineId);
            // Revalidate SWR cache
            mutate("/api/dashboard/pipelines");
            // Remove from local state — no page reload needed
            setPipelines(prev => prev.filter(p => p.id !== pipelineId));
        } catch (e) {
            // Revert on error
            setDeletingIds(prev => {
                const next = new Set(prev);
                next.delete(pipelineId);
                return next;
            });
            toast.error("Failed to delete pipeline");
        }
    };

    return (
        <div className="p-8 text-white">
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
            {pipelines.length === 0 ? (
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
                    {pipelines.map((pipeline) => (
                        <Card
                            key={pipeline.id}
                            className={`bg-card/50 border-border/50 hover:border-violet-500/30 transition-all ${deletingIds.has(pipeline.id) ? "opacity-50 pointer-events-none scale-95" : ""
                                }`}
                        >
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-lg">{pipeline.name}</CardTitle>
                                        <CardDescription className="mt-1">{pipeline.description || "No description"}</CardDescription>
                                    </div>
                                    <Badge variant={pipeline.is_active ? "default" : "secondary"}>
                                        {pipeline.is_active ? "Active" : "Paused"}
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
                                        <span className="capitalize">{pipeline.frequency}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Next Cycle</span>
                                        <span className="text-violet-400">
                                            {pipeline.next_run_at ? new Date(pipeline.next_run_at).toLocaleDateString() + " " + new Date(pipeline.next_run_at).toLocaleTimeString() : "Not set"}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-border/50 flex gap-2">
                                    <Link href={`/dashboard/pipelines/topics?pipelineId=${pipeline.id}`} className="flex-1">
                                        <Button size="sm" className="w-full">
                                            Manage Topics
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                        disabled={deletingIds.has(pipeline.id)}
                                        onClick={() => setPipelineToDelete(pipeline.id)}
                                    >
                                        🗑️
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Confirmation Dialog */}
            <Dialog open={!!pipelineToDelete} onOpenChange={() => setPipelineToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Pipeline</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this pipeline? This will remove all associated topics and posts. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setPipelineToDelete(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
