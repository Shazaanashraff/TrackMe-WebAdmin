import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Fades its children up the first time they scroll into view. Without
 * IntersectionObserver (jsdom, very old browsers) it renders visible at once,
 * so content is never stranded at opacity 0.
 */
export function Reveal({ as: Tag = 'div', delay = 0, className, children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const node = ref.current;
    if (shown || !node) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shown]);

  return (
    <Tag
      ref={ref}
      data-in={shown}
      style={{ '--d': `${delay}ms` }}
      className={cn('l-reveal', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
