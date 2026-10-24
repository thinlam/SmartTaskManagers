import { useState, type FormEvent } from 'react';
import { Check, X } from 'lucide-react';
import { api } from '../lib/api';
import { errorText } from '../lib/format';
import {
  Card,
  Field,
  PageHeader,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../components/ui';
import { useAuth, useToast } from '../state/AppState';

const RULES: [string, (p: string) => boolean][] = [
  ['Tối thiểu 8 ký tự', (p) => p.length >= 8],
  ['Có chữ hoa', (p) => /[A-Z]/.test(p)],
  ['Có chữ thường', (p) => /[a-z]/.test(p)],
  ['Có chữ số', (p) => /\d/.test(p)],
];

function ProfileSection() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.fullName ?? '');
  const [saving, setSaving] = useState(false);
  if (!user) return null;
  const dirty = name.trim() !== user.fullName && name.trim() !== '';

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      setUser(await api.auth.updateMe(name.trim()));
      toast.success('Đã lưu hồ sơ.');
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <form onSubmit={save} className="space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">Hồ sơ</h2>
          <p className="text-sm text-slate-500">Thông tin tài khoản của bạn.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Họ và tên">
            <input
              className={inputClass}
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Email" hint="Email dùng để đăng nhập, không thể thay đổi.">
            <input className={inputClass} value={user.email} disabled />
          </Field>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={!dirty || saving} className={primaryButtonClass}>
            Lưu thay đổi
          </button>
        </div>
      </form>
    </Card>
  );
}

function PasswordSection() {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const rulesOk = RULES.every(([, ok]) => ok(next));
  const matches = next !== '' && next === confirm;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.auth.changePassword(current, next);
      toast.success('Đã đổi mật khẩu.');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">Đổi mật khẩu</h2>
          <p className="text-sm text-slate-500">
            Dùng mật khẩu mạnh và không trùng với dịch vụ khác.
          </p>
        </div>
        <Field label="Mật khẩu hiện tại">
          <input
            type="password"
            className={inputClass}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mật khẩu mới">
            <input
              type="password"
              className={inputClass}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field
            label="Nhập lại mật khẩu mới"
            error={confirm && !matches ? 'Mật khẩu nhập lại chưa khớp.' : undefined}
          >
            <input
              type="password"
              className={inputClass}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        </div>
        <ul className="grid gap-1 text-sm sm:grid-cols-2" aria-label="Yêu cầu mật khẩu">
          {RULES.map(([label, ok]) => {
            const pass = ok(next);
            return (
              <li
                key={label}
                className={`flex items-center gap-2 ${pass ? 'text-emerald-600' : 'text-slate-400'}`}
              >
                {pass ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />} {label}
              </li>
            );
          })}
        </ul>
        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!current || !rulesOk || !matches || saving}
            className={primaryButtonClass}
          >
            Cập nhật mật khẩu
          </button>
        </div>
      </form>
    </Card>
  );
}

export function SettingsPage() {
  const { signOut } = useAuth();
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <PageHeader title="Cài đặt" subtitle="Quản lý tài khoản và kết nối của bạn." />
      <div className="max-w-3xl space-y-6">
        <ProfileSection />
        <PasswordSection />
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Phiên đăng nhập</h2>
            <p className="text-sm text-slate-500">Đăng xuất khỏi thiết bị này.</p>
          </div>
          <button onClick={signOut} className={secondaryButtonClass}>
            Đăng xuất
          </button>
        </Card>
        <p className="text-xs text-slate-400">VoiceScribe 0.2.2</p>
      </div>
    </div>
  );
}
