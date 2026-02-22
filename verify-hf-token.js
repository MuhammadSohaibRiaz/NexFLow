const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env.local') });

async function verifyHuggingFace() {
    const token = process.env.HUGGINGFACE_TOKEN;
    const prompt = "A modern professional solo founder working in a sleek digital office, high quality, 8k";

    console.log('Verifying Hugging Face Token:', token ? 'Token present' : 'Token MISSING');

    const url = "https://router.huggingface.co/models/black-forest-labs/FLUX.1-schnell";

    try {
        console.log('Requesting image from Hugging Face...');
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
        const buffer = Buffer.from(arrayBuffer);

        fs.writeFileSync('hf-final-test.webp', buffer);
        console.log(`✅ SUCCESS! Image saved as hf-final-test.webp (${buffer.byteLength} bytes)`);
    } catch (err) {
        console.error('❌ FAILED:', err.message);
    }
}

verifyHuggingFace();
