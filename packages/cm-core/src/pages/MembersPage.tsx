import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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
  Select,
  inputClass,
} from '../components/ui';
import { fmtDate } from '../lib/format';
import { ROLE_LABEL } from '../lib/meta';
import { errMsg, useAuth, useLookups, useToast } from '../state/AppState';

const ROLES: Role[] = ['Admin', 'Editor', 'Viewer'];

export function MembersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { members, refresh } = useLookups();
  const isAdmin = user?.role === 'Admin';
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'Editor' as Role,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<User | null>(null);

  const create = async () => {
    setError('');
    setSaving(true);
    try {
      await api.members.create(form);
      await refresh();
      toast.success('Đã thêm thành viên.');
      setAdding(false);
      setForm({ fullName: '', email: '', password: '', role: 'Editor' });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const setRole = async (m: User, role: Role) => {
    try {
      await api.members.setRole(m.id, role);
      await refresh();
      toast.success(`Đã đổi vai trò của ${m.fullName}.`);
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
      setToDelete(null);
    } catch (e) {
      toast.error(errMsg(e));
      setToDelete(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Thành viên"
        subtitle={`${members.length} thành viên trong không gian làm việc`}
        actions={
          isAdmin && (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>
              Thêm thành viên
            </Button>
          )
        }
      />

      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-5">
              <Avatar name={m.fullName} size="lg" />
              <div className="min-w-0 flex-1 basis-48">
                <p className="truncate font-semibold">
                  {m.fullName}{' '}
                  {m.id === user?.id && (
                    <span className="text-xs font-medium text-ink-3">(bạn)</span>
                  )}
                </p>
                <p className="truncate text-sm text-ink-2">{m.email}</p>
              </div>
              <span className="hidden text-xs text-ink-3 md:block">
                Tham gia {fmtDate(m.createdAt)}
              </span>
              <div className="w-40">
                {isAdmin && m.id !== user?.id ? (
                  <Select
                    className="h-9 text-sm"
                    value={m.role}
                    onChange={(e) => setRole(m, e.target.value as Role)}
                    aria-label={`Vai trò của ${m.fullName}`}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <span className="text-sm font-medium text-ink-2">{ROLE_LABEL[m.role]}</span>
                )}
              </div>
              {isAdmin && m.id !== user?.id && (
                <Button
                  variant="ghost"
                  className="h-9 w-9 px-0 text-bad hover:bg-bad-soft"
                  aria-label={`Xóa ${m.fullName}`}
                  onClick={() => setToDelete(m)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Thêm thành viên"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Hủy
            </Button>
            <Button loading={saving} onClick={create}>
              Thêm
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Họ và tên" required>
            <input
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
            hint="Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số."
          >
            <input
              type="password"
              className={inputClass}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Vai trò">
            <Select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>
          {error && (
            <p role="alert" className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">
              {error}
            </p>
          )}
        </div>
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
