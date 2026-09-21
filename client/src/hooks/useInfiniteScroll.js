import { useEffect, useRef } from 'react';

/**
 * Returns a ref for a sentinel element placed after the list. When it comes within `rootMargin` of the
 * viewport, `onLoadMore` is called.
 *
 * `enabled` MUST be false while a request is in flight: turning it back on re-creates the observer, and a
 * new IntersectionObserver reports the current intersection immediately - so if the freshly loaded page
 * was too short to push the sentinel out of view, loading continues instead of stalling.
 */
export function useInfiniteScroll({ enabled, onLoadMore, rootMargin = '900px' }) {
  const sentinelRef = useRef(null);
  const callbackRef = useRef(onLoadMore);

  useEffect(() => {
    callbackRef.current = onLoadMore;
  });

  useEffect(() => {
    const node = sentinelRef.current;
    if (!enabled || !node || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) callbackRef.current();
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return sentinelRef;
}
