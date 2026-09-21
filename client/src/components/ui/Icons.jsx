const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

export const HeartIcon = ({ filled = false, ...props }) => (
  <svg {...base} {...props} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.3 4.8 6.6 4.8c2 0 3.4 1.1 4.2 2.4l1.2 1.9 1.2-1.9c.8-1.3 2.2-2.4 4.2-2.4 3.3 0 5.1 3.2 3.9 6.5-1.8 4.6-9.3 9.2-9.3 9.2Z" />
  </svg>
);

export const SearchIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </svg>
);

export const CloseIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const StarIcon = (props) => (
  <svg {...base} {...props} fill="currentColor" strokeWidth="1">
    <path d="m12 3.2 2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9L3.4 9.5l6-.8L12 3.2Z" />
  </svg>
);

export const FilmIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
  </svg>
);

export const ArrowLeftIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

export const PlayIcon = (props) => (
  <svg {...base} {...props} fill="currentColor" strokeWidth="1">
    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
  </svg>
);

export const AlertIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 3.5 2.5 20h19L12 3.5Z" />
    <path d="M12 10v4.5M12 17.4v.1" />
  </svg>
);
