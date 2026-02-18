"use client";

import { useDashboardPipelines } from "@/lib/hooks/use-dashboard-data";
import { PipelinesView } from "./pipelines-view";
import DashboardLoading from "../loading";

export default function PipelinesPage() {
    const { pipelines, isLoading } = useDashboardPipelines();

    if (isLoading || !pipelines) {
        return <DashboardLoading />;
    }

    return <PipelinesView initialPipelines={pipelines} />;
}
