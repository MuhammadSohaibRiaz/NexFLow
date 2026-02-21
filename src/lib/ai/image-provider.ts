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
        // Using a more stable SDXL version
        // Hash for stability-ai/sdxl is updated
        const output = await replicate.run(
            "stability-ai/sdxl:39ed52f2a78e934b3ba6e24ee33373cfa09fb2b9f2717bc0150fe43d3401ad74",
            {
                input: {
                    prompt: prompt,
                    negative_prompt: "low quality, blurry, distorted, messy, text artifacts",
                    width: 1024,
                    height: 576, // 16:9 equivalent
                    num_inference_steps: 30,
                    guidance_scale: 7.5,
                    scheduler: "K_EULER"
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
