import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Early return for routes that don't need auth checks
    // This avoids creating a Supabase client + getUser() call on every request
    const isAuthRoute = pathname === "/login" || pathname === "/signup";
    const isDashboardRoute = pathname.startsWith("/dashboard");

    if (!isAuthRoute && !isDashboardRoute) {
        return NextResponse.next();
    }

    // Only create Supabase client for routes that actually need auth
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value);
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    // Refresh session
    const { data: { user } } = await supabase.auth.getUser();

    // Protected Routes: redirect to login if not authenticated
    if (isDashboardRoute && !user) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Auth Routes: redirect to dashboard if already logged in
    if (isAuthRoute && user) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    return response;
}

export const config = {
    matcher: [
        // Only match auth-relevant routes — skip static files, images, API routes, and landing page
        "/dashboard/:path*",
        "/login",
        "/signup",
    ],
};
