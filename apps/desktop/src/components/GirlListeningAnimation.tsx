import { useEffect, useRef } from 'react';
import type { AnimationItem } from 'lottie-web';
import animationUrl from '../assets/animations/girl-listening-to-music.json?url';

/**
 * "Girl listening to music" Lottie animation (473×473, ~5s loop).
 *
 * - `lottie-web` is dynamically imported so its ~350 KB only loads on screens
 *   that actually show the animation (code-split by Vite).
 * - The 760 KB animation JSON is referenced as a `?url` asset — never bundled.
 * - `prefers-reduced-motion`: shows a single poster frame instead of looping.
 */
export function GirlListeningAnimation({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let destroyed = false;
    let anim: AnimationItem | null = null;

    void import('lottie-web').then(({ default: lottie }) => {
      if (destroyed) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      anim = lottie.loadAnimation({
        container: el,
        renderer: 'svg',
        loop: !reduce,
        autoplay: !reduce,
        path: animationUrl,
      });
      if (reduce) {
        anim.addEventListener('DOMLoaded', () => {
          // A calm mid-loop pose instead of an animation.
          anim?.goToAndStop(60, true);
        });
      }
    });

    return () => {
      destroyed = true;
      anim?.destroy();
    };
  }, []);

  return <div ref={ref} aria-hidden className={className} />;
}
