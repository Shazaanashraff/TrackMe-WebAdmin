import { cn } from '@/lib/utils';

/** A phone bezel. Children fill the screen; the caller sizes the frame by width. */
export function PhoneFrame({ children, className }) {
  return (
    <div
      className={cn(
        'relative aspect-[9/18.5] w-[min(300px,76vw)] rounded-[2.8rem] border border-white/20 bg-[#02080a] p-[9px]',
        'shadow-[0_40px_90px_-30px_rgb(45_212_191/0.45),0_0_0_1px_rgb(255_255_255/0.04),inset_0_0_0_1px_rgb(255_255_255/0.06)]',
        className,
      )}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[2.25rem] bg-[#0a1316]">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-2 z-30 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-black"
        />
        {children}
      </div>
    </div>
  );
}

/** A laptop: lid with a screen, and a thin base. */
export function LaptopFrame({ children, className }) {
  return (
    <div className={cn('relative w-[min(640px,92vw)]', className)}>
      <div className="rounded-t-2xl border border-white/20 bg-[#02080a] p-[10px] shadow-[0_40px_90px_-30px_rgb(45_212_191/0.4)]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-[#0a1316]">{children}</div>
      </div>
      <div
        aria-hidden="true"
        className="mx-auto h-3 w-[108%] -translate-x-[3.7%] rounded-b-2xl border-x border-b border-white/15 bg-gradient-to-b from-[#1b2a2f] to-[#0b1417]"
      />
    </div>
  );
}
