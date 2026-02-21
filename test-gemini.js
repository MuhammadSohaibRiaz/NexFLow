const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/GEMINI_API_KEY=([^\n]+)/);
const apiKey = keyMatch[1].trim();

async function run() {
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        const data = await res.json();
        const models = data.models ? data.models.map(m => m.name).filter(n => n.includes("flash")) : data;
        console.log("v1 MODELS:", models);
    } catch (e) { console.error(e); }
}
run();
