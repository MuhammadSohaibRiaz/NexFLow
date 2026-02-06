"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PLATFORMS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Platform, PlatformConnection } from "@/lib/types";

export default function PlatformsPage() {
    const searchParams = useSearchParams();
    const [connections, setConnections] = useState<PlatformConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState<Platform | null>(null);

    // Check for OAuth result in URL params
    useEffect(() => {
        const connected = searchParams.get("connected") as Platform;
        const error = searchParams.get("error");

        if (connected) {
            toast.success(`Successfully connected to ${PLATFORMS[connected]?.label || connected}!`);
            // Clean up URL
            window.history.replaceState({}, "", "/dashboard/platforms");
        } else if (error) {
            toast.error(`Connection failed: ${error.replace(/_/g, " ")}`);
            window.history.replaceState({}, "", "/dashboard/platforms");
        }
    }, [searchParams]);

    // Fetch existing connections
    useEffect(() => {
        const fetchConnections = async () => {
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from("platform_connections")
                    .select("*")
                    .order("platform");

                if (error) throw error;
                setConnections(data || []);
            } catch (err) {
                console.error("Failed to fetch connections:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchConnections();
    }, [searchParams]); // Refetch after OAuth redirect

    const handleConnect = (platform: Platform) => {
        setConnecting(platform);
        // Redirect to OAuth initiation endpoint
        window.location.href = `/api/auth/connect?platform=${platform}`;
    };

    const handleDisconnect = async (platform: Platform) => {
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("platform_connections")
                .delete()
                .eq("platform", platform);

            if (error) throw error;

            setConnections((prev) => prev.filter((c) => c.platform !== platform));
            toast.success(`Disconnected from ${PLATFORMS[platform].label}`);
        } catch (err) {
            toast.error("Failed to disconnect");
            console.error(err);
        }
    };

    const getConnection = (platform: Platform) =>
        connections.find((c) => c.platform === platform);

    const connectedCount = connections.filter((c) => c.is_active).length;

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Connected Platforms</h1>
                <p className="text-muted-foreground">
                    Link your social media accounts to enable automated publishing
                </p>
            </div>

            {/* Stats */}
            <Card className="bg-gradient-to-br from-violet-950/20 to-blue-950/20 border-violet-500/20 mb-8">
                <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Connected Platforms</p>
                            <p className="text-3xl font-bold">{connectedCount} / 4</p>
                        </div>
                        <div className="text-right">
                            <Badge variant={connectedCount > 0 ? "default" : "secondary"}>
                                {connectedCount > 0 ? "Ready to publish" : "Connect platforms to start"}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Platform Cards */}
            <div className="grid md:grid-cols-2 gap-6">
                {(Object.keys(PLATFORMS) as Platform[]).map((platformKey) => {
                    const platform = PLATFORMS[platformKey];
                    const connection = getConnection(platformKey);
                    const isConnected = connection?.is_active ?? false;
                    const isConnecting = connecting === platformKey;

                    return (
                        <Card
                            key={platformKey}
                            className={`bg-card/50 border-border/50 transition-colors ${isConnected ? "border-emerald-500/30" : ""
                                }`}
                        >
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                                            style={{ backgroundColor: `${platform.color}20` }}
                                        >
                                            <span style={{ color: platform.color }} className="font-bold text-xl">
                                                {platform.label[0]}
                                            </span>
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{platform.label}</CardTitle>
                                            <CardDescription>
                                                {isConnected
                                                    ? `Connected as ${connection?.account_name || "Unknown"}`
                                                    : "Not connected"}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge
                                        variant={isConnected ? "default" : "secondary"}
                                        className={isConnected ? "bg-emerald-500/20 text-emerald-400" : ""}
                                    >
                                        {isConnected ? "Connected" : "Disconnected"}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col gap-3">
                                    {/* Platform features */}
                                    <div className="text-sm text-muted-foreground">
                                        {platformKey === "facebook" && (
                                            <p>Post to pages and personal timeline via Graph API</p>
                                        )}
                                        {platformKey === "linkedin" && (
                                            <p>Share professional updates and articles</p>
                                        )}
                                        {platformKey === "twitter" && (
                                            <p>Tweet threads and media (280 char limit)</p>
                                        )}
                                        {platformKey === "instagram" && (
                                            <p>Share photos and carousels via Business API</p>
                                        )}
                                    </div>

                                    {/* Action Button */}
                                    {isConnected ? (
                                        <Button
                                            variant="outline"
                                            onClick={() => handleDisconnect(platformKey)}
                                            className="w-full"
                                        >
                                            Disconnect
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => handleConnect(platformKey)}
                                            disabled={isConnecting || loading}
                                            className="w-full"
                                            style={{
                                                background: `linear-gradient(135deg, ${platform.color}, ${platform.color}CC)`,
                                            }}
                                        >
                                            {isConnecting ? "Connecting..." : `Connect ${platform.label}`}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* OAuth Info */}
            <Card className="mt-8 bg-card/50 border-border/50">
                <CardHeader>
                    <CardTitle className="text-lg">🔐 About OAuth Connection</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>
                        When you connect a platform, you&apos;ll be redirected to that platform&apos;s
                        login page to authorize NexFlow. We only request the minimum permissions
                        needed to publish posts on your behalf.
                    </p>
                    <p>
                        Your access tokens are encrypted and stored securely. You can disconnect
                        at any time, and we&apos;ll immediately revoke access.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
