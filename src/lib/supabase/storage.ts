import { createServiceClient } from "@/lib/supabase/service";

/**
 * Supabase Storage Utilities
 * 
 * Handles uploading and retrieving public URLs for generated assets.
 */

export async function uploadPostImage(buffer: Buffer, filename: string): Promise<string> {
    const supabase = createServiceClient();
    const bucketName = "posts";

    const { data, error } = await supabase
        .storage
        .from(bucketName)
        .upload(filename, buffer, {
            contentType: "image/webp",
            upsert: true
        });

    if (error) {
        console.error("[Storage] Upload failed:", error);
        throw error;
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase
        .storage
        .from(bucketName)
        .getPublicUrl(filename);

    return publicUrl;
}
