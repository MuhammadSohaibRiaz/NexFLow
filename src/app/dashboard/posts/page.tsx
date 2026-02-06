"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

// Will be replaced with real data
const mockPosts: Array<{
    id: string;
    topic: string;
    platform: string;
    status: string;
    scheduledFor?: string;
    createdAt: string;
}> = [];

const statusColors: Record<string, string> = {
    draft: "bg-yellow-500/20 text-yellow-400",
    pending: "bg-blue-500/20 text-blue-400",
    scheduled: "bg-violet-500/20 text-violet-400",
    published: "bg-emerald-500/20 text-emerald-400",
    failed: "bg-red-500/20 text-red-400",
};

export default function PostsPage() {
    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Posts</h1>
                <p className="text-muted-foreground">
                    View and manage all generated and scheduled posts
                </p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="all" className="space-y-6">
                <TabsList className="bg-card/50">
                    <TabsTrigger value="all">All Posts</TabsTrigger>
                    <TabsTrigger value="pending">Pending Review</TabsTrigger>
                    <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                    <TabsTrigger value="published">Published</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                    {mockPosts.length === 0 ? (
                        <Card className="bg-gradient-to-br from-violet-950/20 to-blue-950/20 border-violet-500/20">
                            <CardContent className="py-16 text-center">
                                <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-6">
                                    <span className="text-3xl">📝</span>
                                </div>
                                <h2 className="text-xl font-semibold mb-2">No posts yet</h2>
                                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                    Posts will appear here once you add topics to a pipeline.
                                    AI will generate content that's ready for your review.
                                </p>
                                <Link href="/dashboard/pipelines">
                                    <Button className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700">
                                        Go to Pipelines
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {mockPosts.map((post) => (
                                <Card key={post.id} className="bg-card/50 border-border/50">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-lg">{post.topic}</CardTitle>
                                                <CardDescription className="mt-1">
                                                    {post.platform} • Created {post.createdAt}
                                                </CardDescription>
                                            </div>
                                            <Badge className={statusColors[post.status] || ""}>
                                                {post.status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm">
                                                Preview
                                            </Button>
                                            {post.status === "pending" && (
                                                <>
                                                    <Button variant="outline" size="sm">
                                                        Edit
                                                    </Button>
                                                    <Button size="sm">Approve</Button>
                                                </>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="pending">
                    <Card className="bg-card/50 border-border/50">
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <p>No posts pending review</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="scheduled">
                    <Card className="bg-card/50 border-border/50">
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <p>No scheduled posts</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="published">
                    <Card className="bg-card/50 border-border/50">
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <p>No published posts yet</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
