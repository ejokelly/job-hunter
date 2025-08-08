'use client';

import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useNotifications } from '@/app/hooks/useNotifications';
import { registerNotificationService } from '@/app/utils/notification-utils';

interface NotificationContextType {
  permission: NotificationPermission;
  isSupported: boolean;
  hasPermission: boolean;
  requestPermission: () => Promise<NotificationPermission>;
  showNotification: (options: {
    title: string;
    body?: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
  }) => Notification | null;
  showDownloadNotification: (filename: string, type?: 'resume' | 'cover-letter') => Notification | null;
  shouldRequestPermission: () => boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const notifications = useNotifications();

  // Register this provider as the global notification service
  useEffect(() => {
    const service = {
      showDownloadNotification: notifications.showDownloadNotification,
      showUploadNotification: (filename: string) => {
        return notifications.showDownloadNotification(filename, 'resume');
      },
      showGenerationNotification: (type: 'resume' | 'cover-letter') => {
        const filename = type === 'resume' ? 'resume.pdf' : 'cover-letter.pdf';
        return notifications.showDownloadNotification(filename, type);
      }
    };
    
    registerNotificationService(service);
    console.log('Notification service registered globally');
  }, [notifications.showDownloadNotification]);

  return (
    <NotificationContext.Provider value={notifications}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}