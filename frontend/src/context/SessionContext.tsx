import React, { createContext, useContext, useState, useEffect } from 'react';
import { setSessionToken as updateApiSessionToken } from '../services/api';

interface SessionContextType {
  sessionToken: string | null;
  sessionExpiresAt: string | null;
  isAuthenticated: boolean;
  setSession: (token: string, expiresAt: string) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionToken, setSessionTokenState] = useState<string | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);

  const setSession = (token: string, expiresAt: string) => {
    setSessionTokenState(token);
    setSessionExpiresAt(expiresAt);
    updateApiSessionToken(token);
  };

  const clearSession = () => {
    setSessionTokenState(null);
    setSessionExpiresAt(null);
    updateApiSessionToken(null);
  };

  // Auto-expire session when sessionExpiresAt is reached
  useEffect(() => {
    if (!sessionExpiresAt) return;

    const expiryTime = new Date(sessionExpiresAt).getTime();
    const remainingMs = expiryTime - Date.now();

    if (remainingMs <= 0) {
      clearSession();
      return;
    }

    const timer = setTimeout(() => {
      clearSession();
    }, remainingMs);

    return () => clearTimeout(timer);
  }, [sessionExpiresAt]);

  return (
    <SessionContext.Provider
      value={{
        sessionToken,
        sessionExpiresAt,
        isAuthenticated: !!sessionToken,
        setSession,
        clearSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionContextType {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
