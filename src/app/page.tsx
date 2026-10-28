'use client';

/**
 * @file page.tsx
 * @description Página inicial (/) responsável pela autenticação (Login/Cadastro via Supabase Auth),
 * seleção de perfil (Estudante/Profissional) e tela de aceite obrigatório das Diretrizes Éticas do HUSM.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ETHICAL_GUIDELINE_ITEMS } from '@/lib/constants/session';
import { createClient } from '@/lib/supabase/client';

type UserRoleOption = 'student' | 'doctor';

interface OnboardingTermsViewProps {
  userName: string;
  onAcceptTerms: () => void;
}

function getAuthSubmitButtonLabel(isSubmittingAuth: boolean, isSignUpMode: boolean): string {
  if (isSubmittingAuth) return 'Processando...';
  if (isSignUpMode) return 'Criar Conta';
  return 'Entrar';
}

function OnboardingTermsView({ userName, onAcceptTerms }: OnboardingTermsViewProps) {
  return (
    <main
      style={{
        padding: 'var(--spacing-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-lg)',
        flex: 1,
        justifyContent: 'center',
      }}
    >
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
        Diretrizes Éticas do HUSM
      </h1>
      <Card variant="out">
        <p style={{ marginBottom: 'var(--spacing-md)', lineHeight: '1.6' }}>
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

interface SignUpExtraFieldsProps {
  fullName: string;
  selectedRole: UserRoleOption;
  onFullNameChange: (value: string) => void;
  onSelectRole: (role: UserRoleOption) => void;
}

function SignUpExtraFields({
  fullName,
  selectedRole,
  onFullNameChange,
  onSelectRole,
}: SignUpExtraFieldsProps) {
  return (
    <>
      <Input
        label="Seu Nome"
        placeholder="Dr. Silva / Estudante João"
        value={fullName}
        onChange={(event) => onFullNameChange(event.target.value)}
      />
      <div
        style={{
          display: 'flex',
          gap: 'var(--spacing-sm)',
          marginTop: 'var(--spacing-sm)',
          marginBottom: 'var(--spacing-sm)',
        }}
      >
        <Button
          variant={selectedRole === 'student' ? 'primary' : 'default'}
          onClick={() => onSelectRole('student')}
          style={{ flex: 1 }}
        >
          Estudante
        </Button>
        <Button
          variant={selectedRole === 'doctor' ? 'primary' : 'default'}
          onClick={() => onSelectRole('doctor')}
          style={{ flex: 1 }}
        >
          Profissional
        </Button>
      </div>
    </>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, loading, completeOnboarding } = useAuth();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRoleOption>('student');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authFeedbackMessage, setAuthFeedbackMessage] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  useEffect(() => {
    if (!loading && user?.hasCompletedOnboarding) {
      router.push('/chat');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main
        style={{
          padding: 'var(--spacing-lg)',
          display: 'flex',
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        Carregando...
      </main>
    );
  }

  if (user && !user.hasCompletedOnboarding) {
    return <OnboardingTermsView userName={user.name} onAcceptTerms={completeOnboarding} />;
  }

  if (user) return null;

  const performSignUp = async (): Promise<string> => {
    if (!fullName.trim()) return 'Preencha seu nome.';

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: fullName,
          role: selectedRole,
          hasCompletedOnboarding: false,
        },
      },
    });

    if (error) return error.message;
    return 'Conta criada! Verifique seu email ou tente fazer login.';
  };

  const performSignIn = async (): Promise<string> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? 'Email ou senha inválidos.' : '';
  };

  const handleAuthSubmit = async (): Promise<void> => {
    setIsSubmittingAuth(true);
    setAuthFeedbackMessage('');

    try {
      const feedback = isSignUpMode ? await performSignUp() : await performSignIn();
      if (feedback) setAuthFeedbackMessage(feedback);
    } catch (unexpectedAuthError) {
      console.error('Erro inesperado na autenticação:', unexpectedAuthError);
      setAuthFeedbackMessage('Falha ao conectar com o servidor de autenticação.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const toggleAuthMode = (): void => {
    setIsSignUpMode((previousMode) => !previousMode);
    setAuthFeedbackMessage('');
  };

  return (
    <main
      style={{
        padding: 'var(--spacing-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-lg)',
        flex: 1,
        justifyContent: 'center',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-max)' }}>
        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: 'var(--typography-fontweights-bold)',
            color: 'var(--color-semantic-accent-accentprimary)',
          }}
        >
          MedHUSM
        </h1>
        <p style={{ color: 'var(--color-semantic-text-textlight)' }}>
          Assistente Clínico Inteligente
        </p>
      </div>

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {isSignUpMode && (
            <SignUpExtraFields
              fullName={fullName}
              selectedRole={selectedRole}
              onFullNameChange={setFullName}
              onSelectRole={setSelectedRole}
            />
          )}

          <Input
            label="Email"
            placeholder="seu@email.com"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <Input
            label="Senha"
            placeholder="******"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {authFeedbackMessage && (
            <p style={{ color: 'var(--color-primitive-general-error)', fontSize: '0.875rem' }}>
              {authFeedbackMessage}
            </p>
          )}

          <Button
            variant="primary"
            style={{ marginTop: 'var(--spacing-md)' }}
            onClick={handleAuthSubmit}
            disabled={!email || !password || isSubmittingAuth}
          >
            {getAuthSubmitButtonLabel(isSubmittingAuth, isSignUpMode)}
          </Button>

          <Button variant="default" onClick={toggleAuthMode}>
            {isSignUpMode ? 'Já tenho uma conta (Entrar)' : 'Não tenho conta (Cadastrar)'}
          </Button>
        </div>
      </Card>
    </main>
  );
}
