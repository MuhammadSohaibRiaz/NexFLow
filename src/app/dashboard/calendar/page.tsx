import { Suspense } from "react";
import { getPosts } from "@/lib/api/db";
import CalendarView from "./calendar-view";

export default async function CalendarPage() {
    // Fetch all posts to show on the calendar (scheduled and published)
    const posts = await getPosts();

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 bg-black min-h-screen border-l border-zinc-800">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-blue-500">
                    Content Calendar
                </h2>
            </div>

            <Suspense fallback={<div className="text-zinc-500">Loading Calendar...</div>}>
                <CalendarView initialPosts={posts} />
            </Suspense>
        </div>
    );
}
