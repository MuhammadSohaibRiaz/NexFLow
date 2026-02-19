"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

const TIMEZONES = [
    { value: "Asia/Karachi", label: "Pakistan (PKT)" },
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "Asia/Dubai", label: "Dubai (GST)" },
];

export default function SettingsPage() {
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [timezone, setTimezone] = useState("Asia/Karachi");
    const [brandVoice, setBrandVoice] = useState("");
    const [voiceExamples, setVoiceExamples] = useState<string[]>([]);
    const [isVoiceExpanded, setIsVoiceExpanded] = useState(false);
    const examplesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        examplesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (voiceExamples.length > 0) {
            // Check if we just added a new empty example
            if (voiceExamples[voiceExamples.length - 1] === "") {
                scrollToBottom();
            }
        }
    }, [voiceExamples.length]);

    useEffect(() => {
        const loadUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setFullName(user.user_metadata?.full_name || "");
                setEmail(user.email || "");
                setTimezone(user.user_metadata?.timezone || "Asia/Karachi");
                setBrandVoice(user.user_metadata?.brand_voice || "");
                setVoiceExamples(user.user_metadata?.voice_examples || []);
            }
        };
        loadUser();
    }, []);

    const addExample = () => setVoiceExamples([...voiceExamples, ""]);

    const updateExample = (index: number, value: string) => {
        const newExamples = [...voiceExamples];
        newExamples[index] = value;
        setVoiceExamples(newExamples);
    };

    const removeExample = (index: number) => {
        setVoiceExamples(voiceExamples.filter((_, i) => i !== index));
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            // Filter out empty strings
            const cleanExamples = voiceExamples.filter(e => e.trim().length > 0);

            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: fullName,
                    timezone: timezone,
                    brand_voice: brandVoice,
                    voice_examples: cleanExamples
                },
            });
            if (error) throw error;

            // Update local state to match cleaned
            setVoiceExamples(cleanExamples);
            toast.success("Profile updated successfully");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-3xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account and content preferences
                </p>
            </div>

            <div className="space-y-6">
                {/* Profile Settings */}
                <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>Your account information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                                id="fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Your name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                value={email}
                                disabled
                                className="opacity-50"
                            />
                            <p className="text-xs text-muted-foreground">
                                Email cannot be changed
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Timezone</Label>
                            <Select value={timezone} onValueChange={setTimezone}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIMEZONES.map(({ value, label }) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                All scheduled times will use this timezone
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Brand Voice */}
                <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                        <CardTitle>Brand Voice</CardTitle>
                        <CardDescription>
                            Customize how AI generates content for you
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="brandVoice">Voice Guidelines</Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsVoiceExpanded(!isVoiceExpanded)}
                                        className="h-7 text-xs text-muted-foreground hover:text-white"
                                    >
                                        {isVoiceExpanded ? (
                                            <><ChevronUp className="h-3 w-3 mr-1" /> Collapse</>
                                        ) : (
                                            <><ChevronDown className="h-3 w-3 mr-1" /> Expand</>
                                        )}
                                    </Button>
                                </div>
                                <Textarea
                                    id="brandVoice"
                                    value={brandVoice}
                                    onChange={(e) => setBrandVoice(e.target.value)}
                                    placeholder="e.g., Professional but approachable. Use tech industry language. Focus on actionable tips."
                                    rows={isVoiceExpanded ? 12 : 4}
                                    className="transition-all duration-200 resize-none overflow-y-auto"
                                />
                                <p className="text-xs text-muted-foreground">
                                    General instructions for the AI's tone and style.
                                </p>
                            </div>

                            <Separator className="my-4" />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <Label>Voice Examples (Few-Shot Learning)</Label>
                                        <p className="text-xs text-muted-foreground">
                                            The AI will mimic the structure of these examples.
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={addExample}
                                        className="h-8 border-dashed bg-violet-500/10 border-violet-500/50 hover:bg-violet-500/20 text-violet-300"
                                    >
                                        <Plus className="h-3 w-3 mr-1" /> Add Example
                                    </Button>
                                </div>

                                {voiceExamples.map((example, index) => (
                                    <div key={index} className="relative group animate-in fade-in slide-in-from-top-2 duration-300">
                                        <Textarea
                                            value={example}
                                            onChange={(e) => updateExample(index, e.target.value)}
                                            placeholder={`Example post #${index + 1}...`}
                                            className="pr-10 min-h-[100px] bg-zinc-900/50 border-zinc-800 focus:border-violet-500/50"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeExample(index)}
                                            className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-400/70 hover:text-red-400 hover:bg-red-400/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Remove</span>
                                        </Button>
                                    </div>
                                ))}

                                <div ref={examplesEndRef} />

                                {voiceExamples.length === 0 && (
                                    <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground text-sm border-zinc-800 bg-zinc-900/20">
                                        No examples added yet. Add a few to help the AI learn your style!
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Separator />

                {/* Save Button */}
                <div className="flex justify-end">
                    <Button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
                    >
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </div>

                {/* Danger Zone */}
                <Card className="bg-card/50 border-red-500/20">
                    <CardHeader>
                        <CardTitle className="text-red-400">Danger Zone</CardTitle>
                        <CardDescription>
                            Irreversible actions - proceed with caution
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Delete All Data</p>
                                <p className="text-sm text-muted-foreground">
                                    Remove all pipelines, posts, and platform connections
                                </p>
                            </div>
                            <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                                Delete Data
                            </Button>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Delete Account</p>
                                <p className="text-sm text-muted-foreground">
                                    Permanently delete your account and all associated data
                                </p>
                            </div>
                            <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                                Delete Account
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
