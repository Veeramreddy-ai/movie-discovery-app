import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/States.jsx';

export default function NotFoundPage() {
  return (
    <div className="page">
      <EmptyState
        title="Page not found"
        message="That address doesn't lead anywhere."
        action={
          <Link className="btn btn--secondary" to="/">
            Go to Discover
          </Link>
        }
      />
    </div>
  );
}
