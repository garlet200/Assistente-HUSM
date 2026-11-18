'use client';

/**
 * @file page.tsx
 * @description Página de redefinição de senha (/reset-password) com suporte idempotente a
 * token_hash (verifyOtp), code (PKCE) e sessão de recuperação ativa no Supabase Auth.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PasswordUpdateCard } from '@/components/profile/PasswordUpdateCard';
import { createClient } from '@/lib/supabase/client';

const INVALID_LINK_MESSAGE =
  'Link de recuperação inválido ou expirado. Solicite um novo link.';
const RECOVERY_REDIRECT_DELAY_MS = 1200;

function clearRecoveryQueryFromUrl(): void {
  window.history.replaceState({}, '', '/reset-password');
}

async function hasActiveRecoveryUser(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error('Erro ao verificar sessão ativa de recuperação no Supabase:', error.message);
    return false;
  }

  return Boolean(session?.user);
}

async function resolveRecoverySession(): Promise<string | null> {
  const supabase = createClient();
  const urlSearchParams = new URLSearchParams(window.location.search);
  const tokenHash = urlSearchParams.get('token_hash');
  const recoveryTypeParam = urlSearchParams.get('type');
  const pkceAuthCode = urlSearchParams.get('code');

  if (tokenHash && recoveryTypeParam === 'recovery') {
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    });
    clearRecoveryQueryFromUrl();

    if (otpError) {
      console.error('Erro ao validar token_hash de recuperação (verifyOtp):', otpError.message);
    }
    if (!otpError || (await hasActiveRecoveryUser())) return null;
    return INVALID_LINK_MESSAGE;
  }

  if (pkceAuthCode) {
    if (await hasActiveRecoveryUser()) {
      clearRecoveryQueryFromUrl();
      return null;
    }

    const { error: pkceError } = await supabase.auth.exchangeCodeForSession(pkceAuthCode);
    clearRecoveryQueryFromUrl();

    if (pkceError) {
      console.error('Erro ao trocar código PKCE por sessão de recuperação:', pkceError.message);
    }
    if (!pkceError || (await hasActiveRecoveryUser())) return null;
    return INVALID_LINK_MESSAGE;
  }

  if (await hasActiveRecoveryUser()) return null;
  return 'Sessão de recuperação não encontrada ou expirada. Solicite um novo link.';
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const { clearPasswordRecoveryFlow } = useAuth();
  const hasAttemptedValidationRef = useRef(false);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isValidatingSession, setIsValidatingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (hasAttemptedValidationRef.current) return;
    hasAttemptedValidationRef.current = true;

    const validateRecovery = async (): Promise<void> => {
      try {
        const errorMessage = await resolveRecoverySession();
        if (errorMessage) setSessionError(errorMessage);
      } catch (unexpectedError) {
        console.error('Erro ao validar sessão de recuperação:', unexpectedError);
        if (!(await hasActiveRecoveryUser())) {
          setSessionError('Falha ao validar o link de recuperação.');
        }
      } finally {
        setIsValidatingSession(false);
      }
    };

    void validateRecovery();
  }, []);

  if (isValidatingSession) {
    return (
      <main className="auth-page-container" style={{ alignItems: 'center' }}>
        Validando link...
      </main>
    );
  }

  if (sessionError) {
    return (
      <main className="auth-page-container">
        <Card variant="out">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <p role="alert" style={{ color: 'var(--color-primitive-general-error)' }}>
              {sessionError}
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                clearPasswordRecoveryFlow();
                router.replace('/');
              }}
            >
              Voltar para o Login
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="auth-page-container">
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontSize: 'var(--typography-fontsizes-heading)',
            fontWeight: 'var(--typography-fontweights-bold)',
            color: 'var(--color-semantic-accent-accentprimary)',
          }}
        >
          MedHUSM
        </h1>
        <p style={{ color: 'var(--color-semantic-text-textlight)' }}>Recuperação de Conta</p>
      </div>

      <PasswordUpdateCard
        title="Redefinir Senha"
        subtitle="Crie uma nova senha segura para acessar sua conta."
        submitLabel="Salvar Nova Senha"
        onSuccess={() => {
          clearPasswordRecoveryFlow();
          redirectTimeoutRef.current = setTimeout(
            () => router.replace('/chat'),
            RECOVERY_REDIRECT_DELAY_MS
          );
        }}
      />
    </main>
  );
}
