interface PlaceholderPageProps {
  title: string;
  phase: string;
}

/**
 * Stand-in for every screen not built yet. Each route in app/routes.ts
 * renders one of these until its real page lands in the Phase named here
 * — replacing the route's `element` in app/router.tsx is the only change
 * needed at that point, the route path/label/group stay put.
 */
export function PlaceholderPage({ title, phase }: PlaceholderPageProps) {
  return (
    <div className="flex flex-1 flex-col gap-2 p-8">
      <h1 className="text-2xl font-semibold text-ink-primary">{title}</h1>
      <p className="text-sm text-ink-secondary">Chưa triển khai — sẽ xây ở {phase}.</p>
    </div>
  );
}
