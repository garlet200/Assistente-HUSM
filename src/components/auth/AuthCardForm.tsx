'use client';

/**
 * @file AuthCardForm.tsx
 * @description Formulário modular de autenticação (Login, Cadastro e Recuperação de Senha)
 * com validação visual em tempo real e checklist de critérios de senha.
 */

import type { CSSProperties } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, type InputValidationState } from '@/components/ui/Input';
import { UserRoleSelector } from '@/components/common/UserRoleSelector';
import type { UserRoleOption } from '@/lib/auth';
import {
  evaluatePasswordCriteria,
  isValidEmailFormat,
  isValidUserName,
  USER_NAME_MIN_LENGTH,
} from '@/lib/utils/authValidation';
import { PasswordCriteriaChecklist } from './PasswordCriteriaChecklist';

export type { UserRoleOption };
export type AuthFormMode = 'signin' | 'signup' | 'forgot-password';

export interface AuthFeedback {
  type: 'error' | 'success';
  text: string;
  isDuplicateEmail?: boolean;
}

interface AuthCardFormProps {
  mode: AuthFormMode;
  isSubmittingAuth: boolean;
  fullName: string;
  selectedRole: UserRoleOption;
  email: string;
  password: string;
  feedback: AuthFeedback | null;
  onFullNameChange: (value: string) => void;
  onSelectRole: (role: UserRoleOption) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onChangeMode: (nextMode: AuthFormMode) => void;
}

function getEmailValidationState(email: string): InputValidationState {
  if (!email.trim()) return 'neutral';
  return isValidEmailFormat(email) ? 'valid' : 'invalid';
}

function getNameValidationState(fullName: string): InputValidationState {
  if (!fullName) return 'neutral';
  return isValidUserName(fullName) ? 'valid' : 'invalid';
}

function getEmailHelperText(
  mode: AuthFormMode,
  emailState: InputValidationState,
  isDuplicateEmail: boolean
): string {
  if (isDuplicateEmail) return 'Este e-mail já está em uso por outra conta.';
  if (emailState === 'invalid') return 'Formato de e-mail inválido';
  if (mode === 'signup') return 'Utilize preferencialmente seu e-mail institucional ou pessoal ativo.';
  return 'Informe o e-mail utilizado no seu cadastro.';
}

function getPasswordValidationState(
  mode: AuthFormMode,
  password: string,
  isAllCriteriaValid: boolean
): InputValidationState {
  if (!password) return 'neutral';
  if (mode !== 'signup') return 'valid';
  return isAllCriteriaValid ? 'valid' : 'invalid';
}

function getModeGuidanceText(mode: AuthFormMode): string {
  if (mode === 'signup') return 'Preencha os dados para configurar seu ambiente de estudos.';
  if (mode === 'forgot-password') return 'Informe seu e-mail para receber o link de redefinição de senha.';
  return 'Acesse sua conta e retome seus estudos.';
}

function getSubmitLabel(mode: AuthFormMode, isSubmitting: boolean): string {
  if (isSubmitting) return 'Processando...';
  if (mode === 'signup') return 'Criar Conta';
  if (mode === 'forgot-password') return 'Enviar Link de Recuperação';
  return 'Entrar';
}

function getSecondaryModeToggleLabel(mode: AuthFormMode): string {
  if (mode === 'forgot-password') return 'Voltar para o Login';
  if (mode === 'signup') return 'Já tenho uma conta (Entrar)';
  return 'Não tenho conta (Cadastrar)';
}

function SignUpExtraFields({
  fullName,
  selectedRole,
  onFullNameChange,
  onSelectRole,
}: Pick<AuthCardFormProps, 'fullName' | 'selectedRole' | 'onFullNameChange' | 'onSelectRole'>) {
  const nameState = getNameValidationState(fullName);
  const nameHelperText =
    nameState === 'invalid'
      ? `Informe pelo menos ${USER_NAME_MIN_LENGTH} caracteres.`
      : 'Como você prefere ser chamado?';

  return (
    <>
      <Input
        label="Seu Nome"
        placeholder="Dr. Silva / Estudante João"
        helperText={nameHelperText}
        validationState={nameState}
        value={fullName}
        onChange={(event) => onFullNameChange(event.target.value)}
      />
      <UserRoleSelector
        selectedRole={selectedRole}
        onSelectRole={onSelectRole}
        buttonStyle={{ flex: 1 }}
      />
    </>
  );
}

