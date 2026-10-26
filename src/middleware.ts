import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protect /dashboard routes
    if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        const protectedAdmin = ['gradinarumanuel99@gmail.com', 'alexxperian@gmail.com'].includes((user.email || '').toLowerCase())
        const role = protectedAdmin ? 'admin' : (profile?.role || 'client')
        const path = request.nextUrl.pathname
        if (role === 'support' && path === '/dashboard') return NextResponse.redirect(new URL('/dashboard/support', request.url))
        const blocked =
            (role === 'support' && !(path === '/dashboard' || ['/dashboard/support', '/dashboard/account'].some((allowed) => path === allowed || path.startsWith(`${allowed}/`)))) ||
            (role === 'auditor' && (path.includes('/create') || path.includes('/edit') || ['/dashboard/groups', '/dashboard/templates', '/dashboard/landing-pages', '/dashboard/users', '/dashboard/services', '/dashboard/requests', '/dashboard/logs'].some((prefix) => path.startsWith(prefix)))) ||
            (role === 'client' && ['/dashboard/users', '/dashboard/requests', '/dashboard/logs'].some((prefix) => path.startsWith(prefix))) ||
            (role === 'campaign_manager' && path.startsWith('/dashboard/services')) ||
            (role === 'admin' && path.startsWith('/dashboard/services'))
        if (blocked) return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Redirect /login to /dashboard if already logged in
    if (request.nextUrl.pathname === '/login' && user) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
