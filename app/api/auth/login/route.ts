import {cookies} from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request){
  const {email, password} = await request.json();

  if(email==='user@example.com' && password === '123456'){
    const cookieStore = await cookies();

    cookieStore.set('auth-token', 'abc-123-unique-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });
  }

  return NextResponse.json({message: 'Invalid credentials'}, {status: 401});
}