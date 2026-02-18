import Replicate from "replicate";

/**
 * AI Image Provider
 * 
 * Uses Replicate (Stable Diffusion 3) for generating high-quality images
 * and handles the API integration.
 */

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

export async function generateImage(prompt: string): Promise<Buffer> {
    if (!process.env.REPLICATE_API_TOKEN) {
        throw new Error("REPLICATE_API_TOKEN is not configured");
    }

    console.log(`[ImageProvider] Generating image for prompt: "${prompt}"`);

    try {
        // SD3 is high quality and handles text/detail well
        const output = await replicate.run(
            "stability-ai/sdxl:7762fd39782bca0f3be8a2a44b105dca776a3c79b727b337c7e03ca0ebfa6ece",
            {
                input: {
                    prompt: prompt,
                    negative_prompt: "low quality, blurry, distorted, messy, text artifacts",
                    aspect_ratio: "16:9",
                    num_outputs: 1,
                    scheduler: "K_EULER",
                    guidance_scale: 7.5,
                    num_inference_steps: 50
                }
            }
        );

        if (!output || !Array.isArray(output) || output.length === 0) {
            throw new Error("No image generated from Replicate");
        }

        const imageUrl = output[0];
        console.log(`[ImageProvider] Image generated: ${imageUrl}`);

        // Fetch the image and return as Buffer
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error("Failed to download generated image");
        
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);

    } catch (error: any) {
        console.error("[ImageProvider] Generation failed:", error);
        throw error;
    }
}
