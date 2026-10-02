import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { PORTAL_SHOTS } from '../config';

export default function PortalScreen({ active = true }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % PORTAL_SHOTS.length), 3600);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div className="absolute inset-0">
      {PORTAL_SHOTS.map((shot, i) => (
        <img
          key={shot.src}
          src={shot.src}
          alt={shot.alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          aria-hidden={i !== index}
          className={cn(
            'absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-1000',
            i === index ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}
    </div>
  );
}
