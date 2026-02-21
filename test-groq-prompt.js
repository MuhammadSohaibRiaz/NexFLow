const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/GROQ_API_KEY=([^\n]+)/);
const apiKey = keyMatch[1].trim();

const prompt = `You are a social media content expert. Generate a high-quality linkedin post about the following topic.
    
    CRITICAL: Ensure your post is COMPLETE. Do not cut off mid-sentence. Finish every thought and sentence before closing the JSON.

TOPIC: "Exciting news for solo founders launching a new product"

PLATFORM GUIDELINES:
- Use a professional, thought-leadership tone. Write in short paragraphs.
- Maximum 3000 characters for the post content
- Include up to 5 relevant hashtags

RESPOND IN THIS EXACT JSON FORMAT:
{
  "content": "The full post text here. Finish your thoughts.",
  "hashtags": ["hashtag1", "hashtag2"],
  "imagePrompt": "A descriptive prompt for an image generator (Stable Diffusion). Describe colors, lighting, and a clear scene related to the topic. If not obvious, describe an abstract professional scene with branding colors. MANDATORY: This field must never be empty."
}
IMPORTANT: Output ONLY the raw JSON object. Do not include any intro, outro, or markdown formatting outside the JSON block.`;

async function run() {
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
                        content: "You are an expert social media manager. You must always output syntactically correct JSON."
                    },
                    { 
                        role: "user", 
                        content: prompt 
                    }
                ],
            }),
        });
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        console.log("Raw Output:\n", text);
        const parsed = JSON.parse(text);
        console.log("\nParsed Object keys:", Object.keys(parsed));
    } catch(e) {
        console.error(e);
    }
}
run();
