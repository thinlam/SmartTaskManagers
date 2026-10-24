import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Download, Mail, MousePointerClick, PlayCircle, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@stm/ui';
import { openExternal } from '../lib/openExternal';
import { SUPPORT_EMAIL } from '../components/Topbar';

const STEPS = [
  {
    Icon: MousePointerClick,
    title: 'Chọn ứng dụng',
    desc: 'Vào mục Ứng dụng, chọn thứ bạn cần. Dùng ô tìm kiếm (Ctrl + K) nếu danh sách dài.',
  },
  {
    Icon: Download,
    title: 'Bấm Tải về',
    desc: 'Hub tự tải, kiểm tra tính toàn vẹn (SHA-256) và cài đặt. Bạn không cần mở file nào.',
  },
  {
    Icon: PlayCircle,
    title: 'Bấm Mở',
    desc: 'Khi xong, nút đổi thành Mở. Ứng dụng cũng có trong Start Menu.',
  },
];

const TASKS = [
  {
    Icon: RefreshCw,
    title: 'Cập nhật',
    desc: 'Khi có bản mới, nút Cập nhật xuất hiện thay cho Mở. Chỉ cần bấm một lần, Hub tải và cài bản mới thay cho bản cũ.',
  },
  {
    Icon: Trash2,
    title: 'Gỡ cài đặt',
    desc: 'Dưới nút Mở có liên kết Gỡ cài đặt. Bạn cũng có thể gỡ trong Cài đặt › Ứng dụng của Windows.',
  },
  {
    Icon: ShieldCheck,
    title: 'An toàn',
    desc: 'Mỗi bộ cài được đối chiếu mã SHA-256 trước khi chạy. Nếu không khớp, Hub dừng và báo lỗi.',
  },
];

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: 'Windows hiện cảnh báo “Windows đã bảo vệ PC”?',
    a: 'Bộ cài chưa có chữ ký số nên SmartScreen có thể cảnh báo. Chọn “Thông tin thêm” rồi “Vẫn chạy”. Nếu cài bằng nút Tải về trong Hub, bộ cài đã được kiểm tra SHA-256 trước đó.',
  },
  {
    q: 'Bấm Tải về nhưng báo lỗi?',
    a: 'Kiểm tra kết nối mạng rồi bấm Thử lại. Nếu vẫn lỗi, gửi cho chúng tôi nội dung thông báo ở phần Hỗ trợ bên dưới.',
  },
  {
    q: 'Dùng VoiceScribe cần tài khoản không?',
    a: 'Có. Bạn tạo tài khoản ngay trong ứng dụng; nếu app yêu cầu mã mời, hãy liên hệ người quản trị để nhận mã. File ghi âm được xử lý trên máy chủ nên cần có mạng.',
  },
  {
    q: 'Add-in Word / Excel cài thế nào?',
    a: (
      <>
        Mở trang chi tiết của add-in trong mục{' '}
        <Link to="/" className="font-medium text-primary hover:underline">
          Ứng dụng
        </Link>
        ; các bước cài đặt được ghi ngay tại đó.
      </>
    ),
  },
  {
    q: 'Hub có cập nhật danh sách ứng dụng không?',
    a: 'Có. Mỗi lần mở, Hub lấy danh sách mới nhất; khi không có mạng nó dùng danh sách có sẵn.',
  },
];

export function GuidePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold text-ink-primary">Hướng dẫn</h1>
      <p className="mt-1 text-sm text-ink-secondary">Mọi thứ bạn cần để cài và dùng ứng dụng trong 3 bước.</p>

      <ol className="mt-6 grid gap-4 sm:grid-cols-3">
        {STEPS.map(({ Icon, title, desc }, i) => (
          <li key={title} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                {i + 1}
              </span>
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-3 font-semibold text-ink-primary">{title}</p>
            <p className="mt-1 text-sm text-ink-secondary">{desc}</p>
          </li>
        ))}
      </ol>

      <h2 className="mt-10 text-lg font-semibold text-ink-primary">Sau khi cài</h2>
      <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface">
        {TASKS.map(({ Icon, title, desc }) => (
          <div key={title} className="flex gap-4 p-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="font-medium text-ink-primary">{title}</p>
              <p className="mt-0.5 text-sm text-ink-secondary">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold text-ink-primary">Câu hỏi thường gặp</h2>
      <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink-primary">
              {q}
              <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-sm text-ink-secondary">{a}</p>
          </details>
        ))}
      </div>

      <section className="mt-10 flex flex-col items-start justify-between gap-4 rounded-xl bg-ink-primary p-6 text-white sm:flex-row sm:items-center">
        <div>
          <p className="font-semibold">Vẫn cần giúp đỡ?</p>
          <p className="mt-0.5 text-sm text-white/70">Mô tả vấn đề, chúng tôi sẽ phản hồi qua email.</p>
        </div>
        <Button
          variant="secondary"
          leadingIcon={<Mail className="h-4 w-4" />}
          onClick={() => openExternal(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Hỗ trợ App Hub')}`)}
        >
          Gửi email hỗ trợ
        </Button>
      </section>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Cần một ứng dụng chưa có?{' '}
        <button
          onClick={() => openExternal(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Đề xuất ứng dụng')}`)}
          className="font-medium text-primary hover:underline"
        >
          Đề xuất ứng dụng
        </button>
      </p>
    </main>
  );
}
