'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface AuthModalState {
  showLoginModal: boolean;
}

interface AuthModalContextType extends AuthModalState {
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

interface AuthModalProviderProps {
  children: ReactNode;
}

export function AuthModalProvider({ children }: AuthModalProviderProps) {
  const [state, setState] = useState<AuthModalState>({
    showLoginModal: false,
  });

  const openLoginModal = useCallback(() => {
    setState(prev => ({ ...prev, showLoginModal: true }));
  }, []);

  const closeLoginModal = useCallback(() => {
    setState(prev => ({ ...prev, showLoginModal: false }));
  }, []);

  const contextValue: AuthModalContextType = {
    ...state,
    openLoginModal,
    closeLoginModal,
  };

  return (
    <AuthModalContext.Provider value={contextValue}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): AuthModalContextType {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}