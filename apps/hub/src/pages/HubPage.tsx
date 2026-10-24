import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { Button } from '@stm/ui';
import { getCategories, getFeaturedApp } from '../data/apps';
import { useAppsManifest } from '../data/useAppsManifest';
import { AppCard } from '../components/AppCard';
import { AppIcon } from '../components/AppIcon';
import { InstallButton } from '../components/InstallButton';

const ALL = 'Tất cả';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

export function HubPage() {
  const { apps } = useAppsManifest();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const search = params.get('q') ?? '';
  const [category, setCategory] = useState(ALL);
  const featured = getFeaturedApp(apps);
  const categories = useMemo(() => getCategories(apps), [apps]);

  const filtered = useMemo(() => {
    const needle = normalize(search.trim());
    return apps.filter((app) => {
      const matchesCategory = category === ALL || app.category === category;
      const haystack = normalize(`${app.name} ${app.shortDesc} ${app.tags.join(' ')}`);
      return matchesCategory && (!needle || haystack.includes(needle));
    });
  }, [apps, category, search]);

  const showFeatured = featured && !search && category === ALL;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-bold text-ink-primary">Ứng dụng</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        Chọn ứng dụng, bấm <strong className="font-semibold text-ink-primary">Tải về</strong> — Hub
        tự cài đặt cho bạn.{' '}
        <Link to="/guide" className="font-medium text-primary hover:underline">
          Xem hướng dẫn
        </Link>
      </p>

      {showFeatured && (
        <section
          aria-label="Ứng dụng nổi bật"
          className="mt-6 flex flex-col gap-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-light to-surface p-6 sm:flex-row sm:items-center"
        >
          <AppIcon id={featured.id} badge={featured.badge} size="xl" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Nổi bật</p>
            <h2 className="mt-1 text-xl font-bold text-ink-primary">{featured.name}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-ink-secondary">{featured.longDesc}</p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:w-44">
            <InstallButton
              app={featured}
              className="w-full"
              fallback={
                <Link to={`/apps/${featured.id}`}>
                  <Button className="w-full">Tải về</Button>
                </Link>
              }
            />
            <Link
              to={`/apps/${featured.id}`}
              className="text-center text-xs font-medium text-ink-secondary hover:text-primary"
            >
              Xem chi tiết
            </Link>
          </div>
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-2" role="tablist" aria-label="Danh mục">
        {categories.map((cat) => {
          const count = cat === ALL ? apps.length : apps.filter((a) => a.category === cat).length;
          const active = category === cat;
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={active}
              onClick={() => setCategory(cat)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-ink-primary text-white'
                  : 'bg-surface text-ink-secondary ring-1 ring-border hover:bg-surface-secondary'
              }`}
            >
              {cat}
              <span className={`ml-1.5 ${active ? 'text-white/60' : 'text-ink-muted'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {search && (
        <p className="mt-4 text-sm text-ink-secondary">
          {filtered.length} kết quả cho “{search}”
        </p>
      )}

      {filtered.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      ) : (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-border-strong py-14 text-center">
          <SearchX className="h-8 w-8 text-ink-muted" />
          <p className="mt-3 font-medium text-ink-primary">Không tìm thấy ứng dụng phù hợp</p>
          <p className="mt-1 text-sm text-ink-secondary">Thử từ khóa khác hoặc xem tất cả ứng dụng.</p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              setCategory(ALL);
              navigate('/');
            }}
          >
            Xem tất cả
          </Button>
        </div>
      )}
    </main>
  );
}
