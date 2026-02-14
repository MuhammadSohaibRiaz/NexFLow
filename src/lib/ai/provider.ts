/**
 * AI Provider Abstraction Layer
 * 
 * Supports multiple AI providers with a unified interface.
 * Switch between providers via AI_PROVIDER env variable.
 * 
 * Development: Gemini (free tier - 15 RPM, 1000 RPD, 250K TPM)
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
// PROVIDER INTERFACE
// ===========================================

interface AIProviderInterface {
    generateContent(request: GenerationRequest): Promise<GeneratedContent>;
    generateImage?(prompt: string): Promise<string | null>;
}

// ===========================================
// GEMINI PROVIDER (Free tier)
// ===========================================

class GeminiProvider implements AIProviderInterface {
    private apiKey: string;
    private baseUrl = "https://generativelanguage.googleapis.com/v1beta";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async generateContent(request: GenerationRequest): Promise<GeneratedContent> {
        const { topic, notes, platform, brandVoice } = request;
        const charLimit = PLATFORM_LIMITS[platform].text;
        const hashtagLimit = PLATFORM_LIMITS[platform].hashtags;

        const prompt = this.buildPrompt(topic, notes, platform, brandVoice, charLimit, hashtagLimit);

        const response = await fetch(
            `${this.baseUrl}/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1024,
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
            throw new Error("No content generated");
        }

        return this.parseResponse(text);
    }

    private buildPrompt(
        topic: string,
        notes: string | undefined,
        platform: Platform,
        brandVoice: string | undefined,
        charLimit: number,
        hashtagLimit: number
    ): string {
        return `You are a social media content expert. Generate a ${platform} post about the following topic.

TOPIC: ${topic}
${notes ? `ADDITIONAL CONTEXT: ${notes}` : ""}
${brandVoice ? `BRAND VOICE: ${brandVoice}` : ""}

REQUIREMENTS:
- Maximum ${charLimit} characters for the post content
- Include up to ${hashtagLimit} relevant hashtags
- Make it engaging and professional
- ${platform === "linkedin" ? "Use a professional, thought-leadership tone" : ""}
- ${platform === "twitter" ? "Be concise and punchy, include 1-2 emojis" : ""}
- ${platform === "facebook" ? "Be conversational and encourage engagement" : ""}
- ${platform === "instagram" ? "Focus on visual storytelling, use emojis generously" : ""}

RESPOND IN THIS EXACT JSON FORMAT:
{
  "content": "Your post content here without hashtags",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "imagePrompt": "A description for generating an accompanying image"
}

Respond ONLY with valid JSON, no additional text.`;
    }

    private parseResponse(text: string): GeneratedContent {
        try {
            // Step 1: Strip markdown code block wrappers if present
            let cleanedText = text.trim();

            // Remove ```json ... ``` or ``` ... ```
            const codeBlockMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (codeBlockMatch) {
                cleanedText = codeBlockMatch[1].trim();
            }

            // Step 2: Try to parse the cleaned text directly as JSON
            let parsed;
            try {
                parsed = JSON.parse(cleanedText);
            } catch {
                // Step 3: Try to extract JSON object using balanced brace matching
                const jsonStart = cleanedText.indexOf("{");
                if (jsonStart === -1) throw new Error("No JSON found");

                let braceCount = 0;
                let jsonEnd = -1;
                for (let i = jsonStart; i < cleanedText.length; i++) {
                    if (cleanedText[i] === "{") braceCount++;
                    if (cleanedText[i] === "}") braceCount--;
                    if (braceCount === 0) {
                        jsonEnd = i + 1;
                        break;
                    }
                }

                if (jsonEnd === -1) throw new Error("Unbalanced JSON braces");
                parsed = JSON.parse(cleanedText.substring(jsonStart, jsonEnd));
            }

            return {
                content: parsed.content || "",
                hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
                imagePrompt: parsed.imagePrompt || undefined,
            };
        } catch (e) {
            console.error("[GeminiProvider] Failed to parse AI response:", e, "\nRaw text:", text.substring(0, 200));
            // Smart fallback: try to extract content field manually
            const contentMatch = text.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            if (contentMatch) {
                return {
                    content: contentMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
                    hashtags: [],
                    imagePrompt: undefined,
                };
            }
            // Last resort: use raw text but clean it up
            const cleaned = text.replace(/```json\s*/g, "").replace(/```/g, "").trim();
            return {
                content: cleaned.substring(0, 500),
                hashtags: [],
                imagePrompt: undefined,
            };
        }
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
        const { topic, notes, platform, brandVoice } = request;
        const charLimit = PLATFORM_LIMITS[platform].text;
        const hashtagLimit = PLATFORM_LIMITS[platform].hashtags;

        const prompt = this.buildPrompt(topic, notes, platform, brandVoice, charLimit, hashtagLimit);

        const response = await fetch(`${this.baseUrl}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": this.apiKey,
                "anthropic-version": "2024-01-01",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1024,
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

        return this.parseResponse(text);
    }

    private buildPrompt(
        topic: string,
        notes: string | undefined,
        platform: Platform,
        brandVoice: string | undefined,
        charLimit: number,
        hashtagLimit: number
    ): string {
        // Same prompt structure as Gemini for consistency
        return `You are a social media content expert. Generate a ${platform} post about the following topic.

TOPIC: ${topic}
${notes ? `ADDITIONAL CONTEXT: ${notes}` : ""}
${brandVoice ? `BRAND VOICE: ${brandVoice}` : ""}

REQUIREMENTS:
- Maximum ${charLimit} characters for the post content
- Include up to ${hashtagLimit} relevant hashtags
- Make it engaging and professional
- ${platform === "linkedin" ? "Use a professional, thought-leadership tone" : ""}
- ${platform === "twitter" ? "Be concise and punchy, include 1-2 emojis" : ""}
- ${platform === "facebook" ? "Be conversational and encourage engagement" : ""}
- ${platform === "instagram" ? "Focus on visual storytelling, use emojis generously" : ""}

RESPOND IN THIS EXACT JSON FORMAT:
{
  "content": "Your post content here without hashtags",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "imagePrompt": "A description for generating an accompanying image"
}

Respond ONLY with valid JSON, no additional text.`;
    }

    private parseResponse(text: string): GeneratedContent {
        try {
            // Step 1: Strip markdown code block wrappers if present
            let cleanedText = text.trim();

            const codeBlockMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (codeBlockMatch) {
                cleanedText = codeBlockMatch[1].trim();
            }

            // Step 2: Try to parse directly
            let parsed;
            try {
                parsed = JSON.parse(cleanedText);
            } catch {
                // Step 3: Balanced brace extraction
                const jsonStart = cleanedText.indexOf("{");
                if (jsonStart === -1) throw new Error("No JSON found");

                let braceCount = 0;
                let jsonEnd = -1;
                for (let i = jsonStart; i < cleanedText.length; i++) {
                    if (cleanedText[i] === "{") braceCount++;
                    if (cleanedText[i] === "}") braceCount--;
                    if (braceCount === 0) {
                        jsonEnd = i + 1;
                        break;
                    }
                }

                if (jsonEnd === -1) throw new Error("Unbalanced JSON braces");
                parsed = JSON.parse(cleanedText.substring(jsonStart, jsonEnd));
            }

            return {
                content: parsed.content || "",
                hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
                imagePrompt: parsed.imagePrompt || undefined,
            };
        } catch (e) {
            console.error("[AnthropicProvider] Failed to parse AI response:", e, "\nRaw text:", text.substring(0, 200));
            const contentMatch = text.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            if (contentMatch) {
                return {
                    content: contentMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
                    hashtags: [],
                    imagePrompt: undefined,
                };
            }
            const cleaned = text.replace(/```json\s*/g, "").replace(/```/g, "").trim();
            return {
                content: cleaned.substring(0, 500),
                hashtags: [],
                imagePrompt: undefined,
            };
        }
    }
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
