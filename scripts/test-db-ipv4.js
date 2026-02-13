const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const dns = require("dns");

// Force IPv4
dns.setDefaultResultOrder("ipv4first");
console.log("Forcing IPv4 DNS resolution...");

// Manually parse .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach(line => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join("=").trim();
    }
});

const supabaseUrl = envVars["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseKey = envVars["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

console.log("Testing connection to:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        console.log("Fetching pipelines...");
        const start = Date.now();
        const { data, error } = await supabase.from("pipelines").select("count").limit(1);
        const end = Date.now();
        console.log(`Duration: ${end - start}ms`);

        if (error) {
            console.error("Supabase Error:", error);
        } else {
            console.log("Success! Data:", data);
        }
    } catch (err) {
        console.error("Connection Error:", err);
    }
}

testConnection();
