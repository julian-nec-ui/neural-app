import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

interface SignupRequest{
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export async function POST(request: Request) {
  try {
    const body: SignupRequest = await request.json();
    const { firstName, lastName, email, password } = body;

    if(!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    return NextResponse.json({ 
      id: Math.random().toString().substring(7),
      message: 'User created successfully', 
      firstName, 
      lastName,
      email, 
      password: hashedPassword }, 
      { status: 201 });

  } catch(error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}