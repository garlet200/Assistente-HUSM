'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const router = useRouter();
  const { user, loading, completeOnboarding } = useAuth();
  const supabase = createClient();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'doctor'>('student');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.hasCompletedOnboarding) {
        router.push('/chat');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return <main style={{ padding: 'var(--spacing-lg)', display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>Carregando...</main>;
  }

  if (user && !user.hasCompletedOnboarding) {
    return (
      <main style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', flex: 1, justifyContent: 'center' }}>
        <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>Diretrizes Éticas do HUSM</h1>
        <Card variant="out">
          <p style={{ marginBottom: 'var(--spacing-md)', lineHeight: '1.6' }}>
            Bem-vindo, {user.name}. O MedHUSM é um assistente de raciocínio clínico. 
            <strong> Lembre-se:</strong> a inteligência artificial aprimora, mas nunca substitui o julgamento médico.
          </p>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
            <li>Não insira dados identificáveis (nomes, CPFs) de pacientes reais.</li>
            <li>Todas as respostas geradas devem ser verificadas usando o RAG ou literatura oficial.</li>
            <li>O sistema monitora casos para fins educacionais e de auditoria.</li>
          </ul>
        </Card>
        <Button variant="primary" onClick={() => {
          completeOnboarding();
        }}>
          Li e Concordo com os Termos
        </Button>
      </main>
    );
  }

  if (user) {
    return null; // Will redirect in useEffect
  }

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError('');
    
    if (isSignUp) {
      if (!name) {
        setAuthError('Preencha seu nome.');
        setAuthLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
            hasCompletedOnboarding: false
          }
        }
      });
      if (error) setAuthError(error.message);
      else setAuthError('Conta criada! Verifique seu email ou tente fazer login.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) setAuthError('Email ou senha inválidos.');
    }
    
    setAuthLoading(false);
  };

  return (
    <main style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', flex: 1, justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-max)' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-semantic-accent-accentprimary)' }}>MedHUSM</h1>
        <p style={{ color: 'var(--color-semantic-text-textlight)' }}>Assistente Clínico Inteligente</p>
      </div>

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {isSignUp && (
            <>
              <Input 
                label="Seu Nome" 
                placeholder="Dr. Silva / Estudante João"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                <Button 
                  variant={role === 'student' ? 'primary' : 'default'} 
                  onClick={() => setRole('student')}
                  style={{ flex: 1 }}
                >
                  Estudante
                </Button>
                <Button 
                  variant={role === 'doctor' ? 'primary' : 'default'} 
                  onClick={() => setRole('doctor')}
                  style={{ flex: 1 }}
                >
                  Profissional
                </Button>
              </div>
            </>
          )}
          
          <Input 
            label="Email" 
            placeholder="seu@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input 
            label="Senha" 
            placeholder="******"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {authError && (
            <p style={{ color: 'var(--color-primitive-general-error)', fontSize: '0.875rem' }}>
              {authError}
            </p>
          )}

          <Button 
            variant="primary" 
            style={{ marginTop: 'var(--spacing-md)' }}
            onClick={handleAuth}
            disabled={!email || !password || authLoading}
          >
            {authLoading ? 'Processando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
          </Button>

          <Button
            variant="default"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setAuthError('');
            }}
          >
            {isSignUp ? 'Já tenho uma conta (Entrar)' : 'Não tenho conta (Cadastrar)'}
          </Button>
        </div>
      </Card>
    </main>
  );
}
