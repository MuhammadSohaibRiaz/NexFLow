// ==========================================
// NexFlow Type Definitions
// ==========================================

// Platform identifiers
export type Platform = "facebook" | "linkedin" | "twitter" | "instagram";

// Posting frequency options
export type Frequency = "daily" | "weekly" | "bi-weekly" | "monthly";

// Post status lifecycle
export type PostStatus =
    | "draft"       // Just created by AI
    | "pending"     // Awaiting review (if review enabled)
    | "approved"    // User approved, waiting to publish
    | "scheduled"   // Queued for publishing
    | "published"   // Successfully posted
    | "failed"      // Failed to publish
    | "skipped";    // Skipped by user

// ==========================================
// Database Types (matches Supabase schema)
// ==========================================

export interface User {
    id: string;
    email: string;
    full_name?: string;
    brand_voice?: string;      // Custom brand voice instructions
    avatar_url?: string;
    timezone: string;          // Default: "Asia/Karachi"
    created_at: string;
    updated_at: string;
}

export interface PlatformConnection {
    id: string;
    user_id: string;
    platform: Platform;
    access_token: string;      // Encrypted OAuth token
    refresh_token?: string;    // For token refresh
    token_expires_at?: string;
    account_id?: string;       // Platform-specific account ID
    account_name?: string;     // Display name
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Pipeline {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    platforms: Platform[];      // Which platforms to post to
    frequency: Frequency;
    post_time: string;          // Time in HH:MM format
    timezone: string;
    review_required: boolean;   // Pause for approval before posting
    reminder_minutes: number;   // Minutes before post to send reminder
    is_active: boolean;
    last_run_at?: string;
    next_run_at?: string;
    created_at: string;
    updated_at: string;
}

export interface Topic {
    id: string;
    pipeline_id: string;
    title: string;
    notes?: string;             // Additional context for AI
    is_evergreen: boolean;      // Can be recycled
    recycle_interval_days?: number;
    last_used_at?: string;
    sort_order: number;
    status: "pending" | "generating" | "generated" | "skipped";
    created_at: string;
}

export interface Post {
    id: string;
    topic_id: string;
    pipeline_id: string;
    user_id: string;
    platform: Platform;
    content: string;            // Generated post text
    hashtags?: string[];
    image_url?: string;         // Generated/selected image
    image_prompt?: string;      // Prompt used for image generation
    status: PostStatus;
    scheduled_for?: string;
    published_at?: string;
    platform_post_id?: string;  // ID from the social platform
    error_message?: string;
    topics?: { title: string }; // Joined from topics table
    created_at: string;
    updated_at: string;
}

export interface PostLog {
    id: string;
    post_id: string;
    action: string;             // "created" | "approved" | "published" | "failed"
    details?: Record<string, unknown>;
    created_at: string;
}

export interface Reminder {
    id: string;
    post_id: string;
    user_id: string;
    channel: "email" | "slack" | "telegram";
    send_at: string;
    sent_at?: string;
    auto_proceeded: boolean;    // True if user didn't respond in time
    created_at: string;
}

// ==========================================
// API Response Types
// ==========================================

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

// ==========================================
// AI Generation Types
// ==========================================

export interface ContentGenerationRequest {
    topic: string;
    notes?: string;
    platform: Platform;
    brand_voice?: string;
}

export interface GeneratedContent {
    content: string;
    hashtags: string[];
    image_prompt?: string;
}

// ==========================================
// Form Types (for UI)
// ==========================================

export interface CreatePipelineForm {
    name: string;
    description?: string;
    platforms: Platform[];
    frequency: Frequency;
    post_time: string;
    timezone: string;
    review_required: boolean;
    reminder_minutes: number;
}

export interface AddTopicForm {
    title: string;
    notes?: string;
    is_evergreen: boolean;
    recycle_interval_days?: number;
}
