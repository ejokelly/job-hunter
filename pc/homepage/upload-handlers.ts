import { createUserSession } from '@/app/utils/session-utils';
import { getResumePagePath } from '@/app/utils/url-utils';
import { triggerUploadNotification } from '@/app/utils/notification-utils';

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

export const createUploadSuccessHandler = (router: any, refreshAuth?: () => Promise<void>) => async (userData: UserData): Promise<void> => {
  console.log('Upload success, redirecting to resume builder');
  
  const result = await createUserSession(userData);
  
  if (result.success) {
    // Refresh auth context immediately so header updates
    if (refreshAuth) {
      await refreshAuth();
    }
    
    // Show upload completion notification using centralized utility
    triggerUploadNotification('Resume uploaded successfully!');
    
    router.push(getResumePagePath());
  }
};

export const createUploadErrorHandler = () => (error: string): void => {
  console.log('Upload error:', error);
};