import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface AuthContextType {
  apiKey: string | null;
  isAuthenticated: boolean;
  login: (key: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    const storedKey = localStorage.getItem('jw_quiz_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const login = (key: string) => {
    localStorage.setItem('jw_quiz_api_key', key);
    setApiKey(key);
  };

  const logout = () => {
    localStorage.removeItem('jw_quiz_api_key');
    setApiKey(null);
  };

  return (
    <AuthContext.Provider value={{ apiKey, isAuthenticated: !!apiKey, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};