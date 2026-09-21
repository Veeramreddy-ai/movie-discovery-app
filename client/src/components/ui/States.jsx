import { AlertIcon, FilmIcon } from './Icons.jsx';

export function ErrorState({ title = 'Something went wrong', message, onRetry, retrying = false, compact = false }) {
  return (
    <div className={`state state--error${compact ? ' state--compact' : ''}`} role="alert">
      <AlertIcon width={compact ? 22 : 32} height={compact ? 22 : 32} />
      <div className="state__text">
        <h2 className="state__title">{title}</h2>
        {message && <p className="state__message">{message}</p>}
      </div>
      {onRetry && (
        <button type="button" className="btn btn--secondary" onClick={onRetry} disabled={retrying}>
          {retrying ? 'Trying again...' : 'Try again'}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="state">
      <FilmIcon width={32} height={32} />
      <div className="state__text">
        <h2 className="state__title">{title}</h2>
        {message && <p className="state__message">{message}</p>}
      </div>
      {action}
    </div>
  );
}

export function Notice({ children, tone = 'warn' }) {
  return (
    <p className={`notice notice--${tone}`} role="status">
      {children}
    </p>
  );
}
