import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Dices,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { api } from '../api/client';
import type { Role, User } from '../api/types';
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  Field,
  Modal,
  PageHeader,
  Pill,
  inputClass,
} from '../components/ui';
import { MenuItem, PopoverMenu } from '../components/PopoverMenu';
import { cn, fmtDate } from '../lib/format';
import { ROLE_LABEL } from '../lib/meta';
import { errMsg, useAuth, useLookups, useToast } from '../state/AppState';

const ROLES: Role[] = ['Admin', 'Editor', 'Viewer'];

const ROLE_BADGE: Record<Role, string> = {
  Admin: 'bg-violet-soft text-violet',
  Editor: 'bg-brand-soft text-brand',
  Viewer: 'bg-sunken text-ink-2',
};

const ROLE_HINT: Record<Role, string> = {
  Admin: 'Thêm, xóa thành viên và đổi vai trò',
  Editor: 'Thành viên làm việc thường xuyên',
  Viewer: 'Thành viên chỉ theo dõi',
};

/** 12 characters with upper, lower and digits (the server's rule), without look-alike letters. */
function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;
  const pick = (set: string) => set[crypto.getRandomValues(new Uint32Array(1))[0]! % set.length]!;
  const chars = [pick(upper), pick(lower), pick(digits)];
  while (chars.length < 12) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0]! % (i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}

const EMPTY = { fullName: '', email: '', password: '', role: 'Editor' as Role };

