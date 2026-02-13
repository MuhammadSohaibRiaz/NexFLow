import { getPipelines } from "@/lib/api/db";
import { PipelinesView } from "./pipelines-view";

export const dynamic = "force-dynamic";

export default async function PipelinesPage() {
    const pipelines = await getPipelines();

    return <PipelinesView initialPipelines={pipelines} />;
}
