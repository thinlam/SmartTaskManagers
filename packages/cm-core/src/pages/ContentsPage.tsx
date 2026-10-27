import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { api } from '../api/client';
import { CHANNELS, PRIORITIES, STATUSES, type Content, type ContentQuery } from '../api/types';
import {
  Avatar,
  Button,
  Card,
  ChannelIcon,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  PriorityBadge,
  ProgressBar,
  Select,
  Spinner,
  StatusBadge,
  inputClass,
} from '../components/ui';
import { cn, fmtDate, isOverdue } from '../lib/format';
import { STATUS_META } from '../lib/meta';
import { getPrefs } from '../lib/prefs';
import { errMsg, useAsync, useLookups, useToast } from '../state/AppState';

const PAGE_SIZES = [10, 20, 50];

export function ContentsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { members, campaigns } = useLookups();
  const [params, setParams] = useSearchParams();

  const [q, setQ] = useState(params.get('q') ?? '');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [channel, setChannel] = useState(params.get('channel') ?? '');
  const [campaignId, setCampaignId] = useState(params.get('campaign') ?? '');
  const [priority, setPriority] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [view, setView] = useState<'list' | 'grid'>(getPrefs().contentsView);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(getPrefs().pageSize);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce the free-text search so every keystroke doesn't hit the API.
  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Header search box navigates here with ?q= — keep local state in sync.
  const urlQ = params.get('q') ?? '';
  const lastUrlQ = useRef(urlQ);
  useEffect(() => {
    if (urlQ !== lastUrlQ.current) {
      lastUrlQ.current = urlQ;
      setQ(urlQ);
    }
  }, [urlQ]);

  const query = useMemo<ContentQuery>(
    () => ({
      q: debouncedQ || undefined,
      status: (status || undefined) as ContentQuery['status'],
      channel: (channel || undefined) as ContentQuery['channel'],
      campaignId: campaignId || undefined,
      priority: (priority || undefined) as ContentQuery['priority'],
      assigneeId: assigneeId || undefined,
      page,
      pageSize,
    }),
    [debouncedQ, status, channel, campaignId, priority, assigneeId, page, pageSize],
  );

  const { data, error, loading, reload } = useAsync(
    () => api.contents.list(query),
    [JSON.stringify(query)],
  );

  const filtered = !!(q || status || channel || campaignId || priority || assigneeId);
  const clear = () => {
    setQ('');
    setStatus('');
    setChannel('');
    setCampaignId('');
    setPriority('');
    setAssigneeId('');
    setPage(1);
    setParams({});
  };
  const onFilter = (set: (v: string) => void) => (v: string) => {
    set(v);
    setPage(1);
    setSelected(new Set());
  };

  const items = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const allChecked = items.length > 0 && items.every((c) => selected.has(c.id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const changeStatus = async (c: Content, next: Content['status']) => {
    if (next === c.status) return;
    try {
      await api.contents.setStatus(c.id, next);
      toast.success(`Đã chuyển "${c.title}" sang ${STATUS_META[next].label}.`);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      if (toDelete.length === 1) await api.contents.remove(toDelete[0]!);
      else await api.contents.bulkDelete(toDelete);
      toast.success(`Đã xóa ${toDelete.length} nội dung.`);
      setSelected(new Set());
      setToDelete(null);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Danh sách nội dung"
        subtitle="Quản lý toàn bộ nội dung trong một nơi"
        actions={
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/contents/new')}
            className="sm:hidden"
          >
            Tạo nội dung
          </Button>
        }
      />

      <div
        role="tablist"
        aria-label="Lọc theo trạng thái"
        className="mb-3 flex gap-1.5 overflow-x-auto pb-1"
      >
        {[
          ['', 'Tất cả'] as const,
          ...STATUSES.map((st) => [st, STATUS_META[st].label] as const),
        ].map(([value, label]) => (
          <button
            key={value || 'all'}
            role="tab"
            type="button"
            aria-selected={status === value}
            onClick={() => onFilter(setStatus)(value)}
            className={cn(
              'shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              status === value
                ? 'bg-ink text-surface'
                : 'bg-surface text-ink-2 ring-1 ring-line hover:bg-sunken',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Card className="mb-4 p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 basis-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              className={cn(inputClass, 'pl-9')}
              placeholder="Tìm theo tiêu đề hoặc mã..."
              aria-label="Tìm kiếm nội dung"
              value={q}
              onChange={(e) => onFilter(setQ)(e.target.value)}
            />
          </div>
          <Select
            className="w-36"
            value={channel}
            onChange={(e) => onFilter(setChannel)(e.target.value)}
            aria-label="Lọc kênh"
          >
            <option value="">Tất cả kênh</option>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            className="w-44"
            value={campaignId}
            onChange={(e) => onFilter(setCampaignId)(e.target.value)}
            aria-label="Lọc chiến dịch"
          >
            <option value="">Tất cả chiến dịch</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Button
            variant="secondary"
            icon={<SlidersHorizontal className="h-4 w-4" />}
            onClick={() => setAdvanced((a) => !a)}
            aria-expanded={advanced}
          >
            Bộ lọc khác
            {priority || assigneeId ? ` (${[priority, assigneeId].filter(Boolean).length})` : ''}
          </Button>
          <div className="ml-auto inline-flex rounded-md border border-line p-0.5">
            {(
              [
                ['list', List, 'Dạng danh sách'],
                ['grid', LayoutGrid, 'Dạng lưới'],
              ] as const
            ).map(([v, Icon, label]) => (
              <button
                key={v}
                type="button"
                aria-label={label}
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn(
                  'flex h-9 w-9 cursor-pointer items-center justify-center rounded-sm',
                  view === v ? 'bg-brand-soft text-brand' : 'text-ink-3 hover:text-ink',
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </button>
            ))}
          </div>
        </div>
        {advanced && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
            <Select
              className="w-44"
              value={priority}
              onChange={(e) => onFilter(setPriority)(e.target.value)}
              aria-label="Lọc ưu tiên"
            >
              <option value="">Mọi mức ưu tiên</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p === 'High' ? 'Cao' : p === 'Medium' ? 'Trung bình' : 'Thấp'}
                </option>
              ))}
            </Select>
            <Select
              className="w-52"
              value={assigneeId}
              onChange={(e) => onFilter(setAssigneeId)(e.target.value)}
              aria-label="Lọc người phụ trách"
            >
              <option value="">Mọi người phụ trách</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </Select>
          </div>
        )}
      </Card>

      {selected.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-md border border-brand-line bg-brand-soft px-4 py-2 text-sm">
          <span className="font-semibold text-brand">Đã chọn {selected.size} nội dung</span>
          <div className="flex gap-2">
            <Button variant="ghost" className="h-8" onClick={() => setSelected(new Set())}>
              Bỏ chọn
            </Button>
            <Button
              variant="danger"
              className="h-8"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setToDelete([...selected])}
            >
              Xóa
            </Button>
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        {error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading && !data ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<FileSearch className="h-8 w-8" />}
            title={filtered ? 'Chưa có nội dung phù hợp với bộ lọc' : 'Chưa có nội dung nào'}
            hint={
              filtered
                ? 'Thử thay đổi hoặc xóa bộ lọc để xem kết quả.'
                : 'Bắt đầu bằng việc tạo nội dung đầu tiên.'
            }
            action={
              filtered ? (
                <Button variant="secondary" onClick={clear}>
                  Xóa bộ lọc
                </Button>
              ) : (
                <Button
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => navigate('/contents/new')}
                >
                  Tạo nội dung
                </Button>
              )
            }
          />
        ) : view === 'list' ? (
          <div className={cn('overflow-x-auto', loading && 'opacity-60')}>
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-2">
                  <th className="w-10 py-3 pl-4">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả"
                      checked={allChecked}
                      onChange={() =>
                        setSelected(allChecked ? new Set() : new Set(items.map((c) => c.id)))
                      }
                      className="h-4 w-4 cursor-pointer accent-brand"
                    />
                  </th>
                  {[
                    'Tiêu đề',
                    'Kênh',
                    'Chiến dịch',
                    'Phụ trách',
                    'Trạng thái',
                    'Ngày đăng',
                    'Tiến độ',
                  ].map((h) => (
                    <th key={h} className="px-3 py-3">
                      {h}
                    </th>
                  ))}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <Row
                    key={c.id}
                    c={c}
                    checked={selected.has(c.id)}
                    onCheck={() => toggle(c.id)}
                    onOpen={() => navigate(`/contents/${c.id}`)}
                    onDelete={() => setToDelete([c.id])}
                    onStatus={(next) => changeStatus(c, next)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate(`/contents/${c.id}`)}
                className="cursor-pointer rounded-lg border border-line p-4 text-left transition hover:border-brand-line hover:shadow-card"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-ink-3">
                    <ChannelIcon channel={c.channel} size={22} />
                    {c.code}
                  </span>
                  <StatusBadge status={c.status} />
                </div>
                <p className="line-clamp-2 min-h-10 text-sm font-semibold">{c.title}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-ink-2">
                  <span className="flex items-center gap-1.5">
                    <Avatar name={c.assignee?.fullName ?? '?'} size="sm" />
                    {c.assignee?.fullName ?? 'Chưa giao'}
                  </span>
                  <span className={cn(isOverdue(c) && 'font-semibold text-bad')}>
                    {fmtDate(c.scheduledAt)}
                  </span>
                </div>
                <ProgressBar value={c.progress} className="mt-3" />
              </button>
            ))}
          </div>
        )}

        {data && data.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-ink-2">
            <span>
              {(data.page - 1) * data.pageSize + 1}-
              {Math.min(data.page * data.pageSize, data.total)} trong {data.total} nội dung
            </span>
            <div className="flex items-center gap-2">
              <Select
                className="h-9 w-32"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                aria-label="Số dòng mỗi trang"
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s} / trang
                  </option>
                ))}
              </Select>
              <Pager page={page} total={totalPages} onChange={setPage} />
            </div>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        title="Xóa nội dung"
        message={`Bạn có chắc muốn xóa ${toDelete?.length ?? 0} nội dung? Thao tác này không thể hoàn tác.`}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}

