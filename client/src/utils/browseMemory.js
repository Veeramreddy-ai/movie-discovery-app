/**
 * Remembers the last browse URL (?q=...&genres=...) so the "Discover" tab can return to it after the user
 * has visited a movie or the wishlist. Kept in sessionStorage: it should not outlive the tab.
 */
const KEY = 'marquee.lastBrowse';
let memory = '';

export function saveBrowseSearch(search) {
  memory = search;
  try {
    sessionStorage.setItem(KEY, search);
  } catch {
    /* memory copy is enough */
  }
}

export function readBrowseSearch() {
  if (memory) return memory;
  try {
    return sessionStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}
