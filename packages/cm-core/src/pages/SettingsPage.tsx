import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { api, getDefaultServerUrl, getServerUrl, setServerUrl } from '../api/client';
import { Button, Card, Field, PageHeader, inputClass } from '../components/ui';
import { ROLE_LABEL } from '../lib/meta';
import { errMsg, useAuth, useLookups, useToast } from '../state/AppState';

export function SettingsPage() {
  const { user, setUser, signOut } = useAuth();
  const { refresh } = useLookups();
  const toast = useToast();
  const [name, setName] = useState(user?.fullName ?? '');
  const [saving, setSaving] = useState(false);
  const [server, setServer] = useState(getServerUrl());

  const saveProfile = async () => {
    if (!name.trim()) return toast.error('Họ tên không được trống.');
    setSaving(true);
    try {
      setUser(await api.auth.updateMe(name));
      await refresh();
      toast.success('Đã lưu hồ sơ.');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Cài đặt" subtitle="Hồ sơ cá nhân và kết nối máy chủ" />
      <div className="grid max-w-3xl gap-5">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-bold">Hồ sơ</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Họ và tên" required>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Email">
              <input className={inputClass} value={user?.email ?? ''} disabled />
            </Field>
            <Field label="Vai trò">
              <input className={inputClass} value={user ? ROLE_LABEL[user.role] : ''} disabled />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <Button loading={saving} onClick={saveProfile}>
              Lưu hồ sơ
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 text-lg font-bold">Máy chủ</h2>
          <p className="mb-4 text-sm text-ink-2">
            Địa chỉ backend Content Manager mà ứng dụng này kết nối tới.
          </p>
          <Field label="Địa chỉ máy chủ" hint={`Mặc định: ${getDefaultServerUrl()}`}>
            <input
              className={inputClass}
              value={server}
              onChange={(e) => setServer(e.target.value)}
              inputMode="url"
            />
          </Field>
          <div className="mt-4 flex justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setServerUrl(server);
                toast.success('Đã lưu. Tải lại ứng dụng để áp dụng.');
              }}
            >
              Lưu địa chỉ
            </Button>
          </div>
        </Card>

        <Card className="flex items-center justify-between p-5">
          <div>
            <h2 className="text-lg font-bold">Đăng xuất</h2>
            <p className="text-sm text-ink-2">Kết thúc phiên làm việc trên thiết bị này.</p>
          </div>
          <Button variant="danger" icon={<LogOut className="h-4 w-4" />} onClick={signOut}>
            Đăng xuất
          </Button>
        </Card>
      </div>
    </>
  );
}
