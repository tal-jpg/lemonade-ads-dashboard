import React from 'react';

/**
 * The landing hero's product visual: a live-looking XAU/USD chart.
 *
 * Everything is drawn from the OHLC series below, so the candles, the moving
 * average, the volume strip and the level markers all agree with each other —
 * the picture stays honest instead of being decorative shapes.
 */

type Candle = [open: number, high: number, low: number, close: number];

const CANDLES: Candle[] = [
  [2381.0, 2384.29, 2379.87, 2383.23], [2383.23, 2388.37, 2382.6, 2385.78], [2385.78, 2391.84, 2384.85, 2389.31],
  [2389.31, 2391.79, 2387.2, 2390.64], [2390.64, 2396.05, 2390.19, 2393.91], [2393.91, 2395.5, 2391.93, 2394.15],
  [2394.15, 2397.23, 2393.73, 2396.33], [2396.33, 2399.19, 2393.94, 2398.45], [2398.45, 2399.83, 2394.7, 2397.22],
  [2397.22, 2399.4, 2394.61, 2396.02], [2396.02, 2397.29, 2392.17, 2394.37], [2394.37, 2396.61, 2389.72, 2391.74],
  [2391.74, 2395.22, 2390.66, 2394.59], [2394.59, 2400.14, 2393.28, 2398.39], [2398.39, 2401.51, 2397.67, 2399.18],
  [2399.18, 2402.81, 2398.3, 2401.51], [2401.51, 2403.41, 2400.51, 2402.78], [2402.78, 2407.17, 2401.08, 2406.25],
  [2406.25, 2411.33, 2404.43, 2409.0], [2409.0, 2411.25, 2407.47, 2410.83], [2410.83, 2414.99, 2409.35, 2412.45],
  [2412.45, 2417.07, 2411.02, 2415.36], [2415.36, 2417.87, 2413.33, 2416.59], [2416.59, 2417.56, 2414.4, 2416.4],
  [2416.4, 2418.83, 2414.79, 2418.42], [2418.42, 2420.57, 2416.38, 2419.59], [2419.59, 2424.38, 2418.48, 2422.11],
  [2422.11, 2422.84, 2420.35, 2422.26], [2422.26, 2427.49, 2419.89, 2425.02], [2425.02, 2426.69, 2422.8, 2425.47],
];

const ENTRY = 2412.5;
const STOP = 2398.0;
const TARGET = 2431.0;

// viewBox geometry
const W = 660;
const H = 340;
const PAD = { top: 16, right: 78, bottom: 54, left: 14 };
const PLOT_H = 214;
const VOL_TOP = PAD.top + PLOT_H + 16;
const VOL_H = 34;

const plotW = W - PAD.left - PAD.right;
const step = plotW / CANDLES.length;
const bodyW = Math.min(11, step * 0.58);

const lows = CANDLES.map((c) => c[2]);
const highs = CANDLES.map((c) => c[1]);
const min = Math.min(...lows, STOP) - 3;
const max = Math.max(...highs, TARGET) + 3;

const y = (price: number) => PAD.top + ((max - price) / (max - min)) * PLOT_H;
const x = (i: number) => PAD.left + i * step + step / 2;

/** 5-period moving average — the smooth line over the candles. */
const MA_PERIOD = 5;
const ma = CANDLES.map((_, i) => {
  if (i < MA_PERIOD - 1) return null;
  const slice = CANDLES.slice(i - MA_PERIOD + 1, i + 1);
  return slice.reduce((sum, c) => sum + c[3], 0) / MA_PERIOD;
});
const maPoints = ma
  .map((value, i) => (value === null ? null : `${x(i).toFixed(1)},${y(value).toFixed(1)}`))
  .filter(Boolean) as string[];

/** Volume derived from each candle's range, so the strip tracks the price action. */
const ranges = CANDLES.map((c) => c[1] - c[2]);
const maxRange = Math.max(...ranges);

const last = CANDLES[CANDLES.length - 1];
const changePct = ((last[3] - CANDLES[0][0]) / CANDLES[0][0]) * 100;

function Level({
  price,
  label,
  color,
  dash = '5 4',
}: {
  price: number;
  label: string;
  color: string;
  dash?: string;
}) {
  const ly = y(price);
  return (
    <g>
      <line x1={PAD.left} y1={ly} x2={W - PAD.right + 4} y2={ly} stroke={color} strokeWidth={1} strokeDasharray={dash} opacity={0.75} />
      <rect x={W - PAD.right + 8} y={ly - 9} width={62} height={18} rx={4} fill={color} opacity={0.16} />
      <text x={W - PAD.right + 14} y={ly + 4} fill={color} fontSize={10} fontWeight={700} letterSpacing="0.3">
        {label}
      </text>
    </g>
  );
}

