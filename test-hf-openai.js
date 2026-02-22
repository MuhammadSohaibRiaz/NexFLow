const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

async function testRouter() {
    const token = process.env.HUGGINGFACE_TOKEN;

    // Try the OpenAI compatible endpoint for image generation
    const url = "https://router.huggingface.co/hf-inference/v1/images/generations";

    console.log('Testing Router with OpenAI format...');
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "black-forest-labs/FLUX.1-schnell",
                prompt: "a futuristic city",
                n: 1,
                size: "1024x1024"
            }),
        });

        console.log('Response Status:', response.status);
        const data = await response.json();
        console.log('Response Body:', JSON.stringify(data, null, 2));

    } catch (err) {
        console.error('❌ Failed:', err.message);
    }
}

testRouter();
