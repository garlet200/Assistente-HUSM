'use client';

/**
 * @file PasswordUpdateCard.tsx
 * @description Card modular de alteração/redefinição de senha via Supabase Auth com validação
 * em tempo real, checklist de critérios e confirmação de igualdade entre os campos.
 */

import { type FormEvent, useState } from 'react';
import { Card, type CardElevation } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, type InputValidationState } from '@/components/ui/Input';
import { PasswordCriteriaChecklist } from '@/components/auth/PasswordCriteriaChecklist';
import { evaluatePasswordCriteria } from '@/lib/utils/authValidation';
import { createClient } from '@/lib/supabase/client';
import styles from './ProfileSettingsPanel.module.css';

interface PasswordUpdateCardProps {
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  cardElevation?: CardElevation;
  onSuccess?: () => void;
}

function getNewPasswordValidationState(
  newPassword: string,
  isAllCriteriaValid: boolean
): InputValidationState {
  if (!newPassword) return 'neutral';
  return isAllCriteriaValid ? 'valid' : 'invalid';
}

function getConfirmPasswordValidationState(
  confirmPassword: string,
  doPasswordsMatch: boolean
): InputValidationState {
  if (!confirmPassword) return 'neutral';
  return doPasswordsMatch ? 'valid' : 'invalid';
}

function getConfirmPasswordHelperText(
  confirmPasswordState: InputValidationState
): string | undefined {
  if (confirmPasswordState === 'invalid') return 'As senhas não coincidem.';
  if (confirmPasswordState === 'valid') return 'As senhas coincidem.';
  return undefined;
}

export function PasswordUpdateCard({
  title = 'Segurança e Senha',
  subtitle,
  submitLabel = 'Atualizar Senha',
  cardElevation = 'large',
  onSuccess,
}: PasswordUpdateCardProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const criteria = evaluatePasswordCriteria(newPassword);
  const doPasswordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const newPasswordState = getNewPasswordValidationState(newPassword, criteria.isAllValid);
  const confirmPasswordState = getConfirmPasswordValidationState(confirmPassword, doPasswordsMatch);
  const confirmPasswordHelperText = getConfirmPasswordHelperText(confirmPasswordState);

  const canSubmit = criteria.isAllValid && doPasswordsMatch && !isSaving;

  const handleUpdatePassword = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSaving(true);
    setFeedback(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        console.error('Erro ao atualizar senha no Supabase:', error.message);
        setFeedback({ type: 'error', text: error.message });
        return;
      }

      setFeedback({ type: 'success', text: 'Senha atualizada com sucesso.' });
      setNewPassword('');
      setConfirmPassword('');
      onSuccess?.();
    } catch (unexpectedError) {
      console.error('Erro ao atualizar senha:', unexpectedError);
      setFeedback({ type: 'error', text: 'Não foi possível atualizar a senha.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card variant="out" elevation={cardElevation}>
      <h2 className={styles.sectionHeading}>{title}</h2>
      {subtitle && <p className={styles.roleNote}>{subtitle}</p>}

      <form onSubmit={(event) => void handleUpdatePassword(event)} className={styles.accountFormGroup}>
        <Input
          label="Nova Senha"
          placeholder="******"
          type="password"
          validationState={newPasswordState}
          value={newPassword}
          onChange={(event) => {
            setNewPassword(event.target.value);
            setFeedback(null);
          }}
        />

        <PasswordCriteriaChecklist password={newPassword} />

        <Input
          label="Confirmar Nova Senha"
          placeholder="******"
          type="password"
          validationState={confirmPasswordState}
          helperText={confirmPasswordHelperText}
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setFeedback(null);
          }}
        />

        {feedback && (
          <p
            role={feedback.type === 'error' ? 'alert' : 'status'}
            className={feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError}
          >
            {feedback.text}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={!canSubmit}>
          {isSaving ? 'Salvando...' : submitLabel}
        </Button>
      </form>
    </Card>
  );
}
