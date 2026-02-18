import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-black min-h-screen border-l border-zinc-800">
            {/* Header skeleton */}
            <Skeleton className="h-9 w-64 bg-zinc-800" />

            {/* Stats grid skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
                        <Skeleton className="h-4 w-24 mb-3 bg-zinc-800" />
                        <Skeleton className="h-8 w-16 bg-zinc-800" />
                    </div>
                ))}
            </div>

            {/* Content skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
                    <Skeleton className="h-5 w-40 mb-2 bg-zinc-800" />
                    <Skeleton className="h-3 w-64 mb-6 bg-zinc-800" />
                    <Skeleton className="h-[300px] w-full bg-zinc-800/50" />
                </div>
                <div className="col-span-3 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
                    <Skeleton className="h-5 w-40 mb-2 bg-zinc-800" />
                    <Skeleton className="h-3 w-48 mb-6 bg-zinc-800" />
                    <Skeleton className="h-[300px] w-full bg-zinc-800/50" />
                </div>
            </div>
        </div>
    );
}
