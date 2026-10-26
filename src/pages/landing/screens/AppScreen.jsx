import { APP_SHOTS } from '../config';

/**
 * One real screen of the Pingo driver app, as a picture that fills the phone's screen. The pictures are
 * captures of the actual app (see APP_SHOTS in config.js), so what a visitor sees in the phone is
 * what a driver gets. Its alt text says what it is. The picture sits below the camera notch; the strip
 * above it is the colour the picture starts with, so it reads as the app's own header.
 */
export default function AppScreen({ shot }) {
  const { src, alt, tint } = APP_SHOTS[shot];
  return (
    <div className="absolute inset-0" style={{ backgroundColor: tint }}>
      <div className="absolute inset-x-0 bottom-0 top-[26px] overflow-hidden">
        <img
          data-app-shot
          src={src}
          alt={alt}
          draggable="false"
          className="h-full w-full select-none object-fill"
        />
      </div>
    </div>
  );
}
