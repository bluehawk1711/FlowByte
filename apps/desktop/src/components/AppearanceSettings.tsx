import { Check, Palette, RotateCcw } from '../lib/icons';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import {
  ACCENT_PRESETS,
  BACKGROUND_PALETTES,
  FONT_OPTIONS,
  RADIUS_OPTIONS,
  type BackgroundId,
  type RadiusId,
} from '../lib/theme';
import { useState } from 'react';
import { getSettings, saveSettings } from '../lib/api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { SelectMenu } from './ui/select-menu';

function hexInput(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : `#${value.replace(/^#?/, '')}`;
}


export function AppearanceSettings() {
  const { theme, update, reset } = useTheme();
  const [cursorFollow, setCursorFollow] = useState(() => getSettings().cursorFollow);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Appearance
        </CardTitle>
        <CardDescription>
          Personalize colors, typography and density. Changes apply instantly and are saved
          on this device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Accent */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-ink-2">Accent color</span>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_PRESETS.map((a) => {
              const active = theme.accent.toLowerCase() === a.value.toLowerCase();
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => update({ accent: a.value })}
                  title={a.label}
                  aria-label={`Accent ${a.label}`}
                  aria-pressed={active}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 active:scale-95',
                    active && 'ring-2 ring-ink-1 ring-offset-2 ring-offset-card',
                  )}
                  style={{ background: a.value }}
                >
                  {active && <Check className="h-4 w-4 text-white" aria-hidden />}
                </button>
              );
            })}
            {/* Custom picker */}
            <label className="group relative flex h-8 cursor-pointer items-center gap-2 rounded-full border border-line bg-card px-1 pl-3 text-xs text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2">
              <input
                type="color"
                value={hexInput(theme.accent)}
                onChange={(e) => update({ accent: e.target.value })}
                className="h-6 w-6 cursor-pointer appearance-none rounded-full border-none bg-transparent p-0"
                aria-label="Custom accent color"
              />
              Custom
            </label>
          </div>
        </div>

        {/* Background */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-ink-2">Background</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BACKGROUND_PALETTES.map((p) => {
              const active = theme.background === p.id;
              const c = p.colors;
              const text =
                p.id === 'daylight' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.6)';
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => update({ background: p.id as BackgroundId })}
                  aria-pressed={active}
                  className={cn(
                    'group rounded-lg border p-2 text-left transition-colors duration-150',
                    active
                      ? 'border-accent bg-accent-soft'
                      : 'border-line hover:border-line-strong hover:bg-white/5',
                  )}
                >
                  {/* Mini surface preview */}
                  <div
                    className="flex h-12 flex-col gap-px overflow-hidden rounded-md p-1.5"
                    style={{ background: c['--color-app'] }}
                  >
                    <div className="flex h-full gap-px">
                      <div className="w-1/3 rounded-sm" style={{ background: c['--color-sidebar'] }} />
                      <div className="flex-1 rounded-sm" style={{ background: c['--color-card'] }} />
                    </div>
                    <div className="h-1.5 rounded-sm" style={{ background: c['--color-line'] }} />
                    <div className="flex gap-0.5">
                      <div className="h-1 w-2/3 rounded-sm" style={{ background: text }} />
                      <div className="h-1 w-1/4 rounded-sm" style={{ background: text, opacity: 0.6 }} />
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-ink-1">{p.label}</span>
                    {active && <Check className="h-3.5 w-3.5 text-accent" aria-hidden />}
                  </div>
                  <p className="truncate text-[11px] text-ink-3">{p.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Font */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1.5">
            <label htmlFor="font-select" className="text-sm font-medium text-ink-2">
              Font family
            </label>
            <SelectMenu
              className="w-44"
              ariaLabel="Font family"
              value={theme.font}
              onChange={(v) => update({ font: v })}
              options={FONT_OPTIONS.map((f) => ({ value: f.id, label: f.label }))}
            />
            <p className="text-xs text-ink-3">Web fonts load from Google Fonts when online.</p>
          </div>

          {/* UI scale */}
          <div className="min-w-[220px] flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="scale-range" className="text-sm font-medium text-ink-2">
                Text &amp; spacing size
              </label>
              <span className="text-xs tabular-nums text-ink-3">
                {Math.round(theme.uiScale * 100)}%
              </span>
            </div>
            <input
              id="scale-range"
              type="range"
              min={85}
              max={120}
              step={5}
              value={Math.round(theme.uiScale * 100)}
              onChange={(e) => update({ uiScale: Number(e.target.value) / 100 })}
              className="w-full cursor-pointer accent-[var(--color-accent)]"
            />
            <div className="flex justify-between text-[11px] text-ink-3">
              <span>Compact</span>
              <span>Comfortable</span>
            </div>
          </div>
        </div>

        {/* Corner radius */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-ink-2">Corner radius</span>
          <div className="flex w-fit items-center gap-1 rounded-lg border border-line bg-card p-1">
            {RADIUS_OPTIONS.map((r) => {
              const active = theme.radius === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => update({ radius: r.id as RadiusId })}
                  aria-pressed={active}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors duration-150',
                    active ? 'bg-elevated text-ink-1' : 'text-ink-3 hover:text-ink-1',
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Effects */}
        <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-card/60 p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-1">Cursor glow</p>
            <p className="text-xs text-ink-3">
              A soft accent dot trails your cursor and morphs into a bubble over
              highlighted controls.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={cursorFollow}
            onClick={() => {
              const next = !cursorFollow;
              setCursorFollow(next);
              saveSettings({ cursorFollow: next });
            }}
            className={cn(
              'relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
              cursorFollow ? 'bg-accent' : 'bg-ink-3/40',
            )}
            aria-label="Toggle cursor glow"
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
                cursorFollow ? 'translate-x-[22px]' : 'translate-x-0.5',
              )}
            />
          </button>
        </div>

        <div className="flex justify-end border-t border-line pt-4">
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
