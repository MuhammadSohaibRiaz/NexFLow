"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LinkedInPage {
    organizationalTarget: string; // urn:li:organization:1234
    role: string;
    state: string;
}

interface SelectionData {
    profileName: string;
    pages: LinkedInPage[];
}

export default function LinkedInSelectPage() {
    const router = useRouter();
    const [data, setData] = useState<SelectionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        // Fetch the selection data from our internal API (which reads the cookie)
        // Since we can't read httpOnly cookies client-side, we need a server action or API route.
        // For simplicity, we'll fetch from a new API endpoint we're about to create.
        fetch("/api/auth/linkedin/selection-data")
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    toast.error("Session expired. Please try connecting again.");
                    router.push("/dashboard/platforms");
                    return;
                }
                setData(data);
            })
            .catch(() => {
                toast.error("Failed to load selection data");
                router.push("/dashboard/platforms");
            })
            .finally(() => setLoading(false));
    }, [router]);

    const handleSelect = async (targetUrn: string, name: string) => {
        setSaving(targetUrn);
        try {
            const res = await fetch("/api/auth/linkedin/confirm-selection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ selectedUrn: targetUrn, name })
            });

            if (!res.ok) throw new Error("Failed to save selection");

            toast.success(`Connected to ${name}`);
            router.push("/dashboard/platforms?connected=linkedin");
        } catch (error) {
            toast.error("Failed to save connection");
            setSaving(null);
        }
    };

    if (loading) return <div className="p-8 text-white">Loading...</div>;
    if (!data) return null;

    return (
        <div className="min-h-screen bg-black text-white p-8 flex items-center justify-center">
            <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle>Select LinkedIn Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-zinc-400">
                        We found multiple accounts you manage. Which one would you like to connect?
                    </p>

                    {/* Personal Profile Option */}
                    <div className="border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-white">{data.profileName}</h3>
                                <p className="text-xs text-zinc-500">Personal Profile</p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSelect("profile", data.profileName)}
                                disabled={!!saving}
                            >
                                {saving === "profile" ? "Connecting..." : "Connect"}
                            </Button>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-zinc-900 px-2 text-zinc-500">Or Company Pages</span>
                        </div>
                    </div>

                    {/* Company Pages */}
                    <div className="space-y-2">
                        {data.pages.map((page) => {
                            // Extract ID from URN: urn:li:organization:1234
                            const orgId = page.organizationalTarget.split(":").pop();

                            return (
                                <div key={page.organizationalTarget} className="border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800/50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            {/* We don't have the page Name here from ACL, usually need another fetch. 
                                                For MVP, we show the ID or generic "Company Page". 
                                                To do it right, we'd batch fetch names. 
                                                Let's stick to "Company Page (ID: ...)" for MVP to avoid complexity. */}
                                            <h3 className="font-medium text-white">Company Page</h3>
                                            <p className="text-xs text-zinc-500">ID: {orgId}</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleSelect(page.organizationalTarget, `Page ${orgId}`)}
                                            disabled={!!saving}
                                        >
                                            {saving === page.organizationalTarget ? "Connecting..." : "Connect"}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
