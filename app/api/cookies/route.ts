import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// 1. GET Route: Read the cookie
export async function GET() {
  const cookieStore = await cookies();
  const theme = cookieStore.get('app_theme')?.value;

  return NextResponse.json({ 
    message: "Cookie retrieved successfully", 
    theme: theme || 'Not set' 
  });
}

// 2. POST Route: Set the cookie
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { theme } = body;

  if (!theme) {
    return NextResponse.json({ error: "Theme value is required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  
  // Set cookie with options:
  // expires: set to 30 days from now
  // httpOnly: true (prevents JavaScript from accessing it, more secure)
  // path: / (available across the whole site)
  cookieStore.set('app_theme', theme, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return NextResponse.json({ 
    message: `Theme set to ${theme} successfully` 
  });
}

// 3. DELETE Route: Remove the cookie
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('app_theme');

  return NextResponse.json({ 
    message: "Cookie deleted successfully" 
  });
}
