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
        // We use a verified stable version of SDXL to avoid "422 Invalid Version"
        // This is the current most widely used version ID for stability-ai/sdxl
        // If this ever fails, we can implement dynamic resolution using replicate.models.get
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
