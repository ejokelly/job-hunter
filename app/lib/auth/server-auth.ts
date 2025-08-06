import { cookies } from 'next/headers'
import { CodewordAuth } from './codeword-auth'

export async function getServerSession() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session-token')?.value
    
    if (!sessionToken) {
      return null
    }
    
    const session = await CodewordAuth.getSession(sessionToken)
    return session
  } catch (error) {
    console.error('Error getting server session:', error)
    return null
  }
}

// For backward compatibility with existing code
export async function getServerAuthSession() {
  return getServerSession()
}