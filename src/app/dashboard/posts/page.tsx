import { getPosts } from "@/lib/api/db";
import { PostsView } from "./posts-view";

export const dynamic = "force-dynamic"; // Ensure we fetch fresh data on every request

export default async function PostsPage() {
    // Fetch posts from DB
    // We can filter by status if we want, but for now we fetch all and let Client Component filter tabs
    const posts = await getPosts();

    return <PostsView initialPosts={posts} />;
}
