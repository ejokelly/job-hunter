'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/providers/auth-provider';
import { useNotificationContext } from '@/app/providers/notification-provider';
import NotificationPermissionModal from '@/pc/modals/notification-permission-modal';

export default function NotificationManager() {
  const { isAuthenticated, user } = useAuth();
  const { shouldRequestPermission, hasPermission } = useNotificationContext();
  const [showModal, setShowModal] = useState(false);
  const [hasShownModal, setHasShownModal] = useState(false);

  useEffect(() => {
    // Show modal when user logs in and hasn't granted permissions yet
    if (isAuthenticated && user && shouldRequestPermission() && !hasShownModal) {
      // Delay showing the modal to give user a moment after login
      const timer = setTimeout(() => {
        setShowModal(true);
        setHasShownModal(true);
      }, 2000); // 2 second delay

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, shouldRequestPermission, hasShownModal]);

  // Reset hasShownModal when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setHasShownModal(false);
    }
  }, [isAuthenticated]);

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handlePermissionGranted = () => {
    console.log('Notification permission granted!');
    setShowModal(false);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <NotificationPermissionModal
      isOpen={showModal}
      onClose={handleModalClose}
      onPermissionGranted={handlePermissionGranted}
      title="Get Download Notifications"
      description="We'll only send you notifications when your resume or cover letter downloads are ready. No spam, no marketing - just helpful download alerts."
      primaryButtonText="Enable Notifications"
    />
  );
}