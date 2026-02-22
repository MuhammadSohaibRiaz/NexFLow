import Replicate from "replicate";

/**
 * AI Image Provider
 * 
 * Supports multiple providers:
 * 1. Hugging Face (FLUX.1-schnell) - Best free quality, requires token
 * 2. Pollinations.ai - Zero-config, reliable backup
 * 3. Replicate (SDXL) - Original provider (backup)
 */

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

async function generateWithHuggingFace(prompt: string): Promise<Buffer> {
    const token = process.env.HUGGINGFACE_TOKEN;
    if (!token) throw new Error("HUGGINGFACE_TOKEN is not configured");

    console.log(`[ImageProvider] Attempting Hugging Face generation...`);

    // Using FLUX.1-schnell (high speed, high quality)
    // Updated to the correct router endpoint format: /hf-inference/models/
    const url = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Hugging Face error: ${response.status} - ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

async function generateWithPollinations(prompt: string): Promise<Buffer> {
    console.log(`[ImageProvider] Attempting Pollinations.ai generation...`);
    const encodedPrompt = encodeURIComponent(prompt);
    const url = `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=576&nologo=true`;

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    if (!response.ok) {
        throw new Error(`Pollinations error: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

async function generateWithReplicate(prompt: string): Promise<Buffer> {
    if (!process.env.REPLICATE_API_TOKEN) {
        throw new Error("REPLICATE_API_TOKEN is not configured");
    }

    console.log(`[ImageProvider] Attempting Replicate generation...`);

    // SDXL stable version
    const output = await replicate.run(
        "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
        {
            input: {
                prompt: prompt,
                negative_prompt: "low quality, blurry, distorted, messy, text artifacts",
                width: 1024,
                height: 576,
                num_inference_steps: 30,
                guidance_scale: 7.5,
                scheduler: "K_EULER"
            }
        }
    );

    if (!output || !Array.isArray(output) || output.length === 0) {
        throw new Error("No image generated from Replicate");
    }

    const response = await fetch(output[0]);
    if (!response.ok) throw new Error("Failed to download Replicate image");

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

export async function generateImage(prompt: string): Promise<Buffer> {
    const provider = process.env.IMAGE_PROVIDER || "huggingface";
    console.log(`[ImageProvider] Target provider: ${provider}`);

    try {
        if (provider === "huggingface") {
            return await generateWithHuggingFace(prompt);
        } else if (provider === "replicate") {
            return await generateWithReplicate(prompt);
        } else {
            return await generateWithPollinations(prompt);
        }
    } catch (error: any) {
        console.warn(`[ImageProvider] ${provider} failed, falling back to Pollinations:`, error.message);
        // Failover to Pollinations if any primary provider fails
        if (provider !== "pollinations") {
            try {
                return await generateWithPollinations(prompt);
            } catch (fallbackError: any) {
                console.error("[ImageProvider] Fallback also failed:", fallbackError.message);
                throw error; // Throw original error if fallback fails
            }
        }
        throw error;
    }
}
