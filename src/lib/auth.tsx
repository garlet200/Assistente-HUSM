'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

// We map Supabase Auth User to our local user format for backward compatibility
interface User {
  id: string;
  name: string;
  email?: string;
  role: 'student' | 'doctor';
  hasCompletedOnboarding: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const mapSupabaseUserToLocal = (supabaseUser: SupabaseUser) => {
    // Extract metadata set during signup
    const metadata = supabaseUser.user_metadata || {};
    setUser({
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: metadata.name || supabaseUser.email?.split('@')[0] || 'User',
      role: metadata.role || 'student',
      hasCompletedOnboarding: metadata.hasCompletedOnboarding || false,
    });
    setLoading(false);
  };

  useEffect(() => {
    // Check active session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        mapSupabaseUserToLocal(session.user);
      } else {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          mapSupabaseUserToLocal(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    sessionStorage.removeItem('activeChatId');
    sessionStorage.removeItem('activeStudyId');
  };

  const completeOnboarding = async () => {
    if (user) {
      const updatedUser = { ...user, hasCompletedOnboarding: true };
      setUser(updatedUser);
      // Update metadata in Supabase
      await supabase.auth.updateUser({
        data: { hasCompletedOnboarding: true }
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