export function MembersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { members, refresh } = useLookups();
  const isAdmin = user?.role === 'Admin';
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? members.filter(
          (m) => m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
        )
      : members;
  }, [members, search]);

  const admins = members.filter((m) => m.role === 'Admin').length;

  const openAdd = () => {
    setError('');
    setCreated(null);
    setForm({ ...EMPTY, password: generatePassword() });
    setAdding(true);
  };

  const create = async () => {
    setError('');
    if (!form.fullName.trim() || !form.email.trim()) {
      setError('Vui lòng nhập họ tên và email.');
      return;
    }
    setSaving(true);
    try {
      await api.members.create(form);
      await refresh();
      setCreated({ email: form.email.trim(), password: form.password });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Đã sao chép.');
    } catch {
      toast.error('Không sao chép được, hãy chép thủ công.');
    }
  };

  const setRole = async (m: User, role: Role) => {
    if (role === m.role) return;
    try {
      await api.members.setRole(m.id, role);
      await refresh();
      toast.success(`${m.fullName} giờ là ${ROLE_LABEL[role].toLowerCase()}.`);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.members.remove(toDelete.id);
      await refresh();
      toast.success('Đã xóa thành viên.');
    } catch (e) {
      toast.error(errMsg(e));
    }
    setToDelete(null);
  };

  return (
    <>
      <PageHeader
        title="Thành viên"
        subtitle={`${members.length} thành viên · ${admins} quản trị viên`}
        actions={
          isAdmin && (
            <Button icon={<UserPlus className="h-4 w-4" />} onClick={openAdd}>
              Thêm thành viên
            </Button>
          )
        }
      />

      {!isAdmin && (
        <p className="mb-4 flex items-center gap-2 rounded-md bg-sunken px-4 py-3 text-sm text-ink-2">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Chỉ quản trị viên mới thêm, xóa thành viên hoặc đổi vai trò.
        </p>
      )}

      {members.length > 8 && (
        <div className="relative mb-3 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            className={cn(inputClass, 'pl-9')}
            placeholder="Tìm theo tên hoặc email..."
            aria-label="Tìm thành viên"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      <Card className="divide-y divide-line">
        {visible.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-ink-3">Không có thành viên nào khớp.</p>
        )}
        {visible.map((m) => {
          const self = m.id === user?.id;
          const editable = isAdmin && !self;
          const pill = <Pill className={ROLE_BADGE[m.role]}>{ROLE_LABEL[m.role]}</Pill>;
          return (
            <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-5">
              <Avatar name={m.fullName} size="lg" />
              <div className="min-w-0 flex-1 basis-48">
                <p className="truncate font-semibold">
                  {m.fullName}
                  {self && <span className="ml-1.5 text-xs font-medium text-ink-3">(bạn)</span>}
                </p>
                <p className="truncate text-sm text-ink-2">{m.email}</p>
              </div>
              <span className="hidden text-xs text-ink-3 md:block">
                Tham gia {fmtDate(m.createdAt)}
              </span>

              {editable ? (
                <PopoverMenu
                  width={260}
                  align="end"
                  trigger={(t) => (
                    <button
                      {...t}
                      type="button"
                      aria-label={`Vai trò của ${m.fullName}`}
                      title="Đổi vai trò"
                      className="cursor-pointer rounded-full hover:ring-2 hover:ring-brand/20"
                    >
                      {pill}
                    </button>
                  )}
                >
                  {(close) =>
                    ROLES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="menuitemradio"
                        aria-checked={r === m.role}
                        onClick={() => {
                          close();
                          void setRole(m, r);
                        }}
                        className="flex w-full cursor-pointer items-start gap-2 rounded-sm px-2 py-2 text-left hover:bg-sunken"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{ROLE_LABEL[r]}</span>
                          <span className="block text-xs text-ink-3">{ROLE_HINT[r]}</span>
                        </span>
                        {r === m.role && <Check className="mt-0.5 h-4 w-4 text-brand" />}
                      </button>
                    ))
                  }
                </PopoverMenu>
              ) : (
                pill
              )}

              {editable ? (
                <PopoverMenu
                  width={176}
                  align="end"
                  trigger={(t) => (
                    <button
                      {...t}
                      type="button"
                      aria-label={`Tùy chọn ${m.fullName}`}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ink-3 hover:bg-sunken"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  )}
                >
                  {(close) => (
                    <MenuItem
                      danger
                      icon={<Trash2 className="h-4 w-4" />}
                      onClick={() => {
                        close();
                        setToDelete(m);
                      }}
                    >
                      Xóa khỏi nhóm
                    </MenuItem>
                  )}
                </PopoverMenu>
              ) : (
                <span className="w-8" />
              )}
            </div>
          );
        })}
      </Card>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title={created ? 'Đã thêm thành viên' : 'Thêm thành viên'}
        footer={
          created ? (
            <Button onClick={() => setAdding(false)}>Xong</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setAdding(false)}>
                Hủy
              </Button>
              <Button loading={saving} onClick={create}>
                Thêm thành viên
              </Button>
            </>
          )
        }
      >
        {created ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-2">
              Gửi thông tin đăng nhập này cho thành viên mới. Mật khẩu sẽ không hiển thị lại sau khi
              đóng cửa sổ.
            </p>
            {[
              ['Email', created.email],
              ['Mật khẩu tạm', created.password],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-md border border-line px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-3">{label}</p>
                  <p className="select-all truncate font-mono text-sm font-semibold">{value}</p>
                </div>
                <Button
                  variant="ghost"
                  className="h-8 w-8 px-0"
                  aria-label={`Sao chép ${label}`}
                  onClick={() => void copy(value!)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              className="w-full"
              icon={<Copy className="h-4 w-4" />}
              onClick={() => void copy(`Email: ${created.email}\nMật khẩu: ${created.password}`)}
            >
              Sao chép cả hai
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <Field label="Họ và tên" required>
              <input
                autoFocus
                className={inputClass}
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field
              label="Mật khẩu tạm"
              required
              hint="Đã tạo sẵn mật khẩu hợp lệ. Thành viên nên đổi sau khi đăng nhập."
            >
              <div className="flex gap-2">
                <input
                  className={cn(inputClass, 'font-mono')}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button
                  variant="secondary"
                  className="shrink-0"
                  icon={<Dices className="h-4 w-4" />}
                  onClick={() => setForm({ ...form, password: generatePassword() })}
                >
                  Tạo mới
                </Button>
              </div>
            </Field>
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold">Vai trò</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {ROLES.map((r) => (
                  <label
                    key={r}
                    className={cn(
                      'cursor-pointer rounded-md border p-3 transition',
                      form.role === r
                        ? 'border-brand bg-brand-soft'
                        : 'border-line-strong hover:bg-sunken',
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      className="sr-only"
                      checked={form.role === r}
                      onChange={() => setForm({ ...form, role: r })}
                    />
                    <span className="block text-sm font-semibold">{ROLE_LABEL[r]}</span>
                    <span className="mt-0.5 block text-xs text-ink-2">{ROLE_HINT[r]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {error && (
              <p role="alert" className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">
                {error}
              </p>
            )}
            <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Xóa thành viên"
        message={`Xóa ${toDelete?.fullName} khỏi không gian làm việc? Nội dung họ phụ trách sẽ trở thành chưa giao.`}
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}
