import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const storageKey = (key) => `marquee.scroll.${key}`;


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
