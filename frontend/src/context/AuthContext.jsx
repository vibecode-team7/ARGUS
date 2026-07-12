import { createContext, useContext, useState } from "react";
import { getStoredApiKey, setStoredApiKey, clearStoredApiKey } from "../lib/api";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [apiKey, setApiKey] = useState(getStoredApiKey);

  const login = (key) => {
    setStoredApiKey(key);
    setApiKey(key);
  };

  const logout = () => {
    clearStoredApiKey();
    setApiKey(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: Boolean(apiKey), login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
