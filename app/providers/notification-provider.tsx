'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useNotifications } from '@/app/hooks/useNotifications';

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