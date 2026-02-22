async function testPollinations() {
    const prompt = encodeURIComponent("a futuristic city");
    // Some sources say /p/ is the newer endpoint
    const url = `https://pollinations.ai/p/${prompt}?width=1024&height=1024&nologo=true`;

    console.log('Testing Pollinations URL:', url);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });
        console.log('Response Status:', response.status);
        if (!response.ok) {
            const text = await response.text();
            console.log('Error Body:', text.substring(0, 200));
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        console.log('✅ Success! Image size:', buffer.byteLength, 'bytes');
    } catch (err) {
        console.log('❌ Failed:', err.message);
    }
}

testPollinations();
