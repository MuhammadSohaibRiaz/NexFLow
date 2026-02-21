/**
 * AI Provider Abstraction Layer
 * 
 * Supports multiple AI providers with a unified interface.
 * Switch between providers via AI_PROVIDER env variable.
 * 
 * Development: Gemini (free tier)
 * Production: Anthropic Claude (paid - better quality)
 */

import type { Platform } from "@/lib/types";
import { PLATFORM_LIMITS } from "@/lib/constants";

// ===========================================
// TYPES
// ===========================================

export type AIProvider = "gemini" | "anthropic";

export interface GenerationRequest {
    topic: string;
    notes?: string;
    platform: Platform;
    brandVoice?: string;
    voiceExamples?: string[];
}

export interface GeneratedContent {
    content: string;
    hashtags: string[];
    imagePrompt?: string;
}

export interface AIProviderConfig {
    provider: AIProvider;
    apiKey: string;
}

// ===========================================
// SHARED PARSER (used by all providers)
// ===========================================

function parseAIResponse(text: string): GeneratedContent {
    const raw = text.trim();

    // Step 1: Strip markdown code blocks
    let cleaned = raw;
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
        cleaned = codeBlockMatch[1].trim();
    }

    // Step 2: Try direct JSON parse
    try {
        const parsed = JSON.parse(cleaned);
        if (parsed.content && typeof parsed.content === "string") {
            return extractFields(parsed);
        }
    } catch (e) {
        console.warn("[AI Parser] Direct JSON parse failed, trying brace matching...", e);
    }

    // Step 3: Find JSON object via balanced brace matching
    const jsonStart = cleaned.indexOf("{");
    if (jsonStart !== -1) {
        let braceCount = 0;
        let jsonEnd = -1;
        for (let i = jsonStart; i < cleaned.length; i++) {
            if (cleaned[i] === "{") braceCount++;
            if (cleaned[i] === "}") braceCount--;
            if (braceCount === 0) { jsonEnd = i + 1; break; }
        }
        if (jsonEnd !== -1) {
            try {
                const parsed = JSON.parse(cleaned.substring(jsonStart, jsonEnd));
                if (parsed.content && typeof parsed.content === "string") {
                    return extractFields(parsed);
                }
            } catch (e) {
                console.warn("[AI Parser] Brace matching JSON parse failed", e);
            }
        }
    }

    // Step 4: Regex extraction of the "content" field value
    // This regex looks for "content": "..." and captures everything inside the quotes, even across multiple lines.
    const contentMatch = raw.match(/"content"\s*:\s*"([\s\S]*?)"(?=\s*[,}\s])/);
    if (contentMatch) {
        let content = contentMatch[1]
            .replace(/\\n/g, "\n")
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\");

        // Try to find hashtags similarly
        const hashtagMatch = raw.match(/"hashtags"\s*:\s*\[([\s\S]*?)\]/);
        let hashtags: string[] = [];
        if (hashtagMatch) {
            hashtags = hashtagMatch[1]
                .match(/"([^"]+)"/g)
                ?.map(h => h.replace(/"/g, "")) || [];
        }

        return { content, hashtags, imagePrompt: undefined };
    }

    // Step 5: Try to fix truncated JSON (missing closing brace)
    if (cleaned.startsWith("{") && !cleaned.endsWith("}")) {
        try {
            const fixed = cleaned + "}";
            const parsed = JSON.parse(fixed);
            return extractFields(parsed);
        } catch { }
    }

    // Step 6: Absolute last resort — strip any JSON artifacts and return plain text
    console.warn("[AI Parser] All JSON parsing failed. Performing surgical extraction.");
    // ... rest of the surgical logic ...

    // If it looks like a JSON object, try to just take everything between the first "content" quote and its end
    const lastDitchContent = raw.match(/"content"\s*:\s*"([\s\S]*)/i);
    let plainText = "";

    if (lastDitchContent) {
        plainText = lastDitchContent[1]
            .replace(/",\s*"hashtags"[\s\S]*$/i, "") // Strip everything after content ends
            .replace(/"\s*}\s*$/g, "")              // Strip trailing brace
            .replace(/\\n/g, "\n")
            .replace(/\\"/g, '"')
            .trim();
    }

    if (!plainText) {
        plainText = raw
            .replace(/```json\s*/g, "")
            .replace(/```/g, "")
            .replace(/^[^{]*{\s*/, "") // Remove everything before the first brace
            .replace(/"content"\s*:\s*/gi, "")
            .replace(/"hashtags"\s*:\s*/gi, "")
            .replace(/"imagePrompt"\s*:\s*/gi, "")
            .replace(/[{}[\]]/g, "")
            .replace(/"/g, "")
            .trim();
    }

    return {
        content: plainText.substring(0, 2000), // Increased limit for sanity
        hashtags: [],
        imagePrompt: undefined
    };
}

function extractFields(parsed: any): GeneratedContent {
    // Ensure content is clean string, not nested object
    let content = parsed.content;
    if (typeof content !== "string") {
        content = JSON.stringify(content);
    }
    // Unescape any literal \n in the content
    content = content.replace(/\\n/g, "\n");

    // Ensure hashtags are clean strings without # prefix duplication
    let hashtags: string[] = [];
    if (Array.isArray(parsed.hashtags)) {
        hashtags = parsed.hashtags
            .map((h: any) => String(h).replace(/^#/, ""))
            .filter((h: string) => h.length > 0);
    }

    return {
        content,
        hashtags,
        imagePrompt: typeof parsed.imagePrompt === "string" ? parsed.imagePrompt : undefined,
    };
}

// ===========================================
// PROVIDER INTERFACE
// ===========================================

interface AIProviderInterface {
    generateContent(request: GenerationRequest): Promise<GeneratedContent>;
}

// ===========================================
// GEMINI PROVIDER (Free tier)
// ===========================================

class GeminiProvider implements AIProviderInterface {
    private apiKey: string;
    private baseUrl = "https://generativelanguage.googleapis.com/v1";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async generateContent(request: GenerationRequest): Promise<GeneratedContent> {
        const { topic, notes, platform, brandVoice, voiceExamples } = request;
        const charLimit = PLATFORM_LIMITS[platform].text;
        const hashtagLimit = PLATFORM_LIMITS[platform].hashtags;

        const prompt = buildPrompt(topic, notes, platform, brandVoice, voiceExamples, charLimit, hashtagLimit);

        const response = await fetch(
            `${this.baseUrl}/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 4096,
                    },
                }),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Gemini API error: ${error}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            console.error("[Gemini] Empty response candidates:", JSON.stringify(data, null, 2));
            throw new Error("No content generated");
        }

        console.log("[Gemini] Raw AI Response:", text);
        return parseAIResponse(text);
    }
}

// ===========================================
// ANTHROPIC PROVIDER (Paid, higher quality)
// ===========================================

class AnthropicProvider implements AIProviderInterface {
    private apiKey: string;
    private baseUrl = "https://api.anthropic.com/v1";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async generateContent(request: GenerationRequest): Promise<GeneratedContent> {
        const { topic, notes, platform, brandVoice, voiceExamples } = request;
        const charLimit = PLATFORM_LIMITS[platform].text;
        const hashtagLimit = PLATFORM_LIMITS[platform].hashtags;

        const prompt = buildPrompt(topic, notes, platform, brandVoice, voiceExamples, charLimit, hashtagLimit);

        const response = await fetch(`${this.baseUrl}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": this.apiKey,
                "anthropic-version": "2024-01-01",
            },
            body: JSON.stringify({
                model: "claude-3-5-sonnet-20240620",
                max_tokens: 2048,
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Anthropic API error: ${error}`);
        }

        const data = await response.json();
        const text = data.content?.[0]?.text;

        if (!text) {
            throw new Error("No content generated");
        }

        return parseAIResponse(text);
    }
}

// ===========================================
// SHARED PROMPT BUILDER
// ===========================================

function buildPrompt(
    topic: string,
    notes: string | undefined,
    platform: Platform,
    brandVoice: string | undefined,
    voiceExamples: string[] | undefined,
    charLimit: number,
    hashtagLimit: number
): string {
    const platformGuidance: Record<string, string> = {
        linkedin: "Use a professional, thought-leadership tone. Write in short paragraphs.",
        twitter: "Be concise and punchy. Include 1-2 emojis. Keep it under 280 chars.",
        facebook: "Be conversational and encourage engagement. Ask a question or use a call to action.",
        instagram: "Focus on visual storytelling. Use emojis generously. Write in a casual, inspiring tone.",
    };

    let examplesText = "";
    if (voiceExamples && voiceExamples.length > 0) {
        examplesText = `
Here are some examples of my previous successful posts. Mimic this style, tone, and length exactly:
---
${voiceExamples.map(e => `EXAMPLE: ${e}`).join("\n---\n")}
---
`;
    }

    return `You are a social media content expert. Generate a high-quality ${platform} post about the following topic.
    
    CRITICAL: Ensure your post is COMPLETE. Do not cut off mid-sentence. Finish every thought and sentence before closing the JSON.

TOPIC: ${topic}
${notes ? `ADDITIONAL CONTEXT: ${notes}` : ""}
${brandVoice ? `BRAND VOICE / TONE: ${brandVoice}` : ""}
${examplesText}

PLATFORM GUIDELINES:
- ${platformGuidance[platform] || "Be engaging and professional"}
- Maximum ${charLimit} characters for the post content
- Include up to ${hashtagLimit} relevant hashtags

RESPOND IN THIS EXACT JSON FORMAT:
{
  "content": "The full post text here. Finish your thoughts.",
  "hashtags": ["hashtag1", "hashtag2"],
  "imagePrompt": "A descriptive prompt for an image generator (Stable Diffusion). Describe colors, lighting, and a clear scene related to the topic. If not obvious, describe an abstract professional scene with branding colors. MANDATORY: This field must never be empty."
}
IMPORTANT: Output ONLY the raw JSON object. Do not include any intro, outro, or markdown formatting outside the JSON block.`;
}

// ===========================================
// FACTORY & EXPORTS
// ===========================================

function getAIProvider(): AIProviderInterface {
    const provider = (process.env.AI_PROVIDER || "gemini") as AIProvider;

    switch (provider) {
        case "anthropic": {
            const apiKey = process.env.ANTHROPIC_API_KEY;
            if (!apiKey) {
                throw new Error("ANTHROPIC_API_KEY is not configured");
            }
            return new AnthropicProvider(apiKey);
        }
        case "gemini":
        default: {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error("GEMINI_API_KEY is not configured");
            }
            return new GeminiProvider(apiKey);
        }
    }
}

// Convenience function for content generation
export async function generatePostContent(
    request: GenerationRequest
): Promise<GeneratedContent> {
    const provider = getAIProvider();
    return provider.generateContent(request);
}

// Get current provider name for UI display
export function getCurrentProviderName(): string {
    const provider = process.env.AI_PROVIDER || "gemini";
    return provider === "anthropic" ? "Claude (Anthropic)" : "Gemini (Google)";
}
