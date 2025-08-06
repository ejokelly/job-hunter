interface UserData {
  userId: string;
  email: string;
  name: string;
  message: string;
  resumeId: string;
  sessionToken: string;
  jwtToken: string;
  emailVerified: boolean;
}

interface SessionCreationResult {
  success: boolean;
  error?: string;
}

export const createUserSession = async (userData: UserData): Promise<SessionCreationResult> => {
  try {
    const response = await fetch('/api/create-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userData.userId,
        email: userData.email,
        name: userData.name
      }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      console.error('Failed to create session');
      return { success: false, error: 'Failed to create session' };
    }
  } catch (error) {
    console.error('Error creating session:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};