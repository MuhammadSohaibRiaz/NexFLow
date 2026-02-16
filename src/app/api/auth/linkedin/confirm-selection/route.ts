import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
    const { selectedUrn, name } = await request.json();
    const cookieStore = await cookies();
    const selectionDataRaw = cookieStore.get("linkedin_selection")?.value;

    if (!selectionDataRaw) {
        return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const sessionData = JSON.parse(selectionDataRaw);

    // Determine the actual account ID to save
    // If selectedUrn is "profile", we use sessionData.profileId
    // If selectedUrn is an organization URN (urn:li:organization:123), we extract the ID

    let finalAccountId = "";
    let finalAccountName = name;

    if (selectedUrn === "profile") {
        finalAccountId = sessionData.profileId;
    } else {
        // format: urn:li:organization:12345
        const parts = selectedUrn.split(":");
        if (parts.length > 0) {
            finalAccountId = parts[parts.length - 1];
        } else {
            return NextResponse.json({ error: "Invalid URN format" }, { status: 400 });
        }
    }

    // Save to Database
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // We can assume user_id from auth matches the session initiator 
    // (though strictly we should check against sessionData.userId if we stored it)

    const { error: insertError } = await supabase.from("platform_connections").upsert(
        {
            user_id: user.id,
            platform: "linkedin",
            access_token: sessionData.accessToken,
            refresh_token: sessionData.refreshToken || null,
            token_expires_at: sessionData.expiresAt,
            account_id: finalAccountId,
            account_name: finalAccountName,
            is_active: true,
        },
        {
            onConflict: "user_id,platform",
        }
    );

    if (insertError) {
        console.error("Failed to save LinkedIn connection:", insertError);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Clear the selection cookie
    cookieStore.delete("linkedin_selection");

    return NextResponse.json({ success: true });
}
