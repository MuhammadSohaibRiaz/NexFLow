"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createTopic, deleteTopic } from "@/lib/api/db";
import { Topic, Pipeline } from "@/lib/types";

interface TopicsViewProps {
    pipeline: Pipeline;
    initialTopics: Topic[];
}

export function TopicsView({ pipeline, initialTopics }: TopicsViewProps) {
    const [topics, setTopics] = useState<Topic[]>(initialTopics);
    const [newTopicTitle, setNewTopicTitle] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const LOADING_STEPS = [
        "Analyzing topic idea...",
        "Establishing brand voice...",
        "Generating content for platforms...",
        "Optimizing hashtags & tone...",
        "Finalizing posts..."
    ];

    const handleAddTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTopicTitle.trim()) return;

        setIsAdding(true);
        let stepIndex = 0;
        setLoadingStatus(LOADING_STEPS[0]);

        const statusInterval = setInterval(() => {
            stepIndex++;
            if (stepIndex < LOADING_STEPS.length) {
                setLoadingStatus(LOADING_STEPS[stepIndex]);
            }
        }, 1500);

        try {
            const topic = await createTopic(pipeline.id, {
                title: newTopicTitle,
                is_evergreen: false,
                status: "pending"
            });

            if (topic && topic.id) {
                setTopics(prev => [...prev, topic]);
                if (topic.error) {
                    toast.warning(`Topic added, but generation failed: ${topic.error}`);
                } else {
                    toast.success("Content generated and scheduled!");
                }
            }

            setNewTopicTitle("");
        } catch (error: any) {
            toast.error(error.message || "Failed to add topic");
        } finally {
            clearInterval(statusInterval);
            setIsAdding(false);
            setLoadingStatus(null);
        }
    };

    const handleDeleteTopic = async (topicId: string) => {
        setIsDeleting(topicId);
        try {
            await deleteTopic(topicId);
            setTopics(topics.filter(t => t.id !== topicId));
            toast.success("Topic removed");
        } catch (error) {
            toast.error("Failed to remove topic");
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto text-white">
            <Link href="/dashboard/pipelines" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">
                ← Back to Pipelines
            </Link>

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Manage Topics</h1>
                    <p className="text-muted-foreground">
                        Queue for: <span className="text-violet-400 font-medium">{pipeline.name}</span>
                    </p>
                </div>
                <Badge variant="outline">{topics.length} Topics Queued</Badge>
            </div>

            {/* Quick Add Form */}
            <Card className="bg-gradient-to-r from-violet-950/20 to-blue-950/20 border-violet-500/20 mb-8">
                <CardContent className="pt-6">
                    <form onSubmit={handleAddTopic} className="flex gap-4">
                        <Input
                            placeholder="Enter a new topic or idea..."
                            value={newTopicTitle}
                            onChange={(e) => setNewTopicTitle(e.target.value)}
                            className="bg-background/50"
                        />
                        <Button
                            type="submit"
                            disabled={isAdding || !newTopicTitle.trim()}
                            className="bg-gradient-to-r from-violet-600 to-blue-600 min-w-[140px]"
                        >
                            {isAdding ? (
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                    {loadingStatus}
                                </div>
                            ) : (
                                "+ Add to Queue"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Topics List */}
            <div className="space-y-4">
                {topics.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-xl">
                        <p className="text-muted-foreground text-lg">No topics in this pipeline yet.</p>
                        <p className="text-sm text-muted-foreground mt-2">Add your first topic above to start generating content.</p>
                    </div>
                ) : (
                    topics.map((topic, index) => (
                        <Card key={topic.id} className="bg-card/50 border-border/50 hover:border-violet-500/20 transition-all">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center text-xs font-bold text-violet-400">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-lg">{topic.title}</h3>
                                        <div className="flex gap-2 mt-1">
                                            <Badge variant="secondary" className="text-[10px] h-4">
                                                {topic.status}
                                            </Badge>
                                            {topic.is_evergreen && (
                                                <Badge variant="outline" className="text-[10px] h-4 text-green-400">
                                                    Evergreen
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-white" disabled>
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                        onClick={() => handleDeleteTopic(topic.id)}
                                        disabled={isDeleting === topic.id}
                                    >
                                        {isDeleting === topic.id ? "..." : "Remove"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
