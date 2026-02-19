"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";

// Navigation items
const navItems = [
    { href: "/dashboard", label: "Overview", icon: "📊" },
    { href: "/dashboard/analytics", label: "Analytics", icon: "📈" },
    { href: "/dashboard/calendar", label: "Calendar", icon: "📅" },
    { href: "/dashboard/pipelines", label: "Pipelines", icon: "📋" },
    { href: "/dashboard/posts", label: "Posts", icon: "📝" },
    { href: "/dashboard/platforms", label: "Platforms", icon: "🔗" },
    { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();

        // 1. Initial user check
        const initUser = async () => {
            try {
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                if (currentUser) {
                    setUser(currentUser);
                } else {
                    router.push("/login");
                }
            } catch (err) {
                console.error("Auth init error:", err);
                router.push("/login");
            } finally {
                setLoading(false);
            }
        };

        initUser();

        // 2. Auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                    setUser(session.user);
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                router.push("/login");
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        toast.success("Logged out successfully");
        router.push("/");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex">
                <div className="w-64 border-r border-border/50 p-4">
                    <Skeleton className="h-10 w-32 mb-8" />
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                </div>
                <div className="flex-1 p-8">
                    <Skeleton className="h-8 w-48 mb-4" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    const userInitials = user?.user_metadata?.full_name
        ?.split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase() || user?.email?.[0].toUpperCase() || "U";

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border/50 flex flex-col">
                {/* Logo */}
                <div className="p-4 border-b border-border/50">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">N</span>
                        </div>
                        <span className="font-semibold text-lg">NexFlow</span>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4">
                    <ul className="space-y-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== "/dashboard" && pathname.startsWith(item.href));
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                                            ? "bg-violet-500/10 text-violet-400 font-medium"
                                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                            }`}
                                    >
                                        <span className="text-lg">{item.icon}</span>
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* User Menu */}
                <div className="p-4 border-t border-border/50">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start gap-2 px-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-violet-500/20 text-violet-400 text-sm">
                                        {userInitials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-medium truncate">
                                        {user?.user_metadata?.full_name || "User"}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {user?.email}
                                    </p>
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem asChild>
                                <Link href="/dashboard/settings">Settings</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-red-400">
                                Log out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 px-3 mt-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
