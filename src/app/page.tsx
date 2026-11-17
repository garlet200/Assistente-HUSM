'use client';

/**
 * @file page.tsx
 * @description Página inicial (/) responsável pela autenticação (Login/Cadastro via Supabase Auth),
 * seleção de perfil (Estudante/Profissional) e tela de aceite obrigatório das Diretrizes Éticas do HUSM.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ETHICAL_GUIDELINE_ITEMS } from '@/lib/constants/session';
import { createClient } from '@/lib/supabase/client';

type UserRoleOption = 'student' | 'doctor';

const PASSWORD_MIN_LENGTH = 8;
const UPPERCASE_LETTER_REGEX = /[A-Z]/;
const LOWERCASE_LETTER_REGEX = /[a-z]/;
const NUMERIC_DIGIT_REGEX = /[0-9]/;
const SPECIAL_SYMBOL_REGEX = /[^A-Za-z0-9]/;

const MAIN_CONTAINER_STYLE: React.CSSProperties = {
  padding: 'var(--spacing-lg)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-lg)',
  flex: 1,
  justifyContent: 'center',
};

function getAuthSubmitButtonLabel(isSubmittingAuth: boolean, isSignUpMode: boolean): string {
  if (isSubmittingAuth) return 'Processando...';
  if (isSignUpMode) return 'Criar Conta';
  return 'Entrar';
}

function validateStrongPassword(rawPassword: string): string | null {
  const isStrong =
    rawPassword.length >= PASSWORD_MIN_LENGTH &&
    UPPERCASE_LETTER_REGEX.test(rawPassword) &&
    LOWERCASE_LETTER_REGEX.test(rawPassword) &&
    NUMERIC_DIGIT_REGEX.test(rawPassword) &&
    SPECIAL_SYMBOL_REGEX.test(rawPassword);

  if (isStrong) return null;
  return 'A senha deve ter no mínimo 8 caracteres, incluindo letra maiúscula, minúscula, número e símbolo.';
}

async function submitSignUpRequest(params: {
  fullName: string;
  email: string;
  password: string;
  selectedRole: UserRoleOption;
}): Promise<string> {
  if (!params.fullName.trim()) return 'Preencha seu nome.';
  const passwordValidationError = validateStrongPassword(params.password);
  if (passwordValidationError) return passwordValidationError;

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: { data: { name: params.fullName, role: params.selectedRole, hasCompletedOnboarding: false } },
  });
  return error ? error.message : 'Conta criada! Verifique seu email ou tente fazer login.';
}

async function submitSignInRequest(email: string, password: string): Promise<string> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? 'Email ou senha inválidos.' : '';
}

function OnboardingTermsView({ userName, onAcceptTerms }: { userName: string; onAcceptTerms: () => void }) {
  return (
    <main style={MAIN_CONTAINER_STYLE}>
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>Diretrizes Éticas do HUSM</h1>
      <Card variant="out">
        <p style={{ marginBottom: 'var(--spacing-md)', lineHeight: '1.6' }}>
          Bem-vindo, {userName}. O MedHUSM é um assistente de raciocínio clínico.
          <strong> Lembre-se:</strong> a inteligência artificial aprimora, mas nunca substitui o julgamento médico.
        </p>
        <ul style={{ paddingLeft: 'var(--spacing-md-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
          {ETHICAL_GUIDELINE_ITEMS.map((guidelineText) => (
            <li key={guidelineText}>{guidelineText}</li>
          ))}
        </ul>
      </Card>
      <Button variant="primary" onClick={onAcceptTerms}>Li e Concordo com os Termos</Button>
    </main>
  );
}

interface SignUpExtraFieldsProps {
  fullName: string;
  selectedRole: UserRoleOption;
  onFullNameChange: (value: string) => void;
  onSelectRole: (role: UserRoleOption) => void;
}

function SignUpExtraFields({ fullName, selectedRole, onFullNameChange, onSelectRole }: SignUpExtraFieldsProps) {
  return (
    <>
      <Input
        label="Seu Nome"
        placeholder="Dr. Silva / Estudante João"
        helperText="Como você prefere ser chamado?"
        value={fullName}
        onChange={(event) => onFullNameChange(event.target.value)}
      />
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
        <Button variant={selectedRole === 'student' ? 'primary' : 'default'} onClick={() => onSelectRole('student')} style={{ flex: 1 }}>
          Estudante
        </Button>
        <Button variant={selectedRole === 'doctor' ? 'primary' : 'default'} onClick={() => onSelectRole('doctor')} style={{ flex: 1 }}>
          Profissional
        </Button>
      </div>
    </>
  );
}

interface AuthCardFormProps {
  isSignUpMode: boolean;
  isSubmittingAuth: boolean;
  fullName: string;
  selectedRole: UserRoleOption;
  email: string;
  password: string;
  authFeedbackMessage: string;
  onFullNameChange: (value: string) => void;
  onSelectRole: (role: UserRoleOption) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onToggleMode: () => void;
}

function AuthCardForm(props: AuthCardFormProps) {
  const cardGuidanceText = props.isSignUpMode
    ? 'Preencha os dados para configurar seu ambiente de estudos.'
    : 'Acesse sua conta e retome seus estudos.';
  const emailHelperText = props.isSignUpMode
    ? 'Utilize preferencialmente seu e-mail institucional ou pessoal ativo.'
    : 'Informe o e-mail utilizado no seu cadastro.';
  const passwordHelperText = props.isSignUpMode
    ? 'Mínimo de 8 caracteres, incluindo letra maiúscula, minúscula, número e símbolo.'
    : 'Digite sua senha de acesso.';

  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        <p style={{ fontSize: 'var(--typography-fontsizes-body)', color: 'var(--color-semantic-text-textlight)', textAlign: 'center', marginBottom: 'var(--spacing-min)' }}>
          {cardGuidanceText}
        </p>
        {props.isSignUpMode && (
          <SignUpExtraFields fullName={props.fullName} selectedRole={props.selectedRole} onFullNameChange={props.onFullNameChange} onSelectRole={props.onSelectRole} />
        )}
        <Input label="Email" placeholder="seu@email.com" type="email" helperText={emailHelperText} value={props.email} onChange={(e) => props.onEmailChange(e.target.value)} />
        <Input label="Senha" placeholder="******" type="password" helperText={passwordHelperText} value={props.password} onChange={(e) => props.onPasswordChange(e.target.value)} />
        {props.authFeedbackMessage && (
          <p style={{ color: 'var(--color-primitive-general-error)', fontSize: 'var(--typography-fontsizes-caption)' }}>
            {props.authFeedbackMessage}
          </p>
        )}
        <Button variant="primary" style={{ marginTop: 'var(--spacing-md)' }} onClick={props.onSubmit} disabled={!props.email || !props.password || props.isSubmittingAuth}>
          {getAuthSubmitButtonLabel(props.isSubmittingAuth, props.isSignUpMode)}
        </Button>
        <Button variant="default" onClick={props.onToggleMode}>
          {props.isSignUpMode ? 'Já tenho uma conta (Entrar)' : 'Não tenho conta (Cadastrar)'}
        </Button>
      </div>
    </Card>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, loading, completeOnboarding } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRoleOption>('student');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authFeedbackMessage, setAuthFeedbackMessage] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  useEffect(() => {
    if (!loading && user?.hasCompletedOnboarding) router.push('/chat');
  }, [user, loading, router]);

  if (loading) return <main style={{ ...MAIN_CONTAINER_STYLE, alignItems: 'center' }}>Carregando...</main>;
  if (user && !user.hasCompletedOnboarding) return <OnboardingTermsView userName={user.name} onAcceptTerms={completeOnboarding} />;
  if (user) return null;

  const handleAuthSubmit = async (): Promise<void> => {
    setIsSubmittingAuth(true);
    setAuthFeedbackMessage('');
    try {
      const feedback = isSignUpMode
        ? await submitSignUpRequest({ fullName, email, password, selectedRole })
        : await submitSignInRequest(email, password);
      if (feedback) setAuthFeedbackMessage(feedback);
    } catch (unexpectedAuthError) {
      console.error('Erro inesperado na autenticação:', unexpectedAuthError);
      setAuthFeedbackMessage('Falha ao conectar com o servidor de autenticação.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  return (
    <main style={MAIN_CONTAINER_STYLE}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-max)' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'var(--typography-fontweights-bold)', color: 'var(--color-semantic-accent-accentprimary)' }}>
          MedHUSM
        </h1>
        <p style={{ color: 'var(--color-semantic-text-textlight)' }}>Assistente Clínico Inteligente</p>
      </div>
      <AuthCardForm
        isSignUpMode={isSignUpMode}
        isSubmittingAuth={isSubmittingAuth}
        fullName={fullName}
        selectedRole={selectedRole}
        email={email}
        password={password}
        authFeedbackMessage={authFeedbackMessage}
        onFullNameChange={setFullName}
        onSelectRole={setSelectedRole}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleAuthSubmit}
        onToggleMode={() => { setIsSignUpMode((prev) => !prev); setAuthFeedbackMessage(''); }}
      />
    </main>
  );
}
