import { formatRating } from '../../utils/format.js';
import { StarIcon } from '../ui/Icons.jsx';

export function RatingBadge({ rating }) {
  const text = formatRating(rating);
  if (!text) return null;
  return (
    <span className="rating" title={`Average rating ${text} out of 10`}>
      <StarIcon width={13} height={13} />
      <span>{text}</span>
    </span>
  );
}
