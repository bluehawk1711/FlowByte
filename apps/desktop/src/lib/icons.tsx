/**
 * Central icon module for the desktop app.
 *
 * Every icon is exported under its original lucide-react name so existing
 * call sites (`<Music2 className="h-4 w-4" />`) keep working unchanged.
 *
 * - Names available in `@animateicons/react/lucide` are wrapped so the glyph
 *   animates on hover. The wrapper reads the tailwind `h-*` / `w-*` sizing
 *   classes from `className` and converts them into the numeric `size` prop
 *   the package needs (the package cannot size its SVG via CSS classes).
 * - Names without an equivalent glyph in the animated set (e.g. `Square`,
 *   `Palette`, `XCircle`) are re-exported straight from lucide-react.
 */
import type { ComponentType, HTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ActivityIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  CircleCheckIcon,
  ClockIcon,
  CloudIcon,
  CloudOffIcon,
  CloudUploadIcon,
  CopyIcon,
  Disc3Icon,
  DownloadIcon,
  EllipsisIcon,
  FileMusicIcon,
  HardDriveIcon,
  HeartIcon,
  HouseIcon,
  ImageIcon,
  LayoutListIcon,
  LinkIcon,
  ListIcon,
  LoaderIcon,
  LogOutIcon,
  MicIcon,
  MinusIcon,
  MonitorIcon,
  MusicIcon,
  PencilIcon,
  PinIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
  RepeatIcon,
  Repeat1Icon,
  SearchIcon,
  ServerIcon,
  SettingsIcon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
  UserRoundIcon,
  Volume2Icon,
  XIcon,
} from '@animateicons/react/lucide';

// Glyphs with no animated equivalent — keep the lucide originals but give
// them a small hover animation through the CSS-driven wrapper below.
import {
  Album as AlbumStatic,
  Clapperboard as ClapperboardStatic,
  GripVertical as GripVerticalStatic,
  ListPlus as ListPlusStatic,
  Palette as PaletteStatic,
  SearchX as SearchXStatic,
  Square as SquareStatic,
  XCircle as XCircleStatic,
} from 'lucide-react';

export type AnimatedIconProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  | 'color'
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd'
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onAnimationIteration'
> & {
  size?: number;
  duration?: number;
  isAnimated?: boolean;
  color?: string;
};

/** Tailwind spacing scale → pixels (only sizes actually used by icon classes). */
const TAILWIND_PX: Record<string, number> = {
  '1': 4,
  '1.5': 6,
  '2': 8,
  '2.5': 10,
  '3': 12,
  '3.5': 14,
  '4': 16,
  '5': 20,
  '6': 24,
  '7': 28,
  '8': 32,
  '9': 36,
  '10': 40,
  '11': 44,
  '12': 48,
  '14': 56,
  '16': 64,
  '20': 80,
  '24': 96,
  '28': 112,
  '32': 128,
  '40': 160,
  '48': 192,
  '56': 224,
  '64': 256,
};

function sizeFromClassName(className?: string): number {
  if (!className) return 24;
  let best = 0;
  const re = /(?:^|\s)h-(?:\[(\d+(?:\.\d+)?)px\]|(\d+(?:\.\d+)?))(?=\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(className)) !== null) {
    const px = m[1] ? Number(m[1]) : (TAILWIND_PX[m[2]] ?? Number(m[2]) * 4);
    if (px > best) best = px;
  }
  return best || 24;
}

function stripSizing(className?: string): string | undefined {
  if (!className) return undefined;
  return className.replace(/(?:^|\s)(?:h|w)(?:-\[[^\]]*\]|-[^ \]]+)(?=\s|$)/g, ' ').trim() || undefined;
}

/** Wrap an animated glyph so tailwind `h-*` classes drive the numeric size. */
function makeAnimated(Icon: ComponentType<AnimatedIconProps>) {
  function AnimatedIcon(props: AnimatedIconProps) {
    const { size, className, ...rest } = props;
    return <Icon size={size ?? sizeFromClassName(className)} className={stripSizing(className)} {...rest} />;
  }
  AnimatedIcon.displayName = Icon.displayName ?? 'AnimatedIcon';
  return AnimatedIcon;
}

/** Minimal component shape accepted by UI primitives (lucide + animated icons). */
export type IconComponent = (props: {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
  'aria-hidden'?: boolean | 'true' | 'false';
}) => ReactNode;

