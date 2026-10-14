import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PORTAL_SHOTS } from '../config';

/**
 * The manager portal, as real captures. By default the shots cycle on their own while `active`.
 * With `scrubbed` they hold still and the page's scroll film plays them instead (see portal.js).
 */
export default function PortalScreen({ active = true, scrubbed = false }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active || scrubbed) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % PORTAL_SHOTS.length), 3600);
    return () => clearInterval(id);
  }, [active, scrubbed]);

  return (
    <div data-portal className="absolute inset-0">
      <div data-portal-pan className="absolute inset-0">
        {PORTAL_SHOTS.map((shot, i) => (
          <img
            key={shot.src}
            data-shot
            src={shot.src}
            alt={shot.alt}
            loading="lazy"
            decoding="async"
            draggable={false}
            aria-hidden={i !== index}
            className={cn(
              'absolute inset-0 h-full w-full object-cover object-top',
              !scrubbed && 'transition-opacity duration-1000',
              i === index ? 'opacity-100' : 'opacity-0',
            )}
          />
        ))}
      </div>

      {scrubbed && (
        <div
          data-toast
          aria-hidden="true"
          className="absolute bottom-[7%] right-[4%] flex items-center gap-2 rounded-full border border-white/15 bg-[#08161f]/90 py-1.5 pl-2 pr-4 text-[11px] font-medium text-white opacity-0 shadow-[0_12px_30px_-10px_rgb(0_0_0/0.8)]"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-300 text-[#04211d]">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          Join request approved
        </div>
      )}
    </div>
  );
}
