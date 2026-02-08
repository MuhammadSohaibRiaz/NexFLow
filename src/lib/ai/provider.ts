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
            // Extract JSON from the response (handle markdown code blocks)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("No JSON found in response");
            }

            const parsed = JSON.parse(jsonMatch[0]);
            return {
                content: parsed.content || "",
                hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
                imagePrompt: parsed.imagePrompt || undefined,
            };
        } catch {
            // Fallback: treat entire response as content
            return {
                content: text.substring(0, 500),
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
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("No JSON found in response");
            }

            const parsed = JSON.parse(jsonMatch[0]);
            return {
                content: parsed.content || "",
                hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
                imagePrompt: parsed.imagePrompt || undefined,
            };
        } catch {
            return {
                content: text.substring(0, 500),
                hashtags: [],
                imagePrompt: undefined,
            };
        }
    }
}

// ===========================================
// FACTORY & EXPORTS
// ===========================================

let providerInstance: AIProviderInterface | null = null;

export function getAIProvider(): AIProviderInterface {
    if (providerInstance) {
        return providerInstance;
    }

    const provider = (process.env.AI_PROVIDER || "gemini") as AIProvider;

    switch (provider) {
        case "anthropic": {
            const apiKey = process.env.ANTHROPIC_API_KEY;
            if (!apiKey) {
                throw new Error("ANTHROPIC_API_KEY is not configured");
            }
            providerInstance = new AnthropicProvider(apiKey);
            break;
        }
        case "gemini":
        default: {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error("GEMINI_API_KEY is not configured");
            }
            providerInstance = new GeminiProvider(apiKey);
            break;
        }
    }

    return providerInstance;
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
