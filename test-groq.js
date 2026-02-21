const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/GROQ_API_KEY=([^\n]+)/);
const apiKey = keyMatch[1].trim();

async function run() {
    console.log("Testing Groq API...");
    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content: "Output strict JSON with 'message' field."
                    },
                    {
                        role: "user",
                        content: "Say hello!"
                    }
                ],
            }),
        });
        const data = await res.json();
        if (res.ok) {
            console.log("✅ SUCCESS:", data.choices?.[0]?.message?.content);
        } else {
            console.log("❌ ERROR:", data);
        }
    } catch (e) {
        console.error("💥 Exception:", e.message);
    }
}
run();
