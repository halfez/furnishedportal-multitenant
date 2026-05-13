import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      landlordId: string
      role: string
      firstName?: string
      lastName?: string
    }
  }
  interface User {
    landlordId: string
    role: string
    firstName?: string
    lastName?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    landlordId: string
    role: string
    firstName?: string
    lastName?: string
  }
}
