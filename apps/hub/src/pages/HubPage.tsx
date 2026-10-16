import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@stm/ui';
import { getCategories, getFeaturedApp } from '../data/apps';
import { useAppsManifest } from '../data/useAppsManifest';
import { AppCard } from '../components/AppCard';
import { StatusBadge } from '../components/StatusBadge';

export function HubPage() {
  const { apps } = useAppsManifest();
  const [category, setCategory] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const featured = getFeaturedApp(apps);
  const categories = useMemo(() => getCategories(apps), [apps]);

  const filtered = useMemo(() => {
    return apps.filter((app) => {
      const matchesCategory = category === 'Tất cả' || app.category === category;
      const matchesSearch = app.name.toLowerCase().includes(search.trim().toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [apps, category, search]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-xs font-semibold tracking-wide text-primary">KHO ỨNG DỤNG</p>
      <h1 className="mt-2 text-4xl font-bold text-ink-primary">
        Chọn ứng dụng bạn cần, tải về và dùng ngay.
      </h1>
      <p className="mt-3 max-w-2xl text-ink-secondary">
        Bộ công cụ cho Word, Excel và Google Sheets: quản lý công việc, nội dung, công thức và dữ
        liệu. Mỗi ứng dụng có hướng dẫn cài đặt riêng.
      </p>

      {featured && (
        <div className="mt-8 flex flex-col gap-6 rounded-xl border border-border bg-surface p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex gap-2">
              <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary">
                NỔI BẬT
              </span>
              <StatusBadge status={featured.status} />
            </div>
            <h2 className="mt-3 text-2xl font-bold text-ink-primary">{featured.name}</h2>
            <p className="mt-2 max-w-xl text-ink-secondary">{featured.longDesc}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {featured.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-surface-secondary px-2 py-1 text-xs font-medium text-ink-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-5 flex gap-3">
              <Link to={`/apps/${featured.id}`}>
                <Button>Xem & tải về</Button>
              </Link>
              <Link to={`/apps/${featured.id}`}>
                <Button variant="secondary">Hướng dẫn cài đặt</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-ink-primary">Tất cả ứng dụng</h3>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm ứng dụng..."
            className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink-primary outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = cat === 'Tất cả' ? apps.length : apps.filter((a) => a.category === cat).length;
          const active = category === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-white'
                  : 'bg-surface-secondary text-ink-secondary hover:bg-border'
              }`}
            >
              {cat} · {count}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </div>

      <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-lg border border-border bg-surface p-6 sm:flex-row sm:items-center">
        <div>
          <p className="font-semibold text-ink-primary">Bạn cần một ứng dụng chưa có trong danh sách?</p>
          <p className="text-sm text-ink-secondary">Gửi ý tưởng để được đưa vào kế hoạch phát triển.</p>
        </div>
        <a href="mailto:thinlam6@gmail.com?subject=Đề xuất ứng dụng">
          <Button variant="secondary">Đề xuất ứng dụng</Button>
        </a>
      </div>
    </div>
  );
}
