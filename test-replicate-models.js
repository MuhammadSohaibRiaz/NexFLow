const Replicate = require('replicate');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

async function testModels() {
    console.log('Testing Replicate Models...');

    const models = [
        "stability-ai/sdxl",
        "black-forest-labs/flux-schnell",
        "stability-ai/stable-diffusion-3"
    ];

    for (const model of models) {
        try {
            console.log(`\nTesting ${model}...`);
            // Try to run with just the model name (some versions of the library support this)
            const output = await replicate.run(model, {
                input: {
                    prompt: "a futuristic city",
                    num_inference_steps: 1
                }
            });
            console.log(`✅ ${model} worked! Output:`, output);
        } catch (err) {
            console.log(`❌ ${model} failed:`, err.message);
        }
    }
}

testModels();