function pageWindow(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  if (page > 3) out.push('…');
  for (let p = Math.max(2, page - 1); p <= Math.min(total - 1, page + 1); p++) out.push(p);
  if (page < total - 2) out.push('…');
  out.push(total);
  return out;
}

function Pager({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const btn =
    'flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-md px-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <nav aria-label="Phân trang" className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Trang trước"
        className={cn(btn, 'border border-line')}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pageWindow(page, total).map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="px-1 text-ink-3">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
            className={cn(
              btn,
              p === page ? 'bg-brand text-white' : 'border border-line hover:bg-sunken',
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        aria-label="Trang sau"
        className={cn(btn, 'border border-line')}
        disabled={page >= total}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

function Row({
  c,
  checked,
  onCheck,
  onOpen,
  onDelete,
  onStatus,
}: {
  c: Content;
  checked: boolean;
  onCheck: () => void;
  onOpen: () => void;
  onDelete: () => void;
  onStatus: (status: Content['status']) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [statusMenu, setStatusMenu] = useState(false);
  const statusRef = useRef<HTMLTableCellElement>(null);
  useEffect(() => {
    if (!statusMenu) return;
    const h = (e: MouseEvent) =>
      statusRef.current && !statusRef.current.contains(e.target as Node) && setStatusMenu(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [statusMenu]);
  const ref = useRef<HTMLTableCellElement>(null);
  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) =>
      ref.current && !ref.current.contains(e.target as Node) && setMenu(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menu]);

  return (
    <tr className="border-b border-line last:border-0 hover:bg-canvas/70">
      <td className="py-3 pl-4">
        <input
          type="checkbox"
          aria-label={`Chọn ${c.code}`}
          checked={checked}
          onChange={onCheck}
          className="h-4 w-4 cursor-pointer accent-brand"
        />
      </td>
      <td className="max-w-[300px] px-3 py-3">
        <button
          type="button"
          onClick={onOpen}
          className="block max-w-full cursor-pointer truncate text-left font-medium hover:text-brand"
        >
          {c.title}
        </button>
        <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-3">
          {c.code}
          {c.priority === 'High' && <PriorityBadge priority={c.priority} />}
        </span>
      </td>
      <td className="px-3">
        <span className="flex items-center gap-2 whitespace-nowrap">
          <ChannelIcon channel={c.channel} size={22} /> {c.channel}
        </span>
      </td>
      <td className="max-w-[160px] truncate px-3 text-ink-2">{c.campaign?.name ?? '—'}</td>
      <td className="px-3">
        <span className="flex items-center gap-2 whitespace-nowrap">
          <Avatar name={c.assignee?.fullName ?? '?'} size="sm" /> {c.assignee?.fullName ?? '—'}
        </span>
      </td>
      <td className="relative px-3" ref={statusRef}>
        <button
          type="button"
          aria-label={`Đổi trạng thái ${c.code}`}
          aria-haspopup="menu"
          aria-expanded={statusMenu}
          onClick={() => setStatusMenu((m) => !m)}
          className="cursor-pointer rounded-full hover:ring-2 hover:ring-brand/20"
        >
          <StatusBadge status={c.status} />
        </button>
        {statusMenu && (
          <div
            role="menu"
            className="absolute left-3 top-11 z-20 w-44 rounded-md border border-line bg-surface p-1 shadow-pop"
          >
            {STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                role="menuitemradio"
                aria-checked={st === c.status}
                onClick={() => {
                  setStatusMenu(false);
                  onStatus(st);
                }}
                className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-sm px-2 text-sm hover:bg-sunken"
              >
                <span className={cn('h-2 w-2 rounded-full', STATUS_META[st].dot)} />
                <span className="flex-1 text-left">{STATUS_META[st].label}</span>
                {st === c.status && <Check className="h-4 w-4 text-brand" />}
              </button>
            ))}
          </div>
        )}
      </td>
      <td
        className={cn(
          'whitespace-nowrap px-3',
          isOverdue(c) ? 'font-semibold text-bad' : 'text-ink-2',
        )}
      >
        {fmtDate(c.scheduledAt)}
      </td>
      <td className="w-32 px-3">
        <div className="flex items-center gap-2">
          <span className="w-9 text-xs font-semibold">{c.progress}%</span>
          <ProgressBar value={c.progress} />
        </div>
      </td>
      <td className="relative pr-3" ref={ref}>
        <button
          type="button"
          aria-label={`Tùy chọn ${c.code}`}
          onClick={() => setMenu((m) => !m)}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ink-3 hover:bg-sunken"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menu && (
          <div className="absolute right-3 top-10 z-20 w-36 rounded-md border border-line bg-surface p-1 shadow-pop">
            <button
              type="button"
              onClick={onOpen}
              className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-sm px-2 text-sm hover:bg-sunken"
            >
              <Pencil className="h-4 w-4" /> Chỉnh sửa
            </button>
            <button
              type="button"
              onClick={() => {
                setMenu(false);
                onDelete();
              }}
              className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-sm px-2 text-sm text-bad hover:bg-bad-soft"
            >
              <Trash2 className="h-4 w-4" /> Xóa
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
