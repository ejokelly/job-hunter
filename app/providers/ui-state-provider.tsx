'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface UIState {
  showLoginModal: boolean;
  currentPage: number;
  isMobileMenuOpen: boolean;
}

interface UIContextType extends UIState {
  openLoginModal: () => void;
  closeLoginModal: () => void;
  setCurrentPage: (page: number) => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  openMobileMenu: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

interface UIProviderProps {
  children: ReactNode;
}

export function UIProvider({ children }: UIProviderProps) {
  const [uiState, setUIState] = useState<UIState>({
    showLoginModal: false,
    currentPage: 0,
    isMobileMenuOpen: false,
  });

  const openLoginModal = useCallback(() => {
    setUIState(prev => ({ ...prev, showLoginModal: true }));
  }, []);

  const closeLoginModal = useCallback(() => {
    setUIState(prev => ({ ...prev, showLoginModal: false }));
  }, []);

  const setCurrentPage = useCallback((page: number) => {
    setUIState(prev => ({ ...prev, currentPage: page }));
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setUIState(prev => ({ ...prev, isMobileMenuOpen: !prev.isMobileMenuOpen }));
  }, []);

  const closeMobileMenu = useCallback(() => {
    setUIState(prev => ({ ...prev, isMobileMenuOpen: false }));
  }, []);

  const openMobileMenu = useCallback(() => {
    setUIState(prev => ({ ...prev, isMobileMenuOpen: true }));
  }, []);

  const contextValue: UIContextType = {
    ...uiState,
    openLoginModal,
    closeLoginModal,
    setCurrentPage,
    toggleMobileMenu,
    closeMobileMenu,
    openMobileMenu,
  };

  return (
    <UIContext.Provider value={contextValue}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI(): UIContextType {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}