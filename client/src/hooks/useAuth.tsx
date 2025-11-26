import React, { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from "../../../shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "./use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  
  // Check if we're on the main domain - skip authentication entirely
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isMainDomain = hostname === 'backstageos.com' || (hostname.includes('backstageos.com') && !hostname.includes('beta.') && !hostname.includes('join.'));
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes to keep session alive
    refetchIntervalInBackground: true,
    enabled: !isMainDomain, // Skip authentication queries on main domain
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      // CRITICAL: Clear ALL cached data BEFORE login to prevent showing previous user's data
      queryClient.clear();
      console.log("[Auth] Cache cleared before login to ensure data isolation");
      
      const res = await apiRequest("POST", "/api/login", credentials);
      return res;
    },
    onSuccess: (user: User) => {
      // Set the new user data - cache is already cleared so no stale data exists
      queryClient.setQueryData(["/api/user"], user);
      console.log("[Auth] New user set, fetching fresh data for user:", user.id);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      // CRITICAL: Clear ALL cached data BEFORE registration to prevent showing previous user's data
      queryClient.clear();
      console.log("[Auth] Cache cleared before registration to ensure data isolation");
      
      const res = await apiRequest("POST", "/api/register", credentials);
      return res;
    },
    onSuccess: (user: User) => {
      // Set the new user data - cache is already cleared so no stale data exists
      queryClient.setQueryData(["/api/user"], user);
      console.log("[Auth] New user registered, user:", user.id);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Clear ALL cached data when logging out to prevent other users from seeing previous user's data
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], null);
      console.log("[Auth] Cache cleared on logout");
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}