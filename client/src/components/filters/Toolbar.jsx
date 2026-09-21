import { SORT_OPTIONS } from '../../hooks/useBrowseFilters.js';
import { SelectField } from '../ui/SelectField.jsx';

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1919 }, (_, i) => THIS_YEAR - i);
const RATINGS = [5, 6, 7, 8, 9];

/**
 * Sort / year / rating controls. While a text search is active TMDB returns results by relevance and cannot
 * sort them, so the sort control says so instead of offering choices that would silently do nothing.
 */
export function Toolbar({ filters, onChange, onClear, canClear }) {
  const searching = filters.query.length > 0;

  return (
    <div className="toolbar">
      <SelectField
        label="Sort by"
        value={searching ? 'relevance' : filters.sort}
        disabled={searching}
        onChange={(e) => onChange({ sort: e.target.value })}
      >
        {searching ? (
          <option value="relevance">Best match</option>
        ) : (
          SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))
        )}
      </SelectField>

      <SelectField
        label="Year"
        value={filters.year ?? ''}
        onChange={(e) => onChange({ year: e.target.value ? Number(e.target.value) : undefined })}
      >
        <option value="">Any year</option>
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Rating"
        value={filters.minRating ?? ''}
        onChange={(e) => onChange({ minRating: e.target.value ? Number(e.target.value) : undefined })}
      >
        <option value="">Any rating</option>
        {RATINGS.map((r) => (
          <option key={r} value={r}>
            {r}+ out of 10
          </option>
        ))}
      </SelectField>

      {canClear && (
        <button type="button" className="link-btn toolbar__clear" onClick={onClear}>
          Clear all
        </button>
      )}
    </div>
  );
}