export function HeroChart() {
  return (
    <div className="hero-chart">
      <div className="hc-head">
        <div className="hc-pair">
          <span className="sym">XAU/USD</span>
          <span className="name">Gold Spot · M15</span>
        </div>
        <div className="hc-price">
          <span className="v">{last[3].toFixed(2)}</span>
          <span className="badge badge-profit">▲ {changePct.toFixed(2)}%</span>
        </div>
      </div>

      <div className="hc-tf">
        {['M15', 'H1', 'H4', 'D1'].map((tf) => (
          <span key={tf} className={tf === 'M15' ? 'on' : undefined}>
            {tf}
          </span>
        ))}
        <span className="live">
          <i /> Live
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="hc-svg" role="img"
           aria-label="XAU/USD 15-minute candlestick chart with entry, stop loss and take-profit levels">
        <defs>
          <linearGradient id="hcArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#00D4FF" stopOpacity="0.22" />
            <stop offset="1" stopColor="#00D4FF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* price grid — the axis label is dropped where a level pill sits, so the
            two never overprint each other on the right-hand gutter */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const gy = PAD.top + t * PLOT_H;
          const price = max - t * (max - min);
          const clash = [TARGET, ENTRY, STOP].some((level) => Math.abs(y(level) - gy) < 15);
          return (
            <g key={t}>
              <line x1={PAD.left} y1={gy} x2={W - PAD.right + 4} y2={gy} stroke="rgba(148,163,184,0.08)" strokeWidth={1} />
              {!clash && (
                <text x={W - PAD.right + 10} y={gy + 3.5} fill="#4B6075" fontSize={9.5} fontFamily="ui-monospace, monospace">
                  {price.toFixed(0)}
                </text>
              )}
            </g>
          );
        })}

        {/* the zone the trade is working in */}
        <rect x={PAD.left} y={y(TARGET)} width={plotW + 4} height={y(ENTRY) - y(TARGET)} fill="#22C55E" opacity={0.05} />
        <rect x={PAD.left} y={y(ENTRY)} width={plotW + 4} height={y(STOP) - y(ENTRY)} fill="#EF4444" opacity={0.05} />

        {/* moving average, with a soft wash beneath it */}
        <polygon
          fill="url(#hcArea)"
          points={`${maPoints[0].split(',')[0]},${PAD.top + PLOT_H} ${maPoints.join(' ')} ${
            maPoints[maPoints.length - 1].split(',')[0]
          },${PAD.top + PLOT_H}`}
        />
        <polyline fill="none" stroke="#00D4FF" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" points={maPoints.join(' ')} opacity={0.9} />

        {/* candles */}
        {CANDLES.map((candle, i) => {
          const [o, h, l, c] = candle;
          const up = c >= o;
          const colour = up ? '#22C55E' : '#EF4444';
          const cx = x(i);
          const top = y(Math.max(o, c));
          const height = Math.max(1.5, Math.abs(y(o) - y(c)));
          return (
            <g key={i}>
              <line x1={cx} y1={y(h)} x2={cx} y2={y(l)} stroke={colour} strokeWidth={1.1} opacity={0.9} />
              <rect x={cx - bodyW / 2} y={top} width={bodyW} height={height} rx={1.5} fill={colour} opacity={up ? 0.92 : 0.88} />
            </g>
          );
        })}

        {/* levels */}
        <Level price={TARGET} label="TP 2431.00" color="#22C55E" />
        <Level price={ENTRY} label="ENTRY" color="#00D4FF" dash="6 3" />
        <Level price={STOP} label="SL 2398.00" color="#EF4444" />

        {/* last price marker */}
        <circle cx={x(CANDLES.length - 1)} cy={y(last[3])} r={3.6} fill="#00D4FF" />
        <circle cx={x(CANDLES.length - 1)} cy={y(last[3])} r={7.5} fill="#00D4FF" opacity={0.18} />

        {/* volume */}
        {CANDLES.map((candle, i) => {
          const up = candle[3] >= candle[0];
          const h = Math.max(2, ((candle[1] - candle[2]) / maxRange) * VOL_H);
          return (
            <rect key={i} x={x(i) - bodyW / 2} y={VOL_TOP + VOL_H - h} width={bodyW} height={h} rx={1}
                  fill={up ? '#22C55E' : '#EF4444'} opacity={0.28} />
          );
        })}

        {/* session ticks */}
        {['09:00', '11:00', '13:00', '15:00'].map((label, i) => (
          <text key={label} x={PAD.left + 12 + i * (plotW / 4)} y={H - 16} fill="#4B6075" fontSize={9.5} fontFamily="ui-monospace, monospace">
            {label}
          </text>
        ))}
      </svg>

      <div className="hc-foot">
        <span>
          Risk / reward <b>1 : 2.4</b>
        </span>
        <span>London session · published 08:14</span>
      </div>

      <div className="hc-chip">
        <span className="badge badge-profit">TP1 hit</span>
        <b>+186 pips</b>
      </div>
    </div>
  );
}
