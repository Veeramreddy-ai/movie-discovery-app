const KEY = 'marquee.clientId';

function generateId() {
  // crypto.randomUUID only exists in secure contexts (https / localhost); opening the dev server
  // from a phone over http://192.168.x.x would otherwise crash here.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

let memoryFallback = null;

/** Anonymous, stable identifier used by the API to find this browser's wishlist. */
export function getClientId() {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // localStorage can be unavailable (private mode, blocked storage) - degrade to a per-tab id.
    memoryFallback ??= generateId();
    return memoryFallback;
  }
}
