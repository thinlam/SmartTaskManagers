import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Monitor, Moon, RotateCcw, Sun } from 'lucide-react';
import { Section } from '../components/SettingsLayout';
import { Button, PageHeader } from '../components/ui';
import { cn } from '../lib/format';
import { resetPrefs, setPrefs, usePrefs, type Prefs, type ThemeMode } from '../lib/prefs';
import { useToast } from '../state/AppState';

export const APP_VERSION = '0.1.2';

const THEMES: { id: ThemeMode; label: string; icon: typeof Sun; bg: string; bar: string }[] = [
  { id: 'light', label: 'Sáng', icon: Sun, bg: '#f6f8fc', bar: '#ffffff' },
  { id: 'dark', label: 'Tối', icon: Moon, bg: '#0b1220', bar: '#111a2e' },
  {
    id: 'system',
    label: 'Theo hệ thống',
    icon: Monitor,
    bg: 'linear-gradient(90deg,#f6f8fc 50%,#0b1220 50%)',
    bar: '#8b9bb4',
  },
];

function Appearance() {
  const prefs = usePrefs();
  return (
    <Section title="Giao diện" description="Đổi màu ngay lập tức, áp dụng cho cả ứng dụng.">
      <div role="radiogroup" aria-label="Chủ đề" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {THEMES.map(({ id, label, icon: Icon, bg, bar }) => {
          const on = prefs.theme === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPrefs({ theme: id })}
              className={cn(
                'cursor-pointer rounded-lg border-2 p-3 text-left transition',
                on ? 'border-brand bg-brand-soft' : 'border-line hover:border-line-strong',
              )}
            >
              <div
                className="mb-3 h-16 overflow-hidden rounded-md border border-line"
                style={{ background: bg }}
              >
                <div className="h-3 w-full" style={{ background: bar }} />
                <div className="m-2 h-2 w-1/2 rounded-full bg-brand" />
                <div className="mx-2 h-2 w-3/4 rounded-full" style={{ background: bar }} />
              </div>
              <span className="flex items-center justify-between text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" /> {label}
                </span>
                {on && <Check className="h-4 w-4 text-brand" />}
              </span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md bg-sunken p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'cursor-pointer rounded-[6px] px-3.5 py-1.5 text-sm font-medium transition-colors',
            value === o.value ? 'bg-surface text-ink shadow-card' : 'text-ink-2 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Row({
  title,
  hint,
  control,
  onPreview,
}: {
  title: string;
  hint: string;
  control: ReactNode;
  onPreview: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-ink-3">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        {control}
        <button
          type="button"
          onClick={onPreview}
          title="Mở màn hình này để xem"
          className="flex cursor-pointer items-center text-sm font-medium text-brand hover:underline"
        >
          Xem <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Display() {
  const prefs = usePrefs();
  const toast = useToast();
  const navigate = useNavigate();

  // Each choice is saved the moment it is made; the toast says where it takes effect.
  const change = (patch: Partial<Prefs>, screen: string) => {
    setPrefs(patch);
    toast.success(`Đã lưu. Áp dụng mỗi khi bạn mở ${screen}.`);
  };

  return (
    <Section
      title="Hiển thị mặc định"
      description="Chọn cách mỗi màn hình mở ra. Tự lưu ngay, chỉ áp dụng trên thiết bị này."
      footer={
        <Button
          variant="secondary"
          icon={<RotateCcw className="h-4 w-4" />}
          onClick={() => {
            resetPrefs();
            toast.success('Đã khôi phục cài đặt mặc định.');
          }}
        >
          Khôi phục mặc định
        </Button>
      }
    >
      <div className="divide-y divide-line">
        <Row
          title="Tổng quan"
          hint="Khoảng thời gian thống kê khi mở Tổng quan"
          onPreview={() => navigate('/')}
          control={
            <Segmented
              label="Tổng quan mở theo"
              value={prefs.dashboardRange}
              options={[
                { value: 'week', label: 'Tuần' },
                { value: 'month', label: 'Tháng' },
              ]}
              onChange={(v) => change({ dashboardRange: v }, 'Tổng quan')}
            />
          }
        />
        <Row
          title="Danh sách nội dung"
          hint="Kiểu hiển thị khi mở trang Nội dung"
          onPreview={() => navigate('/contents')}
          control={
            <Segmented
              label="Kiểu danh sách nội dung"
              value={prefs.contentsView}
              options={[
                { value: 'list', label: 'Danh sách' },
                { value: 'grid', label: 'Lưới' },
              ]}
              onChange={(v) => change({ contentsView: v }, 'trang Nội dung')}
            />
          }
        />
        <Row
          title="Số dòng mỗi trang"
          hint="Số nội dung hiện cùng lúc ở trang Nội dung"
          onPreview={() => navigate('/contents')}
          control={
            <Segmented
              label="Số dòng mỗi trang"
              value={prefs.pageSize}
              options={[
                { value: 10, label: '10' },
                { value: 20, label: '20' },
                { value: 50, label: '50' },
              ]}
              onChange={(v) => change({ pageSize: v }, 'trang Nội dung')}
            />
          }
        />
        <Row
          title="Lịch đăng"
          hint="Kiểu xem khi mở Lịch đăng"
          onPreview={() => navigate('/calendar')}
          control={
            <Segmented
              label="Lịch đăng mở theo"
              value={prefs.calendarView}
              options={[
                { value: 'month', label: 'Tháng' },
                { value: 'week', label: 'Tuần' },
                { value: 'list', label: 'Danh sách' },
              ]}
              onChange={(v) => change({ calendarView: v }, 'Lịch đăng')}
            />
          }
        />
      </div>
    </Section>
  );
}

function About() {
  return (
    <Section title="Giới thiệu">
      <dl className="grid gap-3 text-sm sm:grid-cols-[160px_1fr]">
        <dt className="text-ink-2">Ứng dụng</dt>
        <dd className="font-medium">Content Manager</dd>
        <dt className="text-ink-2">Phiên bản</dt>
        <dd className="font-medium">{APP_VERSION}</dd>
      </dl>
    </Section>
  );
}

export function SettingsPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Cài đặt" subtitle="Giao diện và cách hiển thị trên thiết bị này" />
      <div className="space-y-5">
        <Appearance />
        <Display />
        <About />
      </div>
    </div>
  );
}
