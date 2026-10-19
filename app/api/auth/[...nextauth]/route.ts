// import NextAuth from 'next-auth'
// import CredentialsProvider from 'next-auth/providers/credentials'

// const handler = NextAuth({
//   providers: [
//     CredentialsProvider({
//       name: 'Credentials',
//       credentials: {
//         email: { label: 'Email', type: 'email' },
//         password: { label: 'Password', type: 'password' }
//       },
//       async authorize (credentials) {
//         // 1. YOUR DATABASE LOGIC HERE
//         // Example: const user = await db.user.findUnique({ where: { email: credentials.email } });

//         // for now we'll just return a user
//         if (
//           credentials?.email === 'sK0yv@example.com' &&
//           credentials?.password === '123456'
//         ) {
//           return { id: '1', name: 'John Martin', email: 'admin@example.com', role: 'admin' }
//         } 

//         return null;
//       }
//     })
//   ],
//   session: {
//     strategy: 'jwt',
//     maxAge: 30 * 24 * 60 * 60 // 30 days
//   },
//   callbacks: {
//     // this adds the User ID to the Role on the encrypted token
//     async jwt({ token, user }) {
//       if (user) {
//         token.id = user.id;
//         token.role = (user as any).role;
//       }

//       return token
//     }
//   }
// })

// export { handler as GET, handler as POST }
