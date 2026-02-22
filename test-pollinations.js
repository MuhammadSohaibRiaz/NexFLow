async function testPollinations() {
    const prompt = encodeURIComponent("a professional business office with a modern solo founder");
    const url = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&nologo=true&seed=42`;

    console.log('Testing Pollinations URL:', url);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        console.log('✅ Success! Image size:', buffer.byteLength, 'bytes');
    } catch (err) {
        console.log('❌ Failed:', err.message);
    }
}

testPollinations();
