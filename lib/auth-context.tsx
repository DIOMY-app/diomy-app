import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "@/lib/services/auth";
import { Profile } from "@/lib/supabase";

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  signInWithOTP: (phoneNumber: string) => Promise<any>;
  verifyOTP: (phoneNumber: string, token: string) => Promise<any>;
  createProfile: (
    userId: string,
    phoneNumber: string,
    fullName: string,
    role: "client" | "driver"
  ) => Promise<any>;
  updateProfile: (updates: Partial<Profile>) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user profile on mount
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await authService.getCurrentProfile();
      setUser(profile);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const signInWithOTP = async (phoneNumber: string) => {
    const result = await authService.sendOTP(phoneNumber);
    return result;
  };

  const verifyOTP = async (phoneNumber: string, token: string) => {
    const result = await authService.verifyOTP(phoneNumber, token);
    if (result.success) {
      await loadUserProfile();
    }
    return result;
  };

  const createProfile = async (
    userId: string,
    phoneNumber: string,
    fullName: string,
    role: "client" | "driver"
  ) => {
    const result = await authService.createProfile(
      userId,
      phoneNumber,
      fullName,
      role
    );
    if (result.success) {
      setUser(result.data);
    }
    return result;
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { success: false };
    const result = await authService.updateProfile(user.id, updates);
    if (result.success) {
      setUser(result.data);
    }
    return result;
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        signInWithOTP,
        verifyOTP,
        createProfile,
        updateProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
