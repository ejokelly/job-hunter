'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const loadSession = async (): Promise<User | null> => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      return data.user || null;
    } catch (error) {
      console.error('Error loading session:', error);
      return null;
    }
  };

  const refreshSession = async () => {
    const user = await loadSession();
    setAuthState({
      user,
      isLoading: false,
      isAuthenticated: !!user,
    });
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Initial session load
  useEffect(() => {
    refreshSession();
  }, []);

  // Poll for session changes every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!authState.isLoading) {
        const user = await loadSession();
        const userChanged = (!user && authState.user) || 
                           (user && !authState.user) ||
                           (user && authState.user && user.id !== authState.user.id);
        
        if (userChanged) {
          setAuthState({
            user,
            isLoading: false,
            isAuthenticated: !!user,
          });
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [authState.user, authState.isLoading]);

  const contextValue: AuthContextType = {
    ...authState,
    signOut,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}