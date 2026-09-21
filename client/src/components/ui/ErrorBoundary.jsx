import { Component } from 'react';
import { ErrorState } from './States.jsx';


export class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="page">
        <ErrorState
          title="This page hit an unexpected problem"
          message="Reloading usually fixes it. Your wishlist is safe."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }
}
