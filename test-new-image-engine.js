// Mock environment for the test
process.env.IMAGE_PROVIDER = 'pollinations'; // Test the zero-config one first

async function testFinalProvider() {
    // Dynamic import for TS/ESM compatibility
    const { generateImage } = await import('./src/lib/ai/image-provider.js');
    console.log('Testing Image Provider Overhaul (Pollinations Fallback)...');
    const prompt = "A modern professional solo founder working in a sleek digital office";

    try {
        const buffer = await generateImage(prompt);
        const filename = 'test-final-output.webp';
        fs.writeFileSync(filename, buffer);
        console.log(`✅ Success! Image saved to ${filename} (${buffer.byteLength} bytes)`);
        console.log('This proves that the image generator now works ZERO-CONFIG if needed!');
    } catch (err) {
        console.error('❌ Failed:', err.message);
    }
}

testFinalProvider();
