import { getPipeline, getTopics } from "@/lib/api/db";
import { TopicsView } from "./topics-view";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface TopicsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TopicsPage({ searchParams }: TopicsPageProps) {
    const params = await searchParams;
    const pipelineId = params.pipelineId as string;

    if (!pipelineId) {
        redirect("/dashboard/pipelines");
    }

    try {
        const [pipeline, topics] = await Promise.all([
            getPipeline(pipelineId),
            getTopics(pipelineId)
        ]);

        if (!pipeline) {
            return <div className="p-8 text-center text-white">Pipeline not found</div>;
        }

        return <TopicsView pipeline={pipeline} initialTopics={topics} />;
    } catch (error) {
        console.error("Error loading topics:", error);
        return <div className="p-8 text-center text-white">Error loading topics</div>;
    }
}
