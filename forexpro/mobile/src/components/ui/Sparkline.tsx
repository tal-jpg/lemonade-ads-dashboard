import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';

export type SparklineProps = {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  /** Fills the area under the line with a fading gradient. */
  filled?: boolean;
  strokeWidth?: number;
};

/**
 * Compact price chart.
 *
 * Hand-rolled on react-native-svg rather than a charting library: it is ~60
 * lines, has no layout engine to fight, and renders dozens of instances in a
 * scrolling list without dropping frames.
 */
export function Sparkline({
  data,
  width = 72,
  height = 28,
  color,
  filled = true,
  strokeWidth = 1.6,
}: SparklineProps) {
  const theme = useTheme();

  const { line, area } = useMemo(() => {
    if (data.length < 2) return { line: '', area: '' };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const stepX = width / (data.length - 1);
    // Inset vertically so the stroke is not clipped at the extremes.
    const pad = strokeWidth;
    const usable = height - pad * 2;

    const points = data.map((value, i) => {
      const x = i * stepX;
      const y = pad + usable - ((value - min) / span) * usable;
      return [x, y] as const;
    });

    const linePath = points
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
      .join(' ');

    const areaPath = `${linePath} L${width.toFixed(2)},${height} L0,${height} Z`;

    return { line: linePath, area: areaPath };
  }, [data, width, height, strokeWidth]);

  if (!line) return <View style={{ width, height }} />;

  const stroke = color ?? theme.colors.primary;
  const gradientId = `spark-${stroke.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <Svg width={width} height={height} pointerEvents="none">
      {filled && (
        <Defs>
          <SvgGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={stroke} stopOpacity={0.28} />
            <Stop offset="1" stopColor={stroke} stopOpacity={0} />
          </SvgGradient>
        </Defs>
      )}
      {filled && <Path d={area} fill={`url(#${gradientId})`} />}
      <Path
        d={line}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
