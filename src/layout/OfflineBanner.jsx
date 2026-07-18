import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [showRestored, setShowRestored] = useState(false);
  const [everWentOffline, setEverWentOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setEverWentOffline(true);
      setShowRestored(false);
    }
    if (isOnline && everWentOffline) {
      setShowRestored(true);
      const t = setTimeout(() => setShowRestored(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isOnline, everWentOffline]);

  if (isOnline && !showRestored) return null;

  if (showRestored) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 bg-status-success text-white text-sm font-medium"
      >
        <Wifi className="h-4 w-4" aria-hidden />
        Back online
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 bg-status-warning text-white text-sm font-medium"
    >
      <WifiOff className="h-4 w-4" aria-hidden />
      No internet connection — data shown may be outdated
    </div>
  );
}
