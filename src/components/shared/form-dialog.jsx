import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function FormDialog({
  open,
  onOpenChange,
  title,
  children,
  onSubmit,
  pending = false,
  error,
  submitLabel = 'Save',
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(e);
          }}
          className="space-y-4 mt-2"
        >
          {children}
          {error && (
            <p className="text-sm text-status-danger">
              {typeof error === 'string' ? error : error.message}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && (
                <span
                  className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
                  aria-hidden
                />
              )}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
