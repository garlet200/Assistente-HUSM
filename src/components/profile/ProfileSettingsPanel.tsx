'use client';

/**
 * @file ProfileSettingsPanel.tsx
 * @description Painel modular de configurações do usuário (Informações da Conta,
 * Preferências de IA/Acessibilidade e Sessão), reutilizável em /profile e no layout desktop.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { maskEmailAddress } from '@/lib/utils/formatters';
import { AiPreferencesControl } from './AiPreferencesControl';
import styles from './ProfileSettingsPanel.module.css';

function extractUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function ProfileSettingsPanel() {
  const router = useRouter();
  const { user, logout, updateUserProfile } = useAuth();

  const [nameInput, setNameInput] = useState(user?.name ?? '');
  const [roleInput, setRoleInput] = useState<'student' | 'doctor'>(user?.role ?? 'student');
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  if (!user) return null;

  const initials = extractUserInitials(user.name);
  const maskedEmail = maskEmailAddress(user.email);

  const handleSaveProfile = async (): Promise<void> => {
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setSaveFeedback({ type: 'error', text: 'Informe um nome válido antes de salvar.' });
      return;
    }

    setIsSaving(true);
    setSaveFeedback(null);

    const updated = await updateUserProfile({ name: trimmedName, role: roleInput });
    setSaveFeedback(
      updated
        ? { type: 'success', text: 'Alterações salvas com sucesso.' }
        : { type: 'error', text: 'Não foi possível salvar as alterações.' }
    );
    setIsSaving(false);
  };

  const handleLogout = async (): Promise<void> => {
    await logout();
    router.push('/');
  };

  return (
    <div className={styles.panelWrapper}>
      <Card variant="out">
        <h2 className={styles.sectionHeading}>Informações da Conta</h2>

        <div className={styles.accountFormGroup}>
          <div className={styles.avatarSection}>
            <div className={styles.avatarCircle} aria-label="Foto de perfil">
              {initials || <UserIcon size={32} />}
            </div>
            <Button
              type="button"
              disabled
              className={styles.avatarUploadButton}
              title="Upload de foto disponível em breve"
            >
              <Camera size={14} />
              <span>Alterar foto (em breve)</span>
            </Button>
          </div>

          <div className={styles.nameEmailBlock}>
            <Input
              label="Nome"
              placeholder="Seu nome"
              value={nameInput}
              onChange={(event) => {
                setNameInput(event.target.value);
                setSaveFeedback(null);
              }}
            />
            <p className={styles.maskedEmail}>{maskedEmail}</p>
          </div>

          <div className={styles.roleSection}>
            <span className={styles.roleLabel}>Perfil de Atuação</span>
            <div className={styles.roleButtonsRow}>
              <Button
                type="button"
                variant={roleInput === 'student' ? 'primary' : 'default'}
                onClick={() => {
                  setRoleInput('student');
                  setSaveFeedback(null);
                }}
                style={{ flex: 1 }}
              >
                Estudante
              </Button>
              <Button
                type="button"
                variant={roleInput === 'doctor' ? 'primary' : 'default'}
                onClick={() => {
                  setRoleInput('doctor');
                  setSaveFeedback(null);
                }}
                style={{ flex: 1 }}
              >
                Profissional
              </Button>
            </div>
            <p className={styles.roleNote}>
              Nota: nesta fase de protótipo a troca é livre; futuramente a alteração para o perfil
              Profissional será restrita a pessoal autorizado.
            </p>
          </div>

          {saveFeedback && (
            <p
              className={
                saveFeedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError
              }
            >
              {saveFeedback.text}
            </p>
          )}

          <Button
            type="button"
            variant="primary"
            onClick={() => void handleSaveProfile()}
            disabled={isSaving || !nameInput.trim()}
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </Card>

      <Card variant="out" id="preferencias">
        <h2 className={styles.sectionHeading}>Preferências do Assistente e Acessibilidade</h2>
        <AiPreferencesControl />
      </Card>

      <Card variant="out">
        <Button type="button" className={styles.logoutButton} onClick={() => void handleLogout()}>
          <LogOut size={18} />
          <span>Sair da Conta</span>
        </Button>
      </Card>
    </div>
  );
}
