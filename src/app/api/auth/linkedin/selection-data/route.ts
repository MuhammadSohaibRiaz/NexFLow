import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
    const cookieStore = await cookies();
    const selectionDataRaw = cookieStore.get("linkedin_selection")?.value;

    if (!selectionDataRaw) {
        return NextResponse.json({ error: "No selection session found" }, { status: 401 });
    }

    try {
        const data = JSON.parse(selectionDataRaw);
        // Sanitize: Don't send tokens to client if not needed (for now we might need them if we did clientside save, but better to keep server side)
        // Actually, we process everything server side in the POST. The client just needs names/IDs.
        return NextResponse.json({
            profileName: data.profileName,
            pages: data.pages
        });
    } catch (e) {
        return NextResponse.json({ error: "Invalid session data" }, { status: 500 });
    }
}
