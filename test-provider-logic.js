const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

// Since the file is TS and uses ESM imports, we'll just mock the logic here to verify our understanding
const AI_PROVIDER = process.env.AI_PROVIDER || "gemini";
const GROQ_KEY = process.env.GROQ_API_KEY ? "PRESENT" : "MISSING";
const GEMINI_KEY = process.env.GEMINI_API_KEY ? "PRESENT" : "MISSING";

console.log('--- Provider Logic Test ---');
console.log('AI_PROVIDER Env:', AI_PROVIDER);
console.log('GROQ_API_KEY:', GROQ_KEY);
console.log('GEMINI_API_KEY:', GEMINI_KEY);

function getMockProvider() {
    if (AI_PROVIDER === "groq") return "GroqProvider";
    if (AI_PROVIDER === "anthropic") return "AnthropicProvider";
    return "GeminiProvider";
}

console.log('Active Provider:', getMockProvider());
