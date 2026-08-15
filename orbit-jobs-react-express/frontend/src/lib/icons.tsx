/** Inline SVG icon set — identical paths to the original ui.js ICONS map. */

type P = { width?: number; height?: number };

export const IconPin = ({ width = 15, height = 15 }: P) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx={12} cy={10} r={3} /></svg>
);
export const IconClock = ({ width = 15, height = 15 }: P) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx={12} cy={12} r={9} /><path d="M12 7v5l3 2" /></svg>
);
export const IconWallet = ({ width = 15, height = 15 }: P) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x={3} y={6} width={18} height={13} rx={2} /><path d="M3 10h18" /></svg>
);
export const IconHeart = ({ width = 19, height = 19 }: P) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.5-1.5 2-3 2-4.5A4.5 4.5 0 0 0 16.5 5c-1.7 0-3.2.8-4.5 2.3C10.7 5.8 9.2 5 7.5 5A4.5 4.5 0 0 0 3 9.5c0 1.5.5 3 2 4.5l7 6.5 7-6.5Z" /></svg>
);
export const IconUser = ({ width = 19, height = 19 }: P) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx={12} cy={8} r={4} /><path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></svg>
);
export const IconMenu = ({ width = 21, height = 21 }: P) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const IconX = ({ width = 18, height = 18 }: P) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
);
export const IconChevR = ({ width = 14, height = 14 }: P) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7" /></svg>
);
export const IconChevD = ({ width = 13, height = 13 }: P) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="m5 9 7 7 7-7" /></svg>
);
export const IconCheck = ({ width = 16, height = 16 }: P) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="m4 12.5 5 5L20 6.5" /></svg>
);
export const IconSearch = ({ width = 17, height = 17 }: P) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx={11} cy={11} r={7} /><path d="m20 20-3.5-3.5" /></svg>
);

/** Orbit logo mark + wordmark (same markup/classes as the original chrome). */
export function Logo() {
  return (
    <>
      <span className="ring" aria-hidden="true">
        <svg width={24} height={24} viewBox="0 0 26 26" fill="none">
          <ellipse cx={13} cy={13} rx={11} ry={6.4} transform="rotate(-24 13 13)" stroke="#2FB39D" strokeWidth={1.8} />
          <circle cx={13} cy={13} r={4.4} fill="url(#oj-core)" />
          <circle cx={21.6} cy={7.2} r={2.3} fill="#C2622C" />
          <defs>
            <linearGradient id="oj-core" x1={9} y1={9} x2={17} y2={17}>
              <stop stopColor="#4CC4AC" /><stop offset={1} stopColor="#10897C" />
            </linearGradient>
          </defs>
        </svg>
      </span>
      <span className="l-word">Orbit Jobs<span className="l-sub">By Orbit Tech Lab</span></span>
    </>
  );
}
