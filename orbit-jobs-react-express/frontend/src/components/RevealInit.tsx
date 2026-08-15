/**
 * Scroll-reveal + count-up boot, ported from ui.js. Runs once per navigation:
 * observes .reveal elements and [data-count] counters anywhere in the page.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function RevealInit() {
  const { pathname } = useLocation();

  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>(".reveal:not(.in)")];
    if (!("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
    const pending = new Set(els);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en, i) => {
        const el = en.target as HTMLElement;
        const done = (delay: number) => {
          if (!pending.has(el)) return;
          pending.delete(el); io.unobserve(el);
          if (delay) setTimeout(() => el.classList.add("in"), delay); else el.classList.add("in");
        };
        if (en.isIntersecting) done((i % 6) * 70);
        else if (en.boundingClientRect.bottom < 0) done(0);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => pending.forEach((el) => {
        if (el.getBoundingClientRect().bottom < 0) { pending.delete(el); io.unobserve(el); el.classList.add("in"); }
      }), 160);
    };
    addEventListener("scroll", onScroll, { passive: true });
    els.forEach((el) => io.observe(el));
    return () => { io.disconnect(); removeEventListener("scroll", onScroll); clearTimeout(t); };
  }, [pathname]);

  return null;
}

/** Animated counter — renders the target immediately, counts up when scrolled into view. */
export function CountUp({ value, suffix = "", id }: { value: number; suffix?: string; id?: string }) {
  useEffect(() => {
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = value;
    const settle = () => { el.textContent = target.toLocaleString("en-GB") + suffix; };
    if (reduced || !("IntersectionObserver" in window)) { settle(); return; }
    el.textContent = "0" + suffix;
    let fired = false;
    const io = new IntersectionObserver((ents) => {
      const en = ents[ents.length - 1];
      if (en.isIntersecting && !fired) {
        fired = true;
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / 1400);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString("en-GB") + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      } else if (en.boundingClientRect.bottom < 0 && !fired) { fired = true; settle(); io.disconnect(); }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [value, suffix, id]);
  return <span id={id}>{value.toLocaleString("en-GB") + suffix}</span>;
}

/** Rotating hero word. */
export function Rotator({ words }: { words: string[] }) {
  useEffect(() => {
    const el = document.getElementById("rotator");
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = words[0]; return; }
    let i = 0;
    const iv = setInterval(() => {
      el.style.transition = "opacity .3s ease, transform .3s ease";
      el.style.opacity = "0"; el.style.transform = "translateY(6px)";
      setTimeout(() => {
        i = (i + 1) % words.length;
        el.textContent = words[i];
        el.style.opacity = "1"; el.style.transform = "none";
      }, 300);
    }, 3400);
    return () => clearInterval(iv);
  }, [words]);
  return <span id="rotator">{words[0]}</span>;
}
