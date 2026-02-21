const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const postIds = [
    'ad12f026-3f17-4d34-af99-3e048a0d8fd8',
    'ede8f1f3-0d92-495c-92c0-67c75a3e84b2'
];

async function checkPosts() {
    console.log('Checking posts:', postIds);
    const { data, error } = await supabase
        .from('posts')
        .select('id, status, image_url, image_prompt, hashtags, content')
        .in('id', postIds);

    if (error) {
        console.error('Error fetching posts:', error);
        return;
    }

    console.log('Post Data:');
    console.log(JSON.stringify(data, null, 2));
}

checkPosts();
