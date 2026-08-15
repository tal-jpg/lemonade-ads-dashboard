/** Hero background video that honours prefers-reduced-motion (poster frame stays). */
import { useEffect, useRef } from "react";

export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (v && matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.autoplay = false;
      v.pause();
      v.addEventListener("loadeddata", () => v.pause(), { once: true });
    }
  }, []);
  return (
    <video ref={ref} className="hero-bg" autoPlay muted loop playsInline preload="metadata" poster="/media/hero-poster.jpg" aria-hidden="true" tabIndex={-1}>
      <source src="/media/hero.mp4" type="video/mp4" />
      <source src="/media/hero.webm" type="video/webm" />
    </video>
  );
}
