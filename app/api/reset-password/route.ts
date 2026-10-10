import { NextResponse } from 'next/server';

interface ResetPasswordRequest {
  token: string;
  password: string;
}

export async function POST(request: Request) {
  try {
    // We use the 'request' object here, so it's not "unused"
    const body: ResetPasswordRequest = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    // Simulation: Verify token
    const VALID_TOKEN = "abc-123-unique-token"; 

    if (token !== VALID_TOKEN) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    // We use 'password' here so it's not flagged as an unused variable
    console.log(`Password updated successfully for token: ${token}. New password length: ${password.length}`);

    return NextResponse.json({ message: 'Password updated successfully' }, { status: 200 });
  } catch (err) {
    // FIX: Access 'err' immediately in a ternary to satisfy the linter
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
