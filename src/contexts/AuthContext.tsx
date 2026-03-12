import React, { createContext, useContext, ReactNode } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  company: string;
  plan: string;
  minutesUsed: number;
  minutesLimit: number;
  accountCreated: string;
  role: string;
}

interface AuthContextType {
  user: User;
}

const mockUser: User = {
  id: "usr_bp_001",
  name: "Michael Torres",
  email: "michael@benefitsfirst.com",
  company: "Benefits First Insurance Group",
  plan: "voice_ai_pro",
  minutesUsed: 4328,
  minutesLimit: 10000,
  accountCreated: "2025-06-15",
  role: "admin",
};

const AuthContext = createContext<AuthContextType>({ user: mockUser });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => (
  <AuthContext.Provider value={{ user: mockUser }}>{children}</AuthContext.Provider>
);
