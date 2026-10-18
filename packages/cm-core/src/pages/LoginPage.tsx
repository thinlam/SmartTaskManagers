import { useState, type FormEvent } from 'react';
import { ChevronDown, Server } from 'lucide-react';
import { getDefaultServerUrl, getServerUrl, setServerUrl } from '../api/client';
import { Logo } from '../components/AppShell';
import { Button, Card, Field, inputClass } from '../components/ui';
import { errMsg, useAuth } from '../state/AppState';
import { cn } from '../lib/format';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState(getServerUrl());
  const [showServer, setShowServer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      setServerUrl(server);
      if (mode === 'login') await signIn(email, password);
      else await signUp(email, fullName, password);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <Logo size={44} />
          <span className="text-2xl font-bold tracking-tight">Content Manager</span>
        </div>
        <Card className="p-6">
          <div className="mb-5 grid grid-cols-2 rounded-md bg-sunken p-1 text-sm font-semibold">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError('');
                }}
                className={cn(
                  'h-9 cursor-pointer rounded-sm transition',
                  mode === m ? 'bg-surface text-ink shadow-card' : 'text-ink-2',
                )}
              >
                {m === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <Field label="Họ và tên" required>
                <input
                  className={inputClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </Field>
            )}
            <Field label="Email" required>
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </Field>
            <Field
              label="Mật khẩu"
              required
              hint={
                mode === 'register'
                  ? 'Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số.'
                  : undefined
              }
            >
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </Field>

            <div>
              <button
                type="button"
                onClick={() => setShowServer((s) => !s)}
                className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-ink-2 hover:text-ink"
              >
                <Server className="h-3.5 w-3.5" /> Máy chủ
                <ChevronDown className={cn('h-3.5 w-3.5 transition', showServer && 'rotate-180')} />
              </button>
              {showServer && (
                <div className="mt-2">
                  <input
                    className={inputClass}
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    aria-label="Địa chỉ máy chủ"
                    placeholder={getDefaultServerUrl()}
                    inputMode="url"
                  />
                  <p className="mt-1 text-xs text-ink-3">
                    Địa chỉ backend Content Manager (mặc định {getDefaultServerUrl()}).
                  </p>
                </div>
              )}
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">
                {error}
              </p>
            )}
            <Button type="submit" loading={busy} className="w-full">
              {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
