import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const storageKey = (key) => `marquee.scroll.${key}`;

/**
 * Remembers the scroll position of each history entry, so pressing Back from a movie returns to exactly
 * where you were in the list. (Browsers can't do this alone: the list is rendered asynchronously.)
 *
 * `ready` should become true once the content that makes the page tall enough is rendered.
 * The position is written while scrolling rather than on unmount, because by unmount time the next
 * page has usually already changed the document height.
 */
export function useScrollRestoration(ready) {
  const { key } = useLocation();
  const restoredFor = useRef(null);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        try {
          sessionStorage.setItem(storageKey(key), String(Math.round(window.scrollY)));
        } catch {
          /* storage unavailable: restoration is a nicety, not a requirement */
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [key]);

  useLayoutEffect(() => {
    if (!ready || restoredFor.current === key) return;
    restoredFor.current = key;
    let saved = 0;
    try {
      saved = Number(sessionStorage.getItem(storageKey(key))) || 0;
    } catch {
      /* ignore */
    }
    if (saved > 0) window.scrollTo(0, saved);
  }, [ready, key]);
}
