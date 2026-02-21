const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/GEMINI_API_KEY=([^\n]+)/);
const apiKey = keyMatch[1].trim();

const modelsToTest = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest'
];

async function run() {
    for (const model of modelsToTest) {
        console.log(`\nTesting ${model}...`);
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Hello" }] }],
                    generationConfig: { maxOutputTokens: 5 }
                })
            });
            const data = await res.json();
            if (res.ok) {
                console.log(`✅ SUCCESS with ${model}:`, data.candidates?.[0]?.content?.parts?.[0]?.text || "No text");
                break; // Found a working one!
            } else {
                console.log(`❌ ERROR ${res.status}:`, data.error?.message || "Unknown error");
            }
        } catch (e) {
            console.error(`💥 Network exception for ${model}:`, e.message);
        }
    }
}
run();