const LINK_ACTION_STYLE: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--color-semantic-accent-accentprimary)',
  fontSize: 'var(--typography-fontsizes-caption)',
  fontWeight: 'var(--typography-fontweights-semibold)',
  borderRadius: 'var(--radius-radius-smallest)',
  cursor: 'pointer',
  padding: 0,
};

function DuplicateEmailActions({ onChangeMode }: { onChangeMode: (nextMode: AuthFormMode) => void }) {
  return (
    <div style={{ display: 'flex', marginTop: 'var(--spacing-sm)' }}>
      <button type="button" onClick={() => onChangeMode('forgot-password')} style={LINK_ACTION_STYLE}>
        Esqueci minha senha
      </button>
    </div>
  );
}

export function AuthCardForm(props: AuthCardFormProps) {
  const { mode, email, password, fullName, isSubmittingAuth, feedback } = props;
  const isDuplicateEmail = mode === 'signup' && Boolean(feedback?.isDuplicateEmail);
  const emailState: InputValidationState = isDuplicateEmail ? 'invalid' : getEmailValidationState(email);
  const isEmailValid = getEmailValidationState(email) === 'valid';
  const passwordCriteria = evaluatePasswordCriteria(password);

  const emailHelperText = getEmailHelperText(mode, emailState, isDuplicateEmail);
  const passwordState = getPasswordValidationState(mode, password, passwordCriteria.isAllValid);

  const isSubmitDisabled =
    isSubmittingAuth ||
    !isEmailValid ||
    (mode === 'signin' && password.length === 0) ||
    (mode === 'signup' && (!isValidUserName(fullName) || !passwordCriteria.isAllValid));

  return (
    <Card elevation="flat">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!isSubmitDisabled) props.onSubmit();
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}
      >
        <p style={{ fontSize: 'var(--typography-fontsizes-body)', color: 'var(--color-semantic-text-textlight)', textAlign: 'center', marginBottom: 'var(--spacing-min)' }}>
          {getModeGuidanceText(mode)}
        </p>

        {mode === 'signup' && (
          <SignUpExtraFields
            fullName={props.fullName}
            selectedRole={props.selectedRole}
            onFullNameChange={props.onFullNameChange}
            onSelectRole={props.onSelectRole}
          />
        )}

        <Input
          label="Email"
          placeholder="seu@email.com"
          type="email"
          helperText={emailHelperText}
          validationState={emailState}
          value={email}
          onChange={(event) => props.onEmailChange(event.target.value)}
        />

        {mode !== 'forgot-password' && (
          <>
            <Input
              label="Senha"
              placeholder="******"
              type="password"
              helperText={mode === 'signin' ? 'Digite sua senha de acesso.' : undefined}
              validationState={passwordState}
              value={password}
              onChange={(event) => props.onPasswordChange(event.target.value)}
            />
            {mode === 'signin' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'calc(-1 * var(--spacing-sm))' }}>
                <button
                  type="button"
                  onClick={() => props.onChangeMode('forgot-password')}
                  style={{ ...LINK_ACTION_STYLE, padding: 'var(--spacing-min) 0' }}
                >
                  Esqueci minha senha
                </button>
              </div>
            )}
            {mode === 'signup' && <PasswordCriteriaChecklist password={password} />}
          </>
        )}

        {feedback && (
          <div role={feedback.type === 'error' ? 'alert' : 'status'}>
            <p
              style={{
                color:
                  feedback.type === 'success'
                    ? 'var(--color-primitive-general-succes-3)'
                    : 'var(--color-primitive-general-error)',
                fontSize: 'var(--typography-fontsizes-caption)',
                lineHeight: 'var(--typography-lineheights-body-caption)',
              }}
            >
              {feedback.text}
            </p>
            {isDuplicateEmail && <DuplicateEmailActions onChangeMode={props.onChangeMode} />}
          </div>
        )}

        <Button type="submit" variant="primary" style={{ marginTop: 'var(--spacing-sm)' }} disabled={isSubmitDisabled}>
          {getSubmitLabel(mode, isSubmittingAuth)}
        </Button>

        <Button
          type="button"
          variant="default"
          onClick={() => props.onChangeMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {getSecondaryModeToggleLabel(mode)}
        </Button>
      </form>
    </Card>
  );
}
