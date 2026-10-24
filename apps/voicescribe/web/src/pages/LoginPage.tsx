import { useState, type FormEvent } from 'react';
import { Loader2, Mic } from 'lucide-react';
import { getDefaultServerUrl, getServerUrl, isDesktopBuild, setServerUrl } from '../lib/api';
import { errorText } from '../lib/format';
import { Field, inputClass, primaryButtonClass } from '../components/ui';
import { useAuth } from '../state/AppState';

const RULES: [string, (p: string) => boolean][] = [
  ['Tối thiểu 8 ký tự', (p) => p.length >= 8],
  ['Có chữ hoa', (p) => /[A-Z]/.test(p)],
  ['Có chữ thường', (p) => /[a-z]/.test(p)],
  ['Có chữ số', (p) => /\d/.test(p)],
];

export function LoginPage() {
  const { signIn, signUp, config } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [signupCode, setSignupCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const registering = mode === 'register';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (registering) {
      if (!RULES.every(([, ok]) => ok(password))) return setError('Mật khẩu chưa đủ mạnh.');
      if (password !== confirm) return setError('Mật khẩu nhập lại chưa khớp.');
    }
    setBusy(true);
    try {
      if (registering) await signUp(email, fullName, password, signupCode);
      else await signIn(email, password);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Mic className="h-6 w-6" />
          </span>
          <span className="text-2xl font-bold text-slate-900">VoiceScribe</span>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
        >
          <h1 className="text-xl font-semibold text-slate-900">
            {registering ? 'Tạo tài khoản' : 'Đăng nhập'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {registering
              ? 'Bản ghi của bạn được lưu riêng theo tài khoản.'
              : 'Đăng nhập để xem thư viện bản ghi của bạn.'}
          </p>

          <div className="mt-5 space-y-4">
            {registering && (
              <Field label="Họ và tên">
                <input
                  className={inputClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </Field>
            )}
            <Field label="Email">
              <input
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </Field>
            <Field label="Mật khẩu">
              <input
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={registering ? 'new-password' : 'current-password'}
                required
              />
            </Field>
            {registering && (
              <>
                <ul className="grid grid-cols-2 gap-1 text-xs" aria-label="Yêu cầu mật khẩu">
                  {RULES.map(([label, ok]) => (
                    <li
                      key={label}
                      className={ok(password) ? 'text-emerald-600' : 'text-slate-400'}
                    >
                      {ok(password) ? '✓' : '○'} {label}
                    </li>
                  ))}
                </ul>
                <Field
                  label="Nhập lại mật khẩu"
                  error={
                    confirm && confirm !== password ? 'Mật khẩu nhập lại chưa khớp.' : undefined
                  }
                >
                  <input
                    type="password"
                    className={inputClass}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </Field>
                {config?.signupCodeRequired && (
                  <Field label="Mã mời" hint="Nhận từ quản trị viên VoiceScribe.">
                    <input
                      className={inputClass}
                      value={signupCode}
                      onChange={(e) => setSignupCode(e.target.value)}
                      autoComplete="off"
                      required
                    />
                  </Field>
                )}
              </>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className={`${primaryButtonClass} mt-5 w-full py-2.5`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {registering ? 'Tạo tài khoản' : 'Đăng nhập'}
          </button>

          <p className="mt-4 text-center text-sm text-slate-500">
            {registering ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(registering ? 'login' : 'register');
                setError('');
              }}
              className="font-medium text-indigo-600 hover:underline"
            >
              {registering ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          </p>
        </form>

        {isDesktopBuild && <ServerPicker />}
      </div>
    </div>
  );
}

/** Desktop only: lets a user whose server moved (or who self-hosts) point the app elsewhere before signing in. */
function ServerPicker() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(getServerUrl());
  const [error, setError] = useState('');

  function save() {
    if (!/^https?:\/\//i.test(value.trim())) {
      setError('Địa chỉ phải bắt đầu bằng http:// hoặc https://');
      return;
    }
    setServerUrl(value);
    window.location.reload();
  }

  return (
    <div className="mt-4 text-center text-xs text-slate-400">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="hover:text-slate-600 hover:underline"
      >
        Máy chủ: {getServerUrl()}
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-left">
          <input
            className={inputClass}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            spellCheck={false}
          />
          {error && <p className="mt-1 text-rose-600">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md px-3 py-1 text-slate-500 hover:bg-slate-50"
              onClick={() => setValue(getDefaultServerUrl())}
            >
              Mặc định
            </button>
            <button type="button" className={primaryButtonClass} onClick={save}>
              Lưu và kết nối
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
