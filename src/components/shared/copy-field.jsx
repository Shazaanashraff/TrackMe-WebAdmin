import { useState } from 'react';
import { Copy, Check, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function CopyField({ value, masked = false, onReveal, onCopy, className }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const write = onCopy
      ? () => Promise.resolve(onCopy(value))
      : () => navigator.clipboard?.writeText(value) ?? Promise.resolve();
    write().then(() => {
      setCopied(true);
      toast('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleReveal = () => {
    const next = !revealed;
    setRevealed(next);
    if (next) onReveal?.();
  };

  const display = masked && !revealed ? '••••••••' : value;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="flex-1 font-mono text-sm bg-surface-muted rounded-lg px-3 py-2 truncate border border-border select-all">
        {display}
      </span>
      {masked && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReveal}
          aria-label={revealed ? 'Hide value' : 'Reveal value'}
        >
          {revealed ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <Check className="h-4 w-4 text-status-settled" aria-hidden />
        ) : (
          <Copy className="h-4 w-4" aria-hidden />
        )}
      </Button>
    </div>
  );
}
