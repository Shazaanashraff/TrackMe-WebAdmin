import { Toaster as Sonner } from 'sonner';
import { useColorMode } from '@/theme/ColorMode';

function Toaster(props) {
  const { mode } = useColorMode();

  return (
    <Sonner
      theme={mode}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-surface group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-md group-[.toaster]:rounded-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-surface-muted group-[.toast]:text-muted-foreground',
          error: 'group-[.toaster]:text-status-danger',
          success: 'group-[.toaster]:text-status-settled',
          warning: 'group-[.toaster]:text-status-warning',
          info: 'group-[.toaster]:text-status-progress',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
