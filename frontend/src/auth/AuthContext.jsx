import { createContext, useContext, useState } from "react";
import * as authService from "./authService.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.loadSession());

  async function login(credentials) {
    const signedIn = await authService.login(credentials);
    authService.saveSession(signedIn);
    setUser(signedIn);
    return signedIn;
  }

  async function signup(details) {
    return authService.signup(details);
  }

  function logout() {
    authService.clearSession();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
