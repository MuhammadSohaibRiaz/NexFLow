"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Post } from "@/lib/types";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PostsViewProps {
    initialPosts: Post[];
}

const statusColors: Record<string, string> = {
    draft: "bg-yellow-500/20 text-yellow-400",
    pending: "bg-blue-500/20 text-blue-400",
    approved: "bg-cyan-500/20 text-cyan-400",
    generated: "bg-indigo-500/20 text-indigo-400",
    scheduled: "bg-violet-500/20 text-violet-400",
    published: "bg-emerald-500/20 text-emerald-400",
    failed: "bg-red-500/20 text-red-400",
    skipped: "bg-gray-500/20 text-gray-400",
};

export function PostsView({ initialPosts }: PostsViewProps) {
    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [publishingId, setPublishingId] = useState<string | null>(null);
    const [schedulingId, setSchedulingId] = useState<string | null>(null);
    const [scheduledTime, setScheduledTime] = useState<string>("");
    const [approvingId, setApprovingId] = useState<string | null>(null);

    const handleApprove = async (postId: string, scheduledFor?: string) => {
        setApprovingId(postId);
        try {
            const res = await fetch("/api/posts/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId, scheduledFor }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to approve");
            }

            setPosts(posts.map(p =>
                p.id === postId
                    ? { ...p, status: "scheduled", scheduled_for: data.post?.scheduled_for }
                    : p
            ));

            alert("Post approved and scheduled! 📅");
        } catch (error: any) {
            console.error(error);
            alert(`Error: ${error.message}`);
        } finally {
            setApprovingId(null);
        }
    };

    const handlePublish = async (postId: string) => {
        setPublishingId(postId);
        try {
            const res = await fetch("/api/posts/publish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to publish");
            }

            // Update local state
            setPosts(posts.map(p =>
                p.id === postId ? { ...p, status: "published", published_at: new Date().toISOString() } : p
            ));

            alert("Post published successfully! 🚀");

        } catch (error: any) {
            console.error(error);
            alert(`Error: ${error.message}`);
            setPosts(posts.map(p =>
                p.id === postId ? { ...p, status: "failed", error_message: error.message } : p
            ));
        } finally {
            setPublishingId(null);
        }
    };

    const handleSchedule = async () => {
        if (!schedulingId || !scheduledTime) return;

        try {
            const res = await fetch("/api/posts/schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    postId: schedulingId,
                    scheduledFor: new Date(scheduledTime).toISOString()
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Failed to schedule");

            setPosts(posts.map(p =>
                p.id === schedulingId ? { ...p, status: "scheduled", scheduled_for: scheduledTime } : p
            ));

            alert("Post scheduled successfully! 📅");
            setSchedulingId(null);
            setScheduledTime("");

        } catch (error: any) {
            console.error(error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleCreateTestPost = async (platform: string) => {
        try {
            const res = await fetch("/api/posts/create-test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ platform }),
            });
            if (res.ok) {
                alert("Test post created! Page will refresh.");
                window.location.reload();
            } else {
                const d = await res.json();
                alert("Error: " + d.error);
            }
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    const filterPosts = (status: string) => {
        if (status === "all") return posts;
        return posts.filter(p => p.status === status);
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Posts</h1>
                    <p className="text-muted-foreground">
                        View and manage all generated and scheduled posts
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleCreateTestPost("twitter")}>
                        + Test Tweet
                    </Button>
                    <Button variant="outline" onClick={() => handleCreateTestPost("facebook")}>
                        + Test FB Post
                    </Button>
                    <Button variant="outline" onClick={() => handleCreateTestPost("linkedin")}>
                        + Test LinkedIn
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="all" className="space-y-6">
                <TabsList className="bg-card/50">
                    <TabsTrigger value="all">All Posts</TabsTrigger>
                    <TabsTrigger value="pending">Pending Review</TabsTrigger>
                    <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                    <TabsTrigger value="published">Published</TabsTrigger>
                </TabsList>

                {["all", "pending", "scheduled", "published"].map((tab) => (
                    <TabsContent key={tab} value={tab}>
                        {filterPosts(tab).length === 0 ? (
                            <Card className="bg-gradient-to-br from-violet-950/20 to-blue-950/20 border-violet-500/20">
                                <CardContent className="py-16 text-center">
                                    <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-6">
                                        <span className="text-3xl">📝</span>
                                    </div>
                                    <h2 className="text-xl font-semibold mb-2">No posts found</h2>
                                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                        {tab === "all"
                                            ? "Posts will appear here once you add topics to a pipeline or create a test post."
                                            : `No posts with status '${tab}'`}
                                    </p>
                                    {tab === "all" && (
                                        <Link href="/dashboard/pipelines">
                                            <Button className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700">
                                                Go to Pipelines
                                            </Button>
                                        </Link>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {filterPosts(tab).map((post) => (
                                    <Card key={post.id} className="bg-card/50 border-border/50">
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <CardTitle className="text-lg">
                                                        {post.topics?.title || "Test Topic"}
                                                    </CardTitle>
                                                    <CardDescription className="mt-1">
                                                        <span className="capitalize">{post.platform}</span> • Created {new Date(post.created_at).toLocaleDateString()}
                                                    </CardDescription>
                                                </div>
                                                <Badge className={statusColors[post.status] || ""}>
                                                    {post.status}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="mb-4 text-sm text-muted-foreground line-clamp-3 whitespace-pre-line">
                                                {post.content}
                                            </p>

                                            {post.image_url && (
                                                <div className="mb-4 overflow-hidden rounded-lg border border-border/50 bg-black/40">
                                                    <img
                                                        src={post.image_url}
                                                        alt={post.topics?.title || "AI Generated"}
                                                        className="h-auto w-full object-cover max-h-[300px]"
                                                    />
                                                </div>
                                            )}
                                            {post.error_message && (
                                                <p className="mb-4 text-sm text-red-400">
                                                    ⚠️ {post.error_message}
                                                </p>
                                            )}
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm">
                                                    Preview
                                                </Button>
                                                {/* Action Buttons */}
                                                {(post.status === "draft" || post.status === "failed") && (
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="sm" onClick={() => {
                                                                setSchedulingId(post.id);
                                                                const now = new Date();
                                                                now.setMinutes(now.getMinutes() + 5); // Default to 5 mins from now

                                                                // Format YYYY-MM-DDTHH:mm for the input
                                                                const year = now.getFullYear();
                                                                const month = String(now.getMonth() + 1).padStart(2, '0');
                                                                const day = String(now.getDate()).padStart(2, '0');
                                                                const hours = String(now.getHours()).padStart(2, '0');
                                                                const minutes = String(now.getMinutes()).padStart(2, '0');

                                                                setScheduledTime(`${year}-${month}-${day}T${hours}:${minutes}`);
                                                            }}>
                                                                Schedule
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Schedule Post</DialogTitle>
                                                                <DialogDescription>
                                                                    Pick a date and time to automatically publish this post.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="py-4 space-y-4">
                                                                <div className="space-y-2">
                                                                    <Label>Date & Time</Label>
                                                                    <Input
                                                                        type="datetime-local"
                                                                        value={scheduledTime}
                                                                        onChange={(e) => setScheduledTime(e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <DialogFooter>
                                                                <Button onClick={handleSchedule}>Confirm Schedule</Button>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>
                                                )}

                                                {post.status === "pending" && (
                                                    <Button size="sm" onClick={() => handlePublish(post.id)} disabled={publishingId === post.id}>
                                                        {publishingId === post.id ? "Publishing..." : "Approve & Publish"}
                                                    </Button>
                                                )}
                                                {post.status === "draft" && (
                                                    <Button size="sm" onClick={() => handlePublish(post.id)} disabled={publishingId === post.id}>
                                                        {publishingId === post.id ? "Publishing..." : "Publish Now"}
                                                    </Button>
                                                )}
                                                {(post.status === "approved" || post.status === "generated") && (
                                                    <>
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="outline" size="sm" onClick={() => {
                                                                    setSchedulingId(post.id);
                                                                    const now = new Date();
                                                                    now.setMinutes(now.getMinutes() + 5);
                                                                    const year = now.getFullYear();
                                                                    const month = String(now.getMonth() + 1).padStart(2, '0');
                                                                    const day = String(now.getDate()).padStart(2, '0');
                                                                    const hours = String(now.getHours()).padStart(2, '0');
                                                                    const minutes = String(now.getMinutes()).padStart(2, '0');
                                                                    setScheduledTime(`${year}-${month}-${day}T${hours}:${minutes}`);
                                                                }}>
                                                                    Schedule
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent>
                                                                <DialogHeader>
                                                                    <DialogTitle>Approve & Schedule Post</DialogTitle>
                                                                    <DialogDescription>
                                                                        Pick a date and time to automatically publish this post.
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <div className="py-4 space-y-4">
                                                                    <div className="space-y-2">
                                                                        <Label>Date & Time</Label>
                                                                        <Input
                                                                            type="datetime-local"
                                                                            value={scheduledTime}
                                                                            onChange={(e) => setScheduledTime(e.target.value)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <DialogFooter>
                                                                    <Button onClick={() => {
                                                                        if (schedulingId && scheduledTime) {
                                                                            handleApprove(schedulingId, new Date(scheduledTime).toISOString());
                                                                            setSchedulingId(null);
                                                                            setScheduledTime("");
                                                                        }
                                                                    }}>Approve & Schedule</Button>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                        <Button size="sm" onClick={() => handleApprove(post.id)} disabled={approvingId === post.id}>
                                                            {approvingId === post.id ? "Approving..." : "Approve Now"}
                                                        </Button>
                                                    </>
                                                )}
                                                {post.status === "failed" && (
                                                    <Button size="sm" variant="destructive" onClick={() => handlePublish(post.id)} disabled={publishingId === post.id}>
                                                        {publishingId === post.id ? "Retrying..." : "Retry Publish"}
                                                    </Button>
                                                )}
                                                {post.status === "scheduled" && (
                                                    <div className="text-xs text-muted-foreground self-center">
                                                        Scheduled for: {new Date(post.scheduled_for!).toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
