"use client";

import { useState } from "react";
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    eachDayOfInterval,
    parseISO
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Post } from "@/lib/types";

interface CalendarViewProps {
    initialPosts: Post[];
}

const PLATFORM_COLORS: Record<string, string> = {
    twitter: "bg-sky-500",
    linkedin: "bg-blue-600",
    facebook: "bg-indigo-600",
    instagram: "bg-pink-600"
};

export default function CalendarView({ initialPosts }: CalendarViewProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold text-white">
                        {format(currentMonth, "MMMM yyyy")}
                    </h2>
                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={prevMonth}
                            className="h-8 w-8 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={nextMonth}
                            className="h-8 w-8 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentMonth(new Date())}
                        className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400"
                    >
                        Today
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400"
                    >
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                    </Button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        return (
            <div className="grid grid-cols-7 mb-2 border-b border-zinc-800">
                {days.map((day) => (
                    <div key={day} className="py-2 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = startDate;

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const cloneDay = day;
                const datePosts = initialPosts.filter(post => {
                    const postDate = post.scheduled_for ? parseISO(post.scheduled_for) : parseISO(post.created_at);
                    return isSameDay(postDate, cloneDay);
                });

                days.push(
                    <div
                        key={day.toString()}
                        className={`min-h-[120px] border border-zinc-800 p-2 transition-colors hover:bg-zinc-900/30
                            ${!isSameMonth(day, monthStart) ? "bg-zinc-950/50 text-zinc-700" : "text-zinc-300"}
                            ${isSameDay(day, new Date()) ? "bg-violet-950/10 border-violet-900/50" : ""}
                        `}
                        onClick={() => setSelectedDate(cloneDay)}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-sm font-medium ${isSameDay(day, new Date()) ? "bg-violet-600 text-white w-6 h-6 flex items-center justify-center rounded-full" : ""}`}>
                                {format(day, "d")}
                            </span>
                        </div>
                        <div className="space-y-1">
                            {datePosts.slice(0, 3).map((post) => (
                                <div
                                    key={post.id}
                                    className={`text-[10px] px-1.5 py-0.5 rounded truncate flex items-center gap-1 border border-white/5
                                        ${PLATFORM_COLORS[post.platform] || "bg-zinc-700"} text-white font-medium shadow-sm
                                    `}
                                    title={post.content}
                                >
                                    <span className="w-1 h-1 rounded-full bg-white opacity-60" />
                                    {post.topics?.title || "Post"}
                                </div>
                            ))}
                            {datePosts.length > 3 && (
                                <div className="text-[10px] text-zinc-500 pl-1 font-medium">
                                    + {datePosts.length - 3} more
                                </div>
                            )}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }

        return <div className="border border-zinc-800 rounded-lg overflow-hidden">{rows}</div>;
    };

    return (
        <Card className="bg-zinc-950 border-zinc-800 shadow-2xl">
            <CardContent className="p-6">
                {renderHeader()}
                {renderDays()}
                {renderCells()}
            </CardContent>
        </Card>
    );
}
