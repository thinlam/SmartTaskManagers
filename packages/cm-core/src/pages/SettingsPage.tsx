import { useState } from 'react';
import { Check, Info, LayoutDashboard, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { Section, SettingsLayout } from '../components/SettingsLayout';
import { Button, Field, Select } from '../components/ui';
import { cn } from '../lib/format';
import { resetPrefs, setPrefs, usePrefs, type ThemeMode } from '../lib/prefs';
import { useToast } from '../state/AppState';

export const APP_VERSION = '0.1.0';

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
    <Section title="Giao diện" description="Chọn chủ đề màu cho ứng dụng trên thiết bị này.">
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

function Display() {
  const prefs = usePrefs();
  const toast = useToast();
  return (
    <Section
      title="Hiển thị mặc định"
      description="Chế độ xem được dùng khi bạn mở từng màn hình. Lưu trên thiết bị này."
      footer={
        <Button
          variant="secondary"
          onClick={() => {
            resetPrefs();
            toast.success('Đã khôi phục cài đặt mặc định.');
          }}
        >
          Khôi phục mặc định
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tổng quan mở theo">
          <Select
            value={prefs.dashboardRange}
            onChange={(e) => setPrefs({ dashboardRange: e.target.value as 'week' | 'month' })}
          >
            <option value="week">Tuần</option>
            <option value="month">Tháng</option>
          </Select>
        </Field>
        <Field label="Danh sách nội dung hiển thị">
          <Select
            value={prefs.contentsView}
            onChange={(e) => setPrefs({ contentsView: e.target.value as 'list' | 'grid' })}
          >
            <option value="list">Dạng danh sách</option>
            <option value="grid">Dạng lưới</option>
          </Select>
        </Field>
        <Field label="Số dòng mỗi trang">
          <Select
            value={prefs.pageSize}
            onChange={(e) => setPrefs({ pageSize: Number(e.target.value) as 10 | 20 | 50 })}
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n} dòng
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lịch đăng mở theo">
          <Select
            value={prefs.calendarView}
            onChange={(e) =>
              setPrefs({ calendarView: e.target.value as 'month' | 'week' | 'list' })
            }
          >
            <option value="month">Tháng</option>
            <option value="week">Tuần</option>
            <option value="list">Danh sách</option>
          </Select>
        </Field>
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
    <SettingsLayout
      title="Cài đặt"
      subtitle="Giao diện và tùy chọn hiển thị trên thiết bị này"
      tabs={[
        { id: 'appearance', label: 'Giao diện', icon: Palette, render: () => <Appearance /> },
        {
          id: 'display',
          label: 'Hiển thị mặc định',
          icon: LayoutDashboard,
          render: () => <Display />,
        },
        { id: 'about', label: 'Giới thiệu', icon: Info, render: () => <About /> },
      ]}
    />
  );
}
