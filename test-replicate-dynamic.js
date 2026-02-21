const Replicate = require('replicate');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

async function testDynamic() {
    console.log('Testing Dynamic Model Resolution...');

    try {
        console.log('Fetching stability-ai/sdxl model info...');
        const model = await replicate.models.get("stability-ai", "sdxl");
        console.log('Latest Version ID:', model.latest_version.id);

        console.log('\nAttempting to run latest version...');
        const output = await replicate.run(
            `stability-ai/sdxl:${model.latest_version.id}`,
            {
                input: {
                    prompt: "a futuristic city",
                    num_inference_steps: 1
                }
            }
        );
        console.log('✅ Success! Output:', output);
    } catch (err) {
        console.log('❌ Failed:', err.status, err.message);
        if (err.status === 402) {
            console.log('NOTE: This means your Replicate account needs a payment method or credits.');
        }
    }
}

testDynamic();
