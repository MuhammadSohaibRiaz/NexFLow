import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Manually parse .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};
envContent.split("\n").forEach(line => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join("=").trim();
    }
});

const supabaseUrl = envVars["NEXT_PUBLIC_SUPABASE_URL"]!;
const supabaseKey = envVars["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!;

const supabase = createClient(supabaseUrl, supabaseKey);

const PIPELINE_ID = "8db1cc93-8514-424f-826c-a6d4ffdda7e8";

async function debugPipeline() {
    console.log(`Checking pipeline: ${PIPELINE_ID}`);

    // 1. Check Pipeline Exists
    const { data: pipeline, error: pError } = await supabase
        .from("pipelines")
        .select("*")
        .eq("id", PIPELINE_ID)
        .single();

    if (pError) {
        console.error("Pipeline Error:", pError);
        return;
    }
    console.log("Pipeline Found:", pipeline.name);
    console.log("Next Run At:", pipeline.next_run_at);

    // 2. Check Topics
    const { data: topics, error: tError } = await supabase
        .from("topics")
        .select("*")
        .eq("pipeline_id", PIPELINE_ID);

    if (tError) {
        console.error("Topics Error:", tError);
        return;
    }

    console.log(`Found ${topics.length} topics for this pipeline:`);
    topics.forEach(t => {
        console.log(`- [${t.status}] ${t.title} (ID: ${t.id})`);
    });

    if (topics.length === 0) {
        console.log("⚠️ WRONG PIPELINE? User might have added topics to a different pipeline.");
    }
}

debugPipeline();
