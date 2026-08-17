import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  pending = false,
  onConfirm,
  requireReason = false,
  // Optional character cap for the reason textarea. When set, blocks typing
  // past the limit (native textarea maxLength) and shows a live count;
  // when unset, the textarea is uncapped (existing callers keep prior behavior).
  reasonMaxLength,
  // Extra warning detail, rendered as a sibling of the description rather than
  // inside it: AlertDialogDescription is a <p>, so lists and callouts cannot
  // legally nest there.
  children,
  // Failure from the last onConfirm attempt. Passing this (instead of closing
  // the dialog on failure) lets the caller keep the dialog open so the typed
  // reason survives for a retry, with the failure surfaced inline rather than
  // only in a transient toast.
  error,
}) {
  const [reason, setReason] = useState('');
  const overLimit = reasonMaxLength != null && reason.length > reasonMaxLength;
  const canConfirm = (!requireReason || reason.trim().length > 0) && !overLimit;

  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  const handleConfirm = () => {
    if (!canConfirm || pending) return;
    onConfirm(requireReason ? reason : undefined);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {children}
        {error && (
          <p className="text-sm text-status-danger">
            {typeof error === 'string' ? error : error.message}
          </p>
        )}
        {requireReason && (
          <div>
            <Textarea
              placeholder="Reason (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px]"
              aria-label="Reason"
              maxLength={reasonMaxLength}
            />
            {reasonMaxLength != null && (
              <p
                className={cn(
                  'mt-1 text-right text-xs',
                  overLimit ? 'text-status-danger' : 'text-muted-foreground'
                )}
              >
                {overLimit
                  ? `Reason is too long (${reason.length}/${reasonMaxLength})`
                  : `${reason.length}/${reasonMaxLength}`}
              </p>
            )}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={pending || !canConfirm}
          >
            {pending && (
              <span
                className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
                aria-hidden
              />
            )}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
