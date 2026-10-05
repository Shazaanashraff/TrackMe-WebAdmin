import { useId, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isValidEmail } from './validation';

/**
 * Driver interest form: one email field.
 *
 * `onSubmit(email)` is supplied by the page once a backend endpoint exists. Until
 * then there is nothing to send the address to, so the form says so plainly
 * instead of pretending it was saved.
 */
export function LeadForm({ onSubmit }) {
  const fieldId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | invalid | sending | done | failed | unavailable
  // Honeypot: invisible to people, tempting to form-filling bots.
  const [trap, setTrap] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setStatus('invalid');
      return;
    }
    if (trap) {
      // A bot filled the hidden field. Look successful, send nothing.
      setStatus('done');
      return;
    }
    if (!onSubmit) {
      setStatus('unavailable');
      return;
    }
    setStatus('sending');
    try {
      await onSubmit(email.trim());
      setStatus('done');
    } catch {
      setStatus('failed');
    }
  };

  if (status === 'done') {
    return (
      <p
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-teal-300/30 bg-teal-300/10 p-4 text-sm text-teal-100"
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" aria-hidden="true" />
        Thanks. We&apos;ll email you the next steps for joining as a driver.
      </p>
    );
  }

  const message = {
    invalid: 'Enter a valid email address, like name@example.com.',
    failed: 'Something went wrong, so nothing was sent. Please try again.',
    unavailable: 'Driver sign-up is not connected yet, so nothing was sent.',
  }[status];

  return (
    <form onSubmit={handleSubmit} noValidate className="relative">
      <label htmlFor={fieldId} className="text-sm font-medium text-white/80">
        Your email
      </label>
      <input
        type="text"
        name="website"
        value={trap}
        onChange={(event) => setTrap(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id={fieldId}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status !== 'idle') setStatus('idle');
          }}
          placeholder="you@example.com"
          aria-invalid={status === 'invalid'}
          aria-describedby={message ? `${fieldId}-msg` : undefined}
          className={cn(
            'h-12 w-full shrink-0 rounded-full border sm:min-w-0 sm:flex-1 bg-white/5 px-5 text-base text-white placeholder:text-white/30',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300',
            status === 'invalid' ? 'border-red-400/70' : 'border-white/15',
          )}
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="group inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-teal-300 px-6 sm:w-auto text-sm font-semibold text-[#04211d] transition-colors hover:bg-teal-200 disabled:opacity-60"
        >
          {status === 'sending' ? 'Sending…' : 'Get driver access'}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </button>
      </div>
      {message ? (
        <p
          id={`${fieldId}-msg`}
          role={status === 'invalid' ? 'alert' : 'status'}
          className={cn('mt-3 text-sm', status === 'invalid' || status === 'failed' ? 'text-red-300' : 'text-amber-200')}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
