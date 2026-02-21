const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testQuery() {
    console.log('Testing Backfill Query...');

    const { data, error, count } = await supabase
        .from("posts")
        .select("id, status, image_url, image_prompt", { count: 'exact' })
        .in("status", ["scheduled", "generated", "published"])
        .is("image_url", null)
        .not("image_prompt", "is", null)
        .order("created_at", { ascending: false })
        .limit(5);

    if (error) {
        console.error('Query Error:', error);
        return;
    }

    console.log('Match Count:', count);
    console.log('Data:', JSON.stringify(data, null, 2));

    // Let's also try without the image_prompt filter just in case
    const { data: data2 } = await supabase
        .from("posts")
        .select("id, status, image_url, image_prompt")
        .in("status", ["scheduled", "generated", "published"])
        .is("image_url", null);

    console.log('Matches with only image_url=null:', data2?.length || 0);
    if (data2 && data2.length > 0) {
        console.log('First 2:', JSON.stringify(data2.slice(0, 2), null, 2));
    }
}

testQuery();
