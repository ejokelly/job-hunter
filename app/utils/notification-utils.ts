/**
 * Centralized notification utilities for download notifications
 */

export interface NotificationService {
  showDownloadNotification: (filename: string, type?: 'resume' | 'cover-letter') => void;
  showUploadNotification: (filename: string) => void;
  showGenerationNotification: (type: 'resume' | 'cover-letter') => void;
}

// Global notification service instance
let notificationService: NotificationService | null = null;

/**
 * Register the notification service (called by NotificationProvider)
 */
export function registerNotificationService(service: NotificationService) {
  notificationService = service;
}

/**
 * Trigger a download notification from anywhere in the app
 */
export function triggerDownloadNotification(filename: string, type: 'resume' | 'cover-letter' = 'resume') {
  console.log('triggerDownloadNotification called:', { filename, type, hasService: !!notificationService });
  
  if (notificationService) {
    notificationService.showDownloadNotification(filename, type);
  } else {
    console.warn('Notification service not available. Make sure NotificationProvider is mounted.');
  }
}

/**
 * Trigger an upload completion notification
 */
export function triggerUploadNotification(filename: string = 'resume-uploaded.pdf') {
  console.log('triggerUploadNotification called:', { filename, hasService: !!notificationService });
  
  if (notificationService) {
    notificationService.showUploadNotification(filename);
  } else {
    console.warn('Notification service not available. Make sure NotificationProvider is mounted.');
  }
}

/**
 * Trigger a generation completion notification
 */
export function triggerGenerationNotification(type: 'resume' | 'cover-letter') {
  console.log('triggerGenerationNotification called:', { type, hasService: !!notificationService });
  
  if (notificationService) {
    notificationService.showGenerationNotification(type);
  } else {
    console.warn('Notification service not available. Make sure NotificationProvider is mounted.');
  }
}

/**
 * Check if notification service is available
 */
export function isNotificationServiceAvailable(): boolean {
  return !!notificationService;
}