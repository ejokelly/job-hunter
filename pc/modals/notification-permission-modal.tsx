'use client';

import { useState } from 'react';
import Modal from './modal';
import ActionButton from '@/pc/ui/action-button';
import { useNotificationContext } from '@/app/providers/notification-provider';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
  title?: string;
  description?: string;
  primaryButtonText?: string;
}

export default function NotificationPermissionModal({
  isOpen,
  onClose,
  onPermissionGranted,
  title = "Get Download Notifications",
  description = "We'll only send you notifications when your resume or cover letter downloads are ready. No spam, no marketing - just helpful download alerts.",
  primaryButtonText = "Enable Notifications"
}: NotificationPermissionModalProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const { requestPermission } = useNotificationContext();

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    
    try {
      const result = await requestPermission();
      
      if (result === 'granted') {
        onPermissionGranted?.();
        onClose();
      } else {
        // Permission denied or dismissed
        onClose();
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      onClose();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleNotNow = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="text-center py-6">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a1 1 0 011-1h2a1 1 0 011 1v5zM9 7H4l5-5 5 5H9v5a1 1 0 01-1 1H6a1 1 0 01-1-1V7z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold theme-text-primary mb-2">
            {title}
          </h3>
          <p className="theme-text-secondary text-sm leading-relaxed">
            {description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <ActionButton
            onClick={handleRequestPermission}
            variant="primary"
            busy={isRequesting}
            className="min-w-32"
          >
            {primaryButtonText}
          </ActionButton>
          <ActionButton
            onClick={handleNotNow}
            variant="ghost"
            disabled={isRequesting}
            className="min-w-32"
          >
            Not Now
          </ActionButton>
        </div>

        <p className="mt-4 text-xs theme-text-tertiary">
          You can change this setting anytime in your browser preferences.
        </p>
      </div>
    </Modal>
  );
}