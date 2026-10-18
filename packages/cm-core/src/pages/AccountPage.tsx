import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Check, LogOut, ShieldCheck, UserRound, X } from 'lucide-react';
import { api } from '../api/client';
import { Section, SettingsLayout } from '../components/SettingsLayout';
import { Avatar, Button, Field, Pill, Spinner, inputClass } from '../components/ui';
import { cn, fmtBytes, fmtDate } from '../lib/format';
import { ROLE_LABEL } from '../lib/meta';
import { errMsg, useAsync, useAuth, useLookups, useToast } from '../state/AppState';

function Profile() {
  const { user, setUser } = useAuth();
  const { refresh } = useLookups();
  const toast = useToast();
  const [name, setName] = useState(user?.fullName ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (!user) return null;
  const dirty = name.trim() !== user.fullName;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Họ tên không được trống.');
    setError('');
    setSaving(true);
    try {
      setUser(await api.auth.updateMe(name));
      await refresh();
      toast.success('Đã lưu hồ sơ.');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save}>
      <Section
        title="Hồ sơ cá nhân"
        description="Thông tin hiển thị với các thành viên trong workspace."
        footer={
          <>
            <Button variant="secondary" disabled={!dirty} onClick={() => setName(user.fullName)}>
              Hoàn tác
            </Button>
            <Button type="submit" loading={saving} disabled={!dirty}>
              Lưu thay đổi
            </Button>
          </>
        }
      >
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={user.fullName} size="lg" className="h-16 w-16 text-xl" />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{user.fullName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-2">
              <Pill className="bg-brand-soft text-brand">{ROLE_LABEL[user.role]}</Pill>
              Tham gia {fmtDate(user.createdAt)}
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Họ và tên" required error={error}>
            <input
              className={cn(inputClass, error && 'border-bad')}
              value={name}
              maxLength={128}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </Field>
          <Field label="Email" hint="Email dùng để đăng nhập và không thể thay đổi.">
            <input className={inputClass} value={user.email} disabled />
          </Field>
        </div>
      </Section>
    </form>
  );
}

const RULES: [string, (p: string) => boolean][] = [
  ['Tối thiểu 8 ký tự', (p) => p.length >= 8],
  ['Có chữ hoa', (p) => /[A-Z]/.test(p)],
  ['Có chữ thường', (p) => /[a-z]/.test(p)],
  ['Có chữ số', (p) => /\d/.test(p)],
];

function Security() {
  const { signOut } = useAuth();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const rulesOk = RULES.every(([, ok]) => ok(next));
  const matches = next !== '' && next === confirm;

  const submit = async (e: FormEvent) => {
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
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <form onSubmit={submit}>
        <Section
          title="Đổi mật khẩu"
          description="Dùng mật khẩu mạnh và không trùng với dịch vụ khác."
          footer={
            <Button type="submit" loading={saving} disabled={!current || !rulesOk || !matches}>
              Cập nhật mật khẩu
            </Button>
          }
        >
          <div className="space-y-4">
            <Field label="Mật khẩu hiện tại" required>
              <input
                type="password"
                className={inputClass}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mật khẩu mới" required>
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
                required
                error={confirm && !matches ? 'Mật khẩu nhập lại chưa khớp.' : undefined}
              >
                <input
                  type="password"
                  className={cn(inputClass, confirm && !matches && 'border-bad')}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
            </div>
            <ul className="grid gap-1.5 text-sm sm:grid-cols-2" aria-label="Yêu cầu mật khẩu">
              {RULES.map(([label, ok]) => {
                const pass = ok(next);
                return (
                  <li
                    key={label}
                    className={cn('flex items-center gap-2', pass ? 'text-ok' : 'text-ink-3')}
                  >
                    {pass ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />} {label}
                  </li>
                );
              })}
            </ul>
            {error && (
              <p role="alert" className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">
                {error}
              </p>
            )}
          </div>
        </Section>
      </form>

      <Section title="Phiên đăng nhập" description="Đăng xuất khỏi thiết bị này.">
        <Button variant="danger" icon={<LogOut className="h-4 w-4" />} onClick={signOut}>
          Đăng xuất
        </Button>
      </Section>
    </>
  );
}

function WorkspaceTab() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => api.workspace.get(), []);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    if (data) setName(data.name);
  }, [data]);

  if (loading && !data) return <Spinner />;
  if (!data) return null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.workspace.rename(name);
      toast.success('Đã đổi tên workspace.');
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <form onSubmit={save}>
        <Section
          title="Workspace"
          description="Không gian làm việc chứa toàn bộ nội dung, chiến dịch và media của nhóm."
          footer={
            isAdmin && (
              <Button
                type="submit"
                loading={saving}
                disabled={!name.trim() || name.trim() === data.name}
              >
                Lưu tên
              </Button>
            )
          }
        >
          <Field
            label="Tên workspace"
            hint={isAdmin ? undefined : 'Chỉ Quản trị viên mới đổi được tên.'}
          >
            <input
              className={inputClass}
              value={name}
              maxLength={100}
              disabled={!isAdmin}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </Section>
      </form>

      <Section title="Tổng quan sử dụng">
        <dl className="grid grid-cols-3 gap-3 text-center">
          {[
            ['Thành viên', data.memberCount],
            ['Nội dung', data.contentCount],
            ['Dung lượng media', fmtBytes(data.mediaBytes)],
          ].map(([l, v]) => (
            <div key={l} className="rounded-md bg-canvas px-2 py-3">
              <dd className="text-xl font-bold">{v}</dd>
              <dt className="text-xs text-ink-2">{l}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-ink-2">
          Tạo ngày {fmtDate(data.createdAt)} ·{' '}
          <Link to="/members" className="font-medium text-brand hover:underline">
            Quản lý thành viên
          </Link>
        </p>
      </Section>
    </>
  );
}

export function AccountPage() {
  return (
    <SettingsLayout
      title="Tài khoản"
      subtitle="Quản lý hồ sơ, bảo mật và workspace của bạn"
      tabs={[
        { id: 'profile', label: 'Hồ sơ', icon: UserRound, render: () => <Profile /> },
        { id: 'security', label: 'Bảo mật', icon: ShieldCheck, render: () => <Security /> },
        { id: 'workspace', label: 'Workspace', icon: Briefcase, render: () => <WorkspaceTab /> },
      ]}
    />
  );
}
