import { useNavigate } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage({ role }) {
  const navigate = useNavigate();
  const home = role === 'admin' ? '/manager/dashboard' : '/dashboard';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="h-16 w-16 rounded-2xl bg-surface-muted flex items-center justify-center">
        <MapPinOff className="h-8 w-8 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-2 max-w-sm">
        <p className="text-6xl font-bold font-heading text-primary opacity-30 leading-none">404</p>
        <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Button onClick={() => navigate(home)}>Go to dashboard</Button>
    </div>
  );
}
