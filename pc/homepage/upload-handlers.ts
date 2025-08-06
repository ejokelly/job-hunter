import { createUserSession } from '@/app/utils/session-utils';
import { getResumePagePath } from '@/app/utils/url-utils';

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

export const createUploadSuccessHandler = (router: any) => async (userData: UserData): Promise<void> => {
  console.log('Upload success, redirecting to resume builder');
  
  const result = await createUserSession(userData);
  
  if (result.success) {
    router.push(getResumePagePath());
  }
};

export const createUploadErrorHandler = () => (error: string): void => {
  console.log('Upload error:', error);
};