import { Button } from '@stm/ui';

/**
 * Phase 05 smoke test — proves Vite + Tailwind + @stm/ui are wired
 * correctly end to end. Replaced by the real Application Shell in Phase 07;
 * do not build on top of this page.
 */
export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8">
      <h1 className="text-2xl font-semibold text-ink-primary">
        Smart Task Manager — Phase 05 smoke test
      </h1>
      <p className="max-w-md text-center text-sm text-ink-secondary">
        Temporary page to verify Vite + Tailwind + packages/ui wiring against the Canva design
        tokens. Replaced by the real Application Shell in Phase 07.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="primary" disabled>
          Disabled
        </Button>
      </div>
    </main>
  );
}
