const Replicate = require('replicate');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

async function testFlux() {
    console.log('Waiting 10 seconds for rate limit reset...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    try {
        console.log('Testing black-forest-labs/flux-schnell...');
        // TRY WITHOUT HASH FIRST - many libraries now auto-resolve
        const output = await replicate.run("black-forest-labs/flux-schnell", {
            input: {
                prompt: "a futuristic city",
                num_inference_steps: 4, // Schnell is very fast
                width: 1024,
                height: 768
            }
        });
        console.log('✅ Flux Schnell worked! Output:', output);
    } catch (err) {
        console.log('❌ Flux Schnell failed:', err.message);

        // IF NO-HASH FAILED, TRY WITH A KNOWN HASH
        // This is the current stable hash for flux-schnell
        const hash = "f20c424a52fa5aae3ca14922119c8366914ed0953610411832049e6d4c060010";
        console.log(`\nRetrying with hash ${hash}...`);
        try {
            const output = await replicate.run(`black-forest-labs/flux-schnell:${hash}`, {
                input: {
                    prompt: "a futuristic city",
                    num_inference_steps: 4
                }
            });
            console.log('✅ Flux Schnell with hash worked! Output:', output);
        } catch (err2) {
            console.log('❌ Flux Schnell with hash failed:', err2.message);
        }
    }
}

testFlux();
