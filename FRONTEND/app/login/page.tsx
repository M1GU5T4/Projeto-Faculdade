'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister]       = useState(false);
  const [name, setName]                   = useState('');
  const [email, setEmail]                 = useState('admin@admin.com');
  const [password, setPassword]           = useState('admin');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  const validate = () => {
    if (isRegister) {
      if (name.trim().length < 2)      return 'Nome deve ter ao menos 2 caracteres.';
      if (password.length < 6)         return 'Senha deve ter ao menos 6 caracteres.';
      if (password !== confirmPassword) return 'As senhas não coincidem.';
    }
    if (!email.includes('@'))          return 'E-mail inválido.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      if (isRegister) {
        await authService.register(name.trim(), email.trim(), password);
      } else {
        await authService.login(email.trim(), password);
      }
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl">
            🏢
          </div>
          <CardTitle className="text-2xl">Sistema de Gestão</CardTitle>
          <CardDescription>
            {isRegister ? 'Crie sua conta para acessar' : 'Entre com suas credenciais'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Aguarde...' : isRegister ? 'Criar conta' : 'Entrar'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
            >
              {isRegister ? 'Já tenho conta — Entrar' : 'Não tenho conta — Criar'}
            </Button>
          </form>

          {!isRegister && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Demo: <span className="font-mono">admin@admin.com</span> / <span className="font-mono">admin</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
