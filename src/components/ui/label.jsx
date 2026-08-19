import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

const Label = React.forwardRef(({ className, required, children, ...props }, ref) => (
  <>
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    >
      {children}
    </LabelPrimitive.Root>
    {/* Rendered as a sibling, not nested inside the <label>, so the label's own
        text stays exactly `children` — nesting it would fold " *" into
        `label.textContent`, which is what testing-library's getByLabelText
        matches against, breaking exact/anchored queries like /^password$/i.
        aria-hidden keeps it decorative; the real "required" signal for
        assistive tech is `aria-required` on the associated form control. */}
    {required ? <span className="text-destructive" aria-hidden="true"> *</span> : null}
  </>
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
