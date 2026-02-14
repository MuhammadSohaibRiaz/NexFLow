"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FREQUENCIES, REMINDER_OPTIONS, PLATFORMS } from "@/lib/constants";
import type { Platform, Frequency } from "@/lib/types";
import { useEffect } from "react";

export default function NewPipelinePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [frequency, setFrequency] = useState<Frequency>("weekly");
    const [postTime, setPostTime] = useState("18:00");
    const [reviewRequired, setReviewRequired] = useState(true);
    const [reminderMinutes, setReminderMinutes] = useState(60);
    const [connectedPlatforms, setConnectedPlatforms] = useState<Platform[]>([]);

    useEffect(() => {
        // Fetch connected platforms on mount
        async function fetchConnections() {
            try {
                const { getPlatformConnections } = await import("@/lib/api/db");
                const connections = await getPlatformConnections();
                const connected = connections
                    .filter(c => c.is_active)
                    .map(c => c.platform);
                setConnectedPlatforms(connected);
            } catch (e) {
                console.error("Failed to fetch connections:", e);
            }
        }
        fetchConnections();
    }, []);

    const togglePlatform = (platform: Platform) => {
        setPlatforms((prev) =>
            prev.includes(platform)
                ? prev.filter((p) => p !== platform)
                : [...prev, platform]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { createPipeline } = await import("@/lib/api/db");

            // Calculate initial next_run_at
            const now = new Date();
            const [hours, minutes] = postTime.split(":").map(Number);
            const nextRun = new Date();
            nextRun.setHours(hours, minutes, 0, 0);

            // If time already passed today, start tomorrow
            if (nextRun < now) {
                nextRun.setDate(nextRun.getDate() + 1);
            }

            await createPipeline({
                name,
                description,
                platforms,
                frequency,
                post_time: postTime,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                review_required: reviewRequired,
                reminder_minutes: reminderMinutes,
                is_active: true,
                next_run_at: nextRun.toISOString()
            });

            toast.success("Pipeline created successfully!");
            router.push("/dashboard/pipelines");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create pipeline");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-3xl">
            {/* Header */}
            <div className="mb-8">
                <Link href="/dashboard/pipelines" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">
                    ← Back to Pipelines
                </Link>
                <h1 className="text-3xl font-bold mb-2">Create New Pipeline</h1>
                <p className="text-muted-foreground">
                    Set up a topic queue with your preferred schedule and platforms
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                        <CardDescription>Name and describe your content pipeline</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Pipeline Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g., DevOps Weekly Tips"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description (optional)</Label>
                            <Textarea
                                id="description"
                                placeholder="What kind of content will this pipeline generate?"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Platform Selection */}
                <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                        <CardTitle>Platforms</CardTitle>
                        <CardDescription>Select which platforms to publish to</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                            {(Object.entries(PLATFORMS) as [Platform, typeof PLATFORMS[Platform]][]).map(([key, platform]) => {
                                const isConnected = connectedPlatforms.includes(key);
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => isConnected && togglePlatform(key)}
                                        disabled={!isConnected}
                                        className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${!isConnected
                                                ? "border-border/30 opacity-50 cursor-not-allowed"
                                                : platforms.includes(key)
                                                    ? "border-violet-500 bg-violet-500/10"
                                                    : "border-border/50 hover:border-border"
                                            }`}
                                    >
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                                            style={{ backgroundColor: `${platform.color}20` }}
                                        >
                                            <span style={{ color: platform.color }} className="font-bold text-sm">
                                                {platform.label[0]}
                                            </span>
                                        </div>
                                        <div className="text-left">
                                            <p className="font-medium">{platform.label}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {!isConnected
                                                    ? "Not Connected"
                                                    : platforms.includes(key)
                                                        ? "Selected ✓"
                                                        : "Click to select"}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Schedule */}
                <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                        <CardTitle>Schedule</CardTitle>
                        <CardDescription>When should posts be published?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Frequency</Label>
                                <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(FREQUENCIES).map(([key, { label }]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="postTime">Post Time (PKT)</Label>
                                <Input
                                    id="postTime"
                                    type="time"
                                    value={postTime}
                                    onChange={(e) => setPostTime(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Set specific time (e.g., for testing: choose 2-3 mins from now)
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Review Settings */}
                <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                        <CardTitle>Review Settings</CardTitle>
                        <CardDescription>Control how content is reviewed before publishing</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Require Review</Label>
                                <p className="text-sm text-muted-foreground">
                                    Pause before publishing for your approval
                                </p>
                            </div>
                            <Switch
                                checked={reviewRequired}
                                onCheckedChange={setReviewRequired}
                            />
                        </div>

                        {reviewRequired && (
                            <div className="space-y-2">
                                <Label>Reminder Before Post</Label>
                                <Select
                                    value={reminderMinutes.toString()}
                                    onValueChange={(v) => setReminderMinutes(parseInt(v))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {REMINDER_OPTIONS.map(({ value, label }) => (
                                            <SelectItem key={value} value={value.toString()}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    If no response, the post will auto-proceed
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-4">
                    <Link href="/dashboard/pipelines" className="flex-1">
                        <Button type="button" variant="outline" className="w-full">
                            Cancel
                        </Button>
                    </Link>
                    <Button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
                        disabled={loading || platforms.length === 0 || !name}
                    >
                        {loading ? "Creating..." : "Create Pipeline"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
