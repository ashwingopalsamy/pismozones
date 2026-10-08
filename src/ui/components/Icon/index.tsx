import {
  ArrowRight,
  CalendarDays,
  ChartGantt,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Globe,
  GripVertical,
  type IconNode,
  Languages,
  LayoutGrid,
  Lock,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Search,
  Share,
  SlidersHorizontal,
  Sun,
  X,
} from 'lucide';
import { h } from 'preact';

/** Lucide icons (ISC), by the names the app uses. */
const ICONS = {
  arrowRight: ArrowRight,
  calendar: CalendarDays,
  check: Check,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  clock: Clock,
  close: X,
  download: Download,
  globe: Globe,
  grip: GripVertical,
  language: Languages,
  lock: Lock,
  minus: Minus,
  moon: Moon,
  plan: ChartGantt,
  plus: Plus,
  reset: RotateCcw,
  search: Search,
  share: Share,
  sliders: SlidersHorizontal,
  sun: Sun,
  zones: LayoutGrid,
} satisfies Record<string, IconNode>;

export type IconName = keyof typeof ICONS;

/** Stroke icons drawn with currentColor; decorative unless a label is given by the parent. */
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name].map(([tag, attrs], i) => h(tag, { key: i, ...attrs }))}
    </svg>
  );
}
