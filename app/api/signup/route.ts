import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export async function POST(request: Request) {
  try {
    const body: SignupRequest = await request.json();
    const { firstName, lastName, email, password } = body;

    // 1. Validation
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // 2. THE BEST PRACTICE: Server-Side Hashing
    // Salt rounds = 10 (industry standard balance between security and speed)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Simulate Database Save
    // In a real app: await db.user.create({ data: { email, password: hashedPassword ... } })
    console.log('--- Securely Saved User ---');
    console.log('User:', `${firstName} ${lastName}`);
    console.log('Email:', email);
    console.log('Hashed Password:', hashedPassword); // This is what is stored in the DB
    console.log('---------------------------');

    return NextResponse.json({ 
      message: 'Account created successfully!',
      userId: 'generated_id_123' 
    }, { status: 201 });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
