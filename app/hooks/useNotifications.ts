'use client';

import { useEffect, useState, useCallback } from 'react';

interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      console.log('Notifications not supported');
      return 'denied';
    }

    if (permission === 'granted') {
      return 'granted';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }, [isSupported, permission]);

  const showNotification = useCallback((options: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      console.log('Notifications not available or not permitted');
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon-32x32.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
      });

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }, [isSupported, permission]);

  const showDownloadNotification = useCallback((filename: string, type: 'resume' | 'cover-letter' = 'resume') => {
    console.log('showDownloadNotification called:', { filename, type, permission, isSupported });
    const typeText = type === 'resume' ? 'Resume' : 'Cover Letter';
    const result = showNotification({
      title: `${typeText} Ready! 📄`,
      body: `Your ${typeText.toLowerCase()} "${filename}" has been downloaded successfully.`,
      tag: 'download-complete',
      requireInteraction: false,
    });
    console.log('showNotification result:', result);
    return result;
  }, [showNotification, permission, isSupported]);

  const shouldRequestPermission = useCallback((): boolean => {
    return isSupported && permission === 'default';
  }, [isSupported, permission]);

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    showDownloadNotification,
    shouldRequestPermission,
    hasPermission: permission === 'granted',
  };
}