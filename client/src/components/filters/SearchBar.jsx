import { useEffect, useRef, useState } from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { CloseIcon, SearchIcon } from '../ui/Icons.jsx';


export function SearchBar({ query, onSearch }) {
  const [text, setText] = useState(query);
  const debounced = useDebouncedValue(text, 350);
  const pushed = useRef(query);
  const inputRef = useRef(null);

  useEffect(() => {
    const value = debounced.trim();
    if (value !== pushed.current) {
      pushed.current = value;
      onSearch(value);
    }
  }, [debounced, onSearch]);

  useEffect(() => {
    if (query !== pushed.current) {
      pushed.current = query;
      setText(query);
    }
  }, [query]);

  const submit = (event) => {
    event.preventDefault();
    const value = text.trim();
    if (value !== pushed.current) {
      pushed.current = value;
      onSearch(value);
    }
    inputRef.current?.blur(); 
  };

  const clear = () => {
    setText('');
    pushed.current = '';
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <form className="search" role="search" onSubmit={submit}>
      <SearchIcon className="search__icon" />
      <input
        ref={inputRef}
        type="search"
        className="search__input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search by movie title"
        aria-label="Search movies by title"
        autoComplete="off"
        spellCheck="false"
        enterKeyHint="search"
        maxLength={100}
      />
      {text && (
        <button type="button" className="icon-btn search__clear" aria-label="Clear search" onClick={clear}>
          <CloseIcon width={18} height={18} />
        </button>
      )}
    </form>
  );
}
