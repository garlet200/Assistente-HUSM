'use client';

/**
 * @file page.tsx
 * @description Página inicial (/) responsável pela autenticação (Login/Cadastro/Recuperação via Supabase Auth),
 * seleção de perfil (Estudante/Profissional) e tela de aceite obrigatório das Diretrizes Éticas do HUSM.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type UserRoleOption } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BrandLogo } from '@/components/common/BrandLogo';
import {
  AuthCardForm,
  type AuthFeedback,
  type AuthFormMode,
} from '@/components/auth/AuthCardForm';
import { ETHICAL_GUIDELINE_ITEMS } from '@/lib/constants/session';
import {
  evaluatePasswordCriteria,
  hasRecoveryUrlSignal,
  isValidEmailFormat,
  isValidUserName,
  USER_NAME_MIN_LENGTH,
} from '@/lib/utils/authValidation';
import { createClient } from '@/lib/supabase/client';

const DUPLICATE_EMAIL_MESSAGE =
  "Este e-mail já está cadastrado. Acesse sua conta pelo modo Entrar ou clique em 'Esqueci minha senha'.";

function isSupabaseDuplicateEmailError(error: { code?: string; message: string }): boolean {
  const normalizedErrorMessage = error.message.toLowerCase();
  return (
    error.code === 'user_already_exists' ||
    normalizedErrorMessage.includes('already registered') ||
    normalizedErrorMessage.includes('already exists')
  );
}

async function submitSignUpRequest(signUpCredentials: {
  fullName: string;
  email: string;
  password: string;
  selectedRole: UserRoleOption;
}): Promise<AuthFeedback> {
  if (!isValidUserName(signUpCredentials.fullName)) {
    return {
      type: 'error',
      text: `Informe seu nome com pelo menos ${USER_NAME_MIN_LENGTH} caracteres.`,
    };
  }
  if (!isValidEmailFormat(signUpCredentials.email)) {
    return { type: 'error', text: 'Formato de e-mail inválido.' };
  }
  if (!evaluatePasswordCriteria(signUpCredentials.password).isAllValid) {
    return { type: 'error', text: 'A senha ainda não atende a todos os requisitos.' };
  }

  const supabase = createClient();
  const { data: signUpResponseData, error } = await supabase.auth.signUp({
    email: signUpCredentials.email.trim(),
    password: signUpCredentials.password,
    options: {
      data: {
        name: signUpCredentials.fullName.trim(),
        role: signUpCredentials.selectedRole,
        hasCompletedOnboarding: false,
      },
    },
  });

  if (error) {
    if (isSupabaseDuplicateEmailError(error)) {
      return { type: 'error', isDuplicateEmail: true, text: DUPLICATE_EMAIL_MESSAGE };
    }
    if (error.message.toLowerCase().includes('rate limit')) {
      return {
        type: 'error',
        text: 'Muitas tentativas em sequência. Aguarde alguns instantes e tente novamente.',
      };
    }
    return { type: 'error', text: error.message };
  }

  const userIdentities = signUpResponseData?.user?.identities;
  if (Array.isArray(userIdentities) && userIdentities.length === 0) {
    return { type: 'error', isDuplicateEmail: true, text: DUPLICATE_EMAIL_MESSAGE };
  }

  return { type: 'success', text: 'Conta criada! Verifique seu e-mail ou tente fazer login.' };
}

async function submitSignInRequest(email: string, password: string): Promise<AuthFeedback | null> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    console.error('Erro ao autenticar usuário no Supabase:', error.message);
    return { type: 'error', text: 'E-mail ou senha inválidos.' };
  }
  return null;
}

async function submitResetPasswordRequest(email: string): Promise<AuthFeedback> {
  if (!isValidEmailFormat(email)) {
    return { type: 'error', text: 'Informe um e-mail válido.' };
  }
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    console.error('Erro ao solicitar recuperação de senha no Supabase:', error.message);
    return { type: 'error', text: error.message };
  }
  return {
    type: 'success',
    text: 'Enviamos um link de recuperação para o seu e-mail. Verifique sua caixa de entrada e spam.',
  };
}

function OnboardingTermsView({
  userName,
  onAcceptTerms,
}: {
  userName: string;
  onAcceptTerms: () => void;
}) {
  return (
    <main className="auth-page-container">
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
        Diretrizes Éticas do HUSM
      </h1>
      <Card variant="out" elevation="flat">
        <p
          style={{
            marginBottom: 'var(--spacing-md)',
            lineHeight: 'var(--typography-lineheights-default)',
          }}
        >
          Bem-vindo, {userName}. O MedHUSM é um assistente de raciocínio clínico.
          <strong> Lembre-se:</strong> a inteligência artificial aprimora, mas nunca substitui o
          julgamento médico.
        </p>
        <ul
          style={{
            paddingLeft: 'var(--spacing-md-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-sm)',
            marginBottom: 'var(--spacing-lg)',
          }}
        >
          {ETHICAL_GUIDELINE_ITEMS.map((guidelineText) => (
            <li key={guidelineText}>{guidelineText}</li>
          ))}
        </ul>
      </Card>
      <Button variant="primary" onClick={onAcceptTerms}>
        Li e Concordo com os Termos
      </Button>
    </main>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, loading, isPasswordRecoveryFlow, completeOnboarding } = useAuth();

  const [mode, setMode] = useState<AuthFormMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRoleOption>('student');
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (isPasswordRecoveryFlow || hasRecoveryUrlSignal()) {
      router.replace('/reset-password');
      return;
    }

    if (user?.hasCompletedOnboarding) router.push('/chat');
  }, [user, loading, isPasswordRecoveryFlow, router]);

  if (loading || isPasswordRecoveryFlow) {
    return (
      <main className="auth-page-container" style={{ alignItems: 'center' }}>
        Carregando...
      </main>
    );
  }

  if (user && !user.hasCompletedOnboarding) {
    return (
      <OnboardingTermsView
        userName={user.name}
        onAcceptTerms={() => void completeOnboarding()}
      />
    );
  }

  if (user) return null;

  const handleAuthSubmit = async (): Promise<void> => {
    setIsSubmittingAuth(true);
    setFeedback(null);
    try {
      let authOperationFeedback: AuthFeedback | null = null;
      if (mode === 'signup') {
        authOperationFeedback = await submitSignUpRequest({
          fullName,
          email,
          password,
          selectedRole,
        });
      } else if (mode === 'forgot-password') {
        authOperationFeedback = await submitResetPasswordRequest(email);
      } else {
        authOperationFeedback = await submitSignInRequest(email, password);
      }
      if (authOperationFeedback) setFeedback(authOperationFeedback);
    } catch (unexpectedAuthError) {
      console.error('Erro inesperado na autenticação:', unexpectedAuthError);
      setFeedback({ type: 'error', text: 'Falha ao conectar com o servidor de autenticação.' });
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  return (
    <main className="auth-page-container">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          textAlign: 'center',
          marginBottom: 'var(--spacing-max)',
        }}
      >
        <h1
          data-dev-mode-trigger="true"
          style={{
            margin: 0,
            display: 'inline-flex',
            justifyContent: 'center',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          <BrandLogo size="lg" />
        </h1>
        <p style={{ margin: 0, color: 'var(--color-semantic-text-textlight)' }}>
          Assistente Clínico Inteligente
        </p>
      </div>
      <AuthCardForm
        mode={mode}
        isSubmittingAuth={isSubmittingAuth}
        fullName={fullName}
        selectedRole={selectedRole}
        email={email}
        password={password}
        feedback={feedback}
        onFullNameChange={setFullName}
        onSelectRole={setSelectedRole}
        onEmailChange={(nextEmail) => {
          setEmail(nextEmail);
          if (feedback?.isDuplicateEmail) setFeedback(null);
        }}
        onPasswordChange={setPassword}
        onSubmit={() => void handleAuthSubmit()}
        onChangeMode={(nextMode) => {
          setMode(nextMode);
          setFeedback(null);
        }}
      />
    </main>
  );
}
