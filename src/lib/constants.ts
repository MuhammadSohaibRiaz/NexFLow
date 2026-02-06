import { Platform, Frequency } from "./types";

// Platform display configurations
export const PLATFORMS: Record<Platform, { label: string; color: string; icon: string }> = {
    facebook: {
        label: "Facebook",
        color: "#1877F2",
        icon: "facebook",
    },
    linkedin: {
        label: "LinkedIn",
        color: "#0A66C2",
        icon: "linkedin",
    },
    twitter: {
        label: "X (Twitter)",
        color: "#000000",
        icon: "twitter",
    },
    instagram: {
        label: "Instagram",
        color: "#E4405F",
        icon: "instagram",
    },
};

// Frequency options for scheduling
export const FREQUENCIES: Record<Frequency, { label: string; days: number }> = {
    daily: { label: "Daily", days: 1 },
    weekly: { label: "Weekly", days: 7 },
    "bi-weekly": { label: "Bi-weekly", days: 14 },
    monthly: { label: "Monthly", days: 30 },
};

// Default timeline options (PKT optimized)
export const DEFAULT_POST_TIMES = [
    { value: "09:00", label: "9:00 AM" },
    { value: "12:00", label: "12:00 PM" },
    { value: "15:00", label: "3:00 PM" },
    { value: "18:00", label: "6:00 PM" },
    { value: "21:00", label: "9:00 PM" },
];

// Reminder timing options
export const REMINDER_OPTIONS = [
    { value: 15, label: "15 minutes before" },
    { value: 30, label: "30 minutes before" },
    { value: 60, label: "1 hour before" },
    { value: 120, label: "2 hours before" },
    { value: 1440, label: "1 day before" },
];

// Platform character limits
export const PLATFORM_LIMITS: Record<Platform, { text: number; hashtags: number }> = {
    facebook: { text: 63206, hashtags: 30 },
    linkedin: { text: 3000, hashtags: 30 },
    twitter: { text: 280, hashtags: 5 },
    instagram: { text: 2200, hashtags: 30 },
};

// App info
export const APP_NAME = "NexFlow";
export const APP_DESCRIPTION = "Automated Social Media Publishing for Solo Founders";
export const APP_VERSION = "0.1.0";
