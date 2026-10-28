'use client';

/**
 * @file auth.tsx
 * @description Contexto global de autenticação (AuthProvider e hook useAuth) integrado ao
 * Supabase Auth, gerenciando estado de sessão, perfil (student/doctor) e aceite de onboarding ético.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { SESSION_STORAGE_KEYS } from '@/lib/constants/session';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email?: string;
  role: 'student' | 'doctor';
  hasCompletedOnboarding: boolean;
}

interface AuthContextType {
  user: AuthenticatedUser | null;
  loading: boolean;
  setUser: (user: AuthenticatedUser | null) => void;
  logout: () => Promise<void>;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSupabaseUserToAuthenticatedUser(supabaseUser: SupabaseUser): AuthenticatedUser {
  const metadata = supabaseUser.user_metadata || {};
  const fallbackName = supabaseUser.email?.split('@')[0] || 'User';

  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: metadata.name || fallbackName,
    role: metadata.role || 'student',
    hasCompletedOnboarding: Boolean(metadata.hasCompletedOnboarding),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const syncActiveSession = async (): Promise<void> => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Erro ao recuperar sessão de autenticação no Supabase:', sessionError);
        }

        if (session?.user) {
          setUser(mapSupabaseUserToAuthenticatedUser(session.user));
        }
      } catch (unexpectedSessionError) {
        console.error('Falha inesperada ao sincronizar sessão ativa:', unexpectedSessionError);
      } finally {
        setLoading(false);
      }
    };

    void syncActiveSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(mapSupabaseUserToAuthenticatedUser(session.user));
      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async (): Promise<void> => {
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('Erro ao encerrar sessão no Supabase:', signOutError);
      }
    } catch (unexpectedSignOutError) {
      console.error('Falha inesperada ao encerrar sessão:', unexpectedSignOutError);
    } finally {
      setUser(null);
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.ACTIVE_CHAT_ID);
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.ACTIVE_STUDY_ID);
    }
  };

  const completeOnboarding = async (): Promise<void> => {
    if (!user) return;

    setUser({ ...user, hasCompletedOnboarding: true });

    try {
      const { error } = await supabase.auth.updateUser({
        data: { hasCompletedOnboarding: true },
      });

      if (error) {
        console.error('Erro ao atualizar status de onboarding no Supabase:', error.message);
      }
    } catch (unexpectedError) {
      console.error('Falha inesperada ao atualizar onboarding:', unexpectedError);
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
