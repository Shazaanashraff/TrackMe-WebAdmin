import { Reveal } from './Reveal';
import { ScrubText } from './ScrubText';
import { POINTS, STATEMENT } from './config';

/**
 * The light, paper-coloured break between the dark hero and the dark story.
 * One big sentence that lights up as you read it, then three short points.
 * It overlaps the hero's bottom edge with rounded corners, like a card
 * sliding over it.
 */
export function WhatSection() {
  return (
    <section
      id="what"
      aria-labelledby="what-heading"
      className="relative z-10 -mt-8 rounded-t-[2.5rem] bg-l-bone px-4 pb-24 pt-24 text-l-ink sm:-mt-12 sm:rounded-t-[4rem] sm:px-8 sm:pb-36 sm:pt-36"
    >
      <div className="mx-auto max-w-[90rem]">
        <ScrubText
          as="h2"
          id="what-heading"
          text={STATEMENT}
          className="font-display max-w-6xl text-[clamp(2.2rem,6.4vw,6.4rem)] font-semibold leading-[1.02]"
        />

        <ul className="mt-16 grid gap-10 border-t border-l-ink/15 pt-10 sm:mt-24 sm:grid-cols-3 sm:gap-8">
          {POINTS.map((point, index) => (
            <Reveal as="li" key={point.key} delay={index * 90}>
              <span className="font-mono text-sm text-l-petrol">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="font-display mt-5 text-3xl font-semibold sm:text-4xl">{point.title}</h3>
              <p className="mt-2 text-lg text-l-ink/60">{point.body}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
