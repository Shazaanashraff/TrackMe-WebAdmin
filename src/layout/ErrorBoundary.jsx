import React from 'react';
import { Button } from '@/components/ui/button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-lg font-bold font-heading">T</span>
          </div>
          <div className="space-y-2 max-w-sm">
            <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. Reload the page to try again.
            </p>
          </div>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
