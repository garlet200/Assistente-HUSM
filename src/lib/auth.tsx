'use client';

/**
 * @file auth.tsx
 * @description Contexto global de autenticação (AuthProvider e hook useAuth) integrado ao
 * Supabase Auth, gerenciando estado de sessão, perfil, preferências de IA e onboarding ético.
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { SESSION_STORAGE_KEYS } from '@/lib/constants/session';
import { hasRecoveryUrlSignal } from '@/lib/utils/authValidation';

export type UserRoleOption = 'student' | 'doctor';

const AI_SCALE_MIN_LEVEL = 1;
const AI_SCALE_MAX_LEVEL = 5;
const AI_SCALE_DEFAULT_LEVEL = 3;

export interface AuthenticatedUser {
  id: string;
  name: string;
  email?: string;
  role: UserRoleOption;
  hasCompletedOnboarding: boolean;
  aiLanguageLevel: number;
  aiDetailLevel: number;
  highContrast: boolean;
  avatarUrl?: string;
}

export interface UserProfileUpdates {
  name?: string;
  role?: UserRoleOption;
  aiLanguageLevel?: number;
  aiDetailLevel?: number;
}

interface AuthContextType {
  user: AuthenticatedUser | null;
  loading: boolean;
  isPasswordRecoveryFlow: boolean;
  clearPasswordRecoveryFlow: () => void;
  setUser: (user: AuthenticatedUser | null) => void;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  updateUserProfile: (updates: UserProfileUpdates) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseBoundedScaleLevel(rawValue: unknown, fallbackLevel = AI_SCALE_DEFAULT_LEVEL): number {
  const numericValue = Number(rawValue);
  if (
    Number.isInteger(numericValue) &&
    numericValue >= AI_SCALE_MIN_LEVEL &&
    numericValue <= AI_SCALE_MAX_LEVEL
  ) {
    return numericValue;
  }
  return fallbackLevel;
}

function mapSupabaseUserToAuthenticatedUser(supabaseUser: SupabaseUser): AuthenticatedUser {
  const metadata = supabaseUser.user_metadata || {};
  const fallbackName = supabaseUser.email?.split('@')[0] || 'User';

  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: metadata.name || fallbackName,
    role: metadata.role || 'student',
    hasCompletedOnboarding: Boolean(metadata.hasCompletedOnboarding),
    aiLanguageLevel: parseBoundedScaleLevel(metadata.aiLanguageLevel),
    aiDetailLevel: parseBoundedScaleLevel(metadata.aiDetailLevel),
    highContrast: Boolean(metadata.highContrast),
    avatarUrl: typeof metadata.avatarUrl === 'string' ? metadata.avatarUrl : undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecoveryFlow, setIsPasswordRecoveryFlow] = useState(hasRecoveryUrlSignal);
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecoveryFlow(true);
        if (typeof window !== 'undefined' && window.location.pathname === '/') {
          router.replace('/reset-password');
        }
      }
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

  const updateUserProfile = async (updates: UserProfileUpdates): Promise<boolean> => {
    if (!user) return false;

    const previousUserSnapshot = user;
    setUser((previousUser) => (previousUser ? { ...previousUser, ...updates } : null));

    try {
      const { error } = await supabase.auth.updateUser({ data: updates });
      if (error) {
        console.error('Erro ao atualizar perfil do usuário no Supabase:', error.message);
        setUser(previousUserSnapshot);
        return false;
      }
      return true;
    } catch (unexpectedError) {
      console.error('Falha inesperada ao atualizar perfil do usuário:', unexpectedError);
      setUser(previousUserSnapshot);
      return false;
    }
  };

  const completeOnboarding = async (): Promise<void> => {
    if (!user) return;

    const previousUserSnapshot = user;
    setUser({ ...user, hasCompletedOnboarding: true });

    try {
      const { error } = await supabase.auth.updateUser({
        data: { hasCompletedOnboarding: true },
      });
      if (error) {
        console.error('Erro ao atualizar status de onboarding no Supabase:', error.message);
        setUser(previousUserSnapshot);
      }
    } catch (unexpectedError) {
      console.error('Falha inesperada ao atualizar onboarding:', unexpectedError);
      setUser(previousUserSnapshot);
    }
  };

  const clearPasswordRecoveryFlow = (): void => {
    setIsPasswordRecoveryFlow(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isPasswordRecoveryFlow,
        clearPasswordRecoveryFlow,
        setUser,
        logout,
        completeOnboarding,
        updateUserProfile,
      }}
    >
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
