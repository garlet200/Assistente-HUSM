'use client';

/**
 * @file UserRoleSelector.tsx
 * @description Seletor reutilizável de perfil de atuação ('Estudante' | 'Profissional'),
 * compartilhado entre o formulário de cadastro (AuthCardForm) e as configurações de perfil.
 */

import type { CSSProperties } from 'react';
import { Button } from '@/components/ui/Button';
import type { UserRoleOption } from '@/lib/auth';

const USER_ROLE_OPTIONS: ReadonlyArray<{ value: UserRoleOption; label: string }> = [
  { value: 'student', label: 'Estudante' },
  { value: 'doctor', label: 'Profissional' },
];

interface UserRoleSelectorProps {
  selectedRole: UserRoleOption;
  onSelectRole: (role: UserRoleOption) => void;
  className?: string;
  buttonClassName?: string;
  buttonStyle?: CSSProperties;
}

export function UserRoleSelector({
  selectedRole,
  onSelectRole,
  className,
  buttonClassName,
  buttonStyle,
}: UserRoleSelectorProps) {
  return (
    <div
      className={className}
      style={className ? undefined : { display: 'flex', gap: 'var(--spacing-sm)' }}
      role="group"
      aria-label="Perfil de Atuação"
    >
      {USER_ROLE_OPTIONS.map(({ value, label }) => (
        <Button
          key={value}
          type="button"
          variant={selectedRole === value ? 'primary' : 'default'}
          onClick={() => onSelectRole(value)}
          className={buttonClassName}
          style={buttonStyle}
          aria-pressed={selectedRole === value}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