// ---------------------------------------------------------------------------
// CSS-driven hover animations for glyphs the animated set doesn't ship. The
// keyframes live in index.css (`[data-icon-anim=…]:hover svg`). These icons
// keep lucide's own SVG sizing via className — no size conversion needed.
// ---------------------------------------------------------------------------
type IconAnim = 'shake' | 'spin' | 'pop' | 'bounce-y' | 'hue' | 'clap';

function makeCssAnimated(Icon: LucideIcon, anim: IconAnim) {
  function CssAnimatedIcon(props: React.ComponentProps<typeof Icon>) {
    const { className, ...rest } = props;
    return (
      <span data-icon-anim={anim} className="inline-flex">
        <Icon className={className} {...rest} />
      </span>
    );
  }
  CssAnimatedIcon.displayName = `${Icon.displayName ?? 'Icon'}Css`;
  return CssAnimatedIcon;
}

export const Album = makeCssAnimated(AlbumStatic, 'spin');
export const Clapperboard = makeCssAnimated(ClapperboardStatic, 'clap');
export const GripVertical = makeCssAnimated(GripVerticalStatic, 'bounce-y');
export const ListPlus = makeCssAnimated(ListPlusStatic, 'pop');
export const Palette = makeCssAnimated(PaletteStatic, 'hue');
export const SearchX = makeCssAnimated(SearchXStatic, 'shake');
export const Square = makeCssAnimated(SquareStatic, 'pop');
export const XCircle = makeCssAnimated(XCircleStatic, 'shake');

// --- Animated (hover) icon exports -----------------------------------------
export const Activity = makeAnimated(ActivityIcon);
export const ArrowRight = makeAnimated(ArrowRightIcon);
export const Check = makeAnimated(CheckIcon);
export const CheckCircle2 = makeAnimated(CircleCheckIcon);
export const ChevronDown = makeAnimated(ChevronDownIcon);
export const ChevronRight = makeAnimated(ChevronRightIcon);
export const ChevronUp = makeAnimated(ChevronUpIcon);
export const CircleUserRound = makeAnimated(UserRoundIcon);
export const Cloud = makeAnimated(CloudIcon);
export const CloudOff = makeAnimated(CloudOffIcon);
export const CloudUpload = makeAnimated(CloudUploadIcon);
export const Clock = makeAnimated(ClockIcon);
export const Copy = makeAnimated(CopyIcon);
export const Disc3 = makeAnimated(Disc3Icon);
export const Download = makeAnimated(DownloadIcon);
export const FileAudio = makeAnimated(FileMusicIcon);
export const HardDrive = makeAnimated(HardDriveIcon);
export const Heart = makeAnimated(HeartIcon);
export const Home = makeAnimated(HouseIcon);
export const ImagePlus = makeAnimated(ImageIcon);
export const Library = makeAnimated(BookOpenIcon);
export const Link = makeAnimated(LinkIcon);
export const ListMusic = makeAnimated(ListIcon);
export const ListRestart = makeAnimated(RefreshCwIcon);
export const ListVideo = makeAnimated(LayoutListIcon);
export const Loader2 = makeAnimated(LoaderIcon);
export const LogOut = makeAnimated(LogOutIcon);
export const Mic2 = makeAnimated(MicIcon);
export const Minus = makeAnimated(MinusIcon);
export const MonitorPlay = makeAnimated(MonitorIcon);
export const MoreHorizontal = makeAnimated(EllipsisIcon);
export const Music2 = makeAnimated(MusicIcon);
export const Music4 = Music2;
export const PanelLeftClose = makeAnimated(ChevronsLeftIcon);
export const PanelLeftOpen = makeAnimated(ChevronsRightIcon);
export const Pause = makeAnimated(PauseIcon);
export const Pencil = makeAnimated(PencilIcon);
export const Pin = makeAnimated(PinIcon);
export const Play = makeAnimated(PlayIcon);
export const Plus = makeAnimated(PlusIcon);
export const Repeat = makeAnimated(RepeatIcon);
export const Repeat1 = makeAnimated(Repeat1Icon);
export const RotateCcw = makeAnimated(RefreshCwIcon);
export const Search = makeAnimated(SearchIcon);
export const Server = makeAnimated(ServerIcon);
export const Settings = makeAnimated(SettingsIcon);
export const Shuffle = makeAnimated(ShuffleIcon);
export const SkipBack = makeAnimated(SkipBackIcon);
export const SkipForward = makeAnimated(SkipForwardIcon);
export const Sparkles = makeAnimated(SparklesIcon);
export const Trash2 = makeAnimated(Trash2Icon);
export const Upload = makeAnimated(UploadIcon);
export const Volume2 = makeAnimated(Volume2Icon);
export const X = makeAnimated(XIcon);
