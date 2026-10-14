import { useEffect, useRef } from 'react';

/**
 * The hero's moving picture when there is a film clip: a muted, looping video that is paused when
 * the hero is off screen (no battery spent on a scene nobody can see). Visitors who prefer reduced
 * motion get a still instead, with no video at all. If the clip cannot play, the browser simply
 * keeps showing the poster.
 *
 * `clip` is the chosen file and its pictures (see heroVideo.js).
 *
 * `watch` is a ref to the element whose visibility decides whether the clip should be playing.
 * `box` is where the clip sits on the stage ({ left, top, width, height }, from `coverGeometry`): it
 * is the whole clip, scaled until it covers the stage, so what is cropped off the edges is still
 * there to be slid into view. (`object-fit: cover` would throw it away.)
 */
export function HeroFilm({ clip, animated, watch, box }) {
  const place = { left: box.left, top: box.top, width: box.width, height: box.height };
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !animated) return undefined;

    el.muted = true; // React sets the property, not the attribute; autoplay needs both
    const play = () => {
      const started = el.play?.();
      if (started && started.catch) started.catch(() => {});
    };
    play();

    let observer;
    if (typeof IntersectionObserver !== 'undefined' && watch?.current) {
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) play();
        else el.pause?.();
      });
      observer.observe(watch.current);
    }
    return () => observer?.disconnect();
  }, [animated, clip.src, watch]);

  if (!animated) {
    return (
      <img src={clip.still} alt="" aria-hidden="true" className="absolute max-w-none" style={place} />
    );
  }

  return (
    <video
      key={clip.src}
      ref={ref}
      className="absolute max-w-none"
      style={place}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster={clip.poster}
      aria-hidden="true"
    >
      <source src={clip.src} type="video/mp4" />
    </video>
  );
}
