"use client";

import { useDashboardPipelines } from "@/lib/hooks/use-dashboard-data";
import { PipelinesView } from "./pipelines-view";
import DashboardLoading from "../loading";

export default function PipelinesPage() {
    const { pipelines, isLoading, isValidating } = useDashboardPipelines();

    // Show loading if we have no data yet OR if we have empty data but are still validating
    if (isLoading || !pipelines || (pipelines.length === 0 && isValidating)) {
        return <DashboardLoading />;
    }

    return <PipelinesView initialPipelines={pipelines} />;
}
