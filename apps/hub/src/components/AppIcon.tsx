import type { ComponentType } from 'react';
import { Eraser, FileText, LayoutTemplate, Sigma, SpellCheck, Table2 } from 'lucide-react';
import smartTaskManager from '../assets/icons/smart-task-manager.png';
import contentManager from '../assets/icons/content-manager.png';
import voiceScribe from '../assets/icons/voicescribe.png';

/** Real product logos (the same icon each app ships with). */
const LOGOS: Record<string, string> = {
  'smart-task-manager': smartTaskManager,
  'content-manager': contentManager,
  voicescribe: voiceScribe,
};

/** Add-ins and upcoming tools have no product logo yet: a tinted tile with a glyph. */
const GLYPHS: Record<string, { Icon: ComponentType<{ className?: string }>; tile: string }> = {
  'giao-trinh-word': { Icon: FileText, tile: 'bg-gradient-to-br from-sky-500 to-blue-700' },
  'giao-trinh-excel': { Icon: Table2, tile: 'bg-gradient-to-br from-emerald-500 to-green-700' },
  'ai-formula-assistant': { Icon: Sigma, tile: 'bg-gradient-to-br from-violet-500 to-indigo-700' },
  'grammar-checker': { Icon: SpellCheck, tile: 'bg-gradient-to-br from-amber-400 to-orange-600' },
  'data-cleaner': { Icon: Eraser, tile: 'bg-gradient-to-br from-teal-400 to-cyan-700' },
  'template-library': { Icon: LayoutTemplate, tile: 'bg-gradient-to-br from-rose-400 to-pink-600' },
};

const SIZES = {
  sm: { box: 'h-10 w-10 rounded-[10px]', glyph: 'h-5 w-5' },
  md: { box: 'h-12 w-12 rounded-xl', glyph: 'h-6 w-6' },
  lg: { box: 'h-16 w-16 rounded-2xl', glyph: 'h-8 w-8' },
  xl: { box: 'h-20 w-20 rounded-[22px]', glyph: 'h-10 w-10' },
} as const;

export function AppIcon({
  id,
  badge,
  size = 'md',
}: {
  id: string;
  badge: string;
  size?: keyof typeof SIZES;
}) {
  const { box, glyph } = SIZES[size];
  const logo = LOGOS[id];

  if (logo) {
    return <img src={logo} alt="" draggable={false} className={`${box} shrink-0 shadow-sm`} />;
  }

  const entry = GLYPHS[id];
  return (
    <span
      aria-hidden="true"
      className={`${box} flex shrink-0 items-center justify-center text-white shadow-sm ${
        entry?.tile ?? 'bg-gradient-to-br from-slate-500 to-slate-700'
      }`}
    >
      {entry ? <entry.Icon className={glyph} /> : <span className="text-sm font-bold">{badge}</span>}
    </span>
  );
}
