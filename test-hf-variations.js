const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

async function testVariations() {
    const token = process.env.HUGGINGFACE_TOKEN;
    const model = "black-forest-labs/FLUX.1-schnell";

    const variations = [
        `https://router.huggingface.co/hf-inference/models/${model}`,
        `https://router.huggingface.co/hf-inference/${model}`,
        `https://router.huggingface.co/v1/models/${model}`,
        `https://router.huggingface.co/v1/${model}`,
        `https://api-inference.huggingface.co/models/${model}` // Let's see if the redirect works differently now
    ];

    for (const url of variations) {
        console.log(`\nTesting: ${url}`);
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ inputs: "a futuristic city" }),
            });

            console.log('Status:', response.status);
            if (response.ok) {
                console.log('✅ SUCCESS on this URL!');
                const buffer = await response.arrayBuffer();
                console.log('Image size:', buffer.byteLength);
                break;
            } else {
                const text = await response.text();
                console.log('Error:', text.substring(0, 100));
            }
        } catch (err) {
            console.log('Error:', err.message);
        }
    }
}

testVariations();
