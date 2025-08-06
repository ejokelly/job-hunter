'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type DeviceType = 'pc' | 'mobile';

interface DeviceState {
  deviceType: DeviceType;
  isLoading: boolean;
}

interface DeviceContextType extends DeviceState {
  isMobile: boolean;
  isPc: boolean;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

interface DeviceProviderProps {
  children: ReactNode;
}

export function DeviceProvider({ children }: DeviceProviderProps) {
  const [state, setState] = useState<DeviceState>({
    deviceType: 'pc', // default to pc to avoid flash
    isLoading: true,
  });

  useEffect(() => {
    const detectDevice = () => {
      // Check for coarse pointer (touch with fingers)
      const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
      
      // Check various mobile/tablet conditions
      const isSmallWidth = window.matchMedia('(max-width: 768px)').matches;
      const isShortHeight = window.matchMedia('(max-height: 700px)').matches;
      const isTouchDevice = window.matchMedia('(max-width: 1024px)').matches;
      
      // Consider mobile/tablet if:
      // 1. Has coarse pointer AND (small width OR short height)
      // 2. This catches phones, small tablets, and tablets in landscape
      const isMobileDevice = hasCoarsePointer && (isSmallWidth || (isShortHeight && isTouchDevice));
      
      setState({
        deviceType: isMobileDevice ? 'mobile' : 'pc',
        isLoading: false,
      });
    };

    // Run detection immediately
    detectDevice();

    // Listen for orientation changes and resize events
    const handleResize = () => detectDevice();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const contextValue: DeviceContextType = {
    ...state,
    isMobile: state.deviceType === 'mobile',
    isPc: state.deviceType === 'pc',
  };

  return (
    <DeviceContext.Provider value={contextValue}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice(): DeviceContextType {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
}