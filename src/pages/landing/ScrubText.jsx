import { useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { scrubProgress, wordOpacity } from './scrub';

/**
 * A sentence that lights up word by word as it scrolls through the reading
 * zone of the viewport. The words are real text in the DOM at all times (screen
 * readers and search see the whole sentence); only their opacity moves. With
 * reduced motion everything is simply fully lit.
 */
export function ScrubText({ as: Tag = 'p', text, className, ...rest }) {
  const ref = useRef(null);
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  const words = text.split(' ');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (reduce) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      setProgress(scrubProgress(rect.top, rect.height, window.innerHeight));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduce]);

  return (
    <Tag ref={ref} className={className} {...rest}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          style={{ opacity: reduce ? 1 : wordOpacity(progress, index, words.length) }}
          className="transition-opacity duration-200"
        >
          {word}
          {index < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}
