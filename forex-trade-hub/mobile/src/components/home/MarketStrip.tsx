import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../ui/AppText';
import { Sparkline } from '../ui/Sparkline';
import { Skeleton } from '../ui/Skeleton';
import { TrendPill } from '../ui/Common';
import { deltaColor } from '../../theme/colors';
import { formatPairLabel, formatPrice } from '../../utils/format';
import type { MarketQuote } from '../../types/models';

/**
 * Horizontal market snapshot.
 *
 * Each tile carries price, change and a 24-point sparkline so the direction is
 * readable without opening anything.
 */
export function MarketStrip({
  quotes,
  loading,
  isDemo,
}: {
  quotes: MarketQuote[];
  loading: boolean;
  isDemo: boolean;
}) {
  const theme = useTheme();

  if (loading) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width={148} height={92} radius={theme.radius.md} />
        ))}
      </ScrollView>
    );
  }

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {quotes.map((quote) => {
          const tint = deltaColor(theme.colors, quote.changePct);
          return (
            <View
              key={quote.symbol}
              style={[
                styles.tile,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                },
              ]}
            >
              <View style={styles.tileHeader}>
                <AppText variant="captionStrong" color="textSecondary">
                  {formatPairLabel(quote.displayName || quote.symbol)}
                </AppText>
                <AppText variant="overline" tint={tint}>
                  {quote.changePct > 0 ? 'BULL' : quote.changePct < 0 ? 'BEAR' : 'FLAT'}
                </AppText>
              </View>

              <AppText variant="price" style={{ marginTop: 6 }}>
                {formatPrice(quote.price, quote.digits)}
              </AppText>

              <View style={styles.tileFooter}>
                <TrendPill value={quote.changePct} compact />
                <Sparkline data={quote.sparkline} width={58} height={22} color={tint} />
              </View>
            </View>
          );
        })}
      </ScrollView>

      {isDemo && (
        <AppText variant="caption" color="textTertiary" style={{ marginTop: 8 }}>
          Demo prices — connect a market data feed to show live quotes.
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, paddingRight: 16 },
  tile: { width: 148, borderWidth: StyleSheet.hairlineWidth },
  tileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
});
