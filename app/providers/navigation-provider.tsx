'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface NavigationState {
  currentPage: number;
  isMobileMenuOpen: boolean;
}

interface NavigationContextType extends NavigationState {
  setCurrentPage: (page: number) => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  openMobileMenu: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [state, setState] = useState<NavigationState>({
    currentPage: 0,
    isMobileMenuOpen: false,
  });

  const setCurrentPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setState(prev => ({ ...prev, isMobileMenuOpen: !prev.isMobileMenuOpen }));
  }, []);

  const closeMobileMenu = useCallback(() => {
    setState(prev => ({ ...prev, isMobileMenuOpen: false }));
  }, []);

  const openMobileMenu = useCallback(() => {
    setState(prev => ({ ...prev, isMobileMenuOpen: true }));
  }, []);

  const contextValue: NavigationContextType = {
    ...state,
    setCurrentPage,
    toggleMobileMenu,
    closeMobileMenu,
    openMobileMenu,
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}