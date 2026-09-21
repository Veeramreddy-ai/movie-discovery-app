export function SelectField({ label, value, onChange, disabled = false, children }) {
  return (
    <label className={`select${disabled ? ' is-disabled' : ''}`}>
      <span className="select__label">{label}</span>
      <select value={value} onChange={onChange} disabled={disabled}>
        {children}
      </select>
    </label>
  );
}
