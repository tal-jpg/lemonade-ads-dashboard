import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from './AppText';
import { initials } from '../../utils/format';

export type AvatarProps = {
  name?: string | null;
  uri?: string | null;
  size?: number;
  /** Draws an emerald ring — used to mark premium members. */
  ring?: boolean;
  ringColor?: string;
  online?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Profile picture with an initials fallback.
 *
 * The fallback colour is derived from the name so a given member always gets
 * the same tile — recognisable at a glance in a busy chat.
 */
export function Avatar({ name, uri, size = 40, ring, ringColor, online, style }: AvatarProps) {
  const theme = useTheme();

  const palette = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.info,
    theme.colors.warning,
    theme.colors.premium,
  ];
  const hash = (name ?? '?').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const tint = palette[hash % palette.length];

  const dimension = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[style, ring && { padding: 2, borderRadius: (size + 4) / 2, borderWidth: 1.5, borderColor: ringColor ?? theme.colors.premium }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={dimension}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
          accessibilityLabel={name ? `${name} profile picture` : 'Profile picture'}
        />
      ) : (
        <View
          style={[
            dimension,
            styles.fallback,
            { backgroundColor: theme.isDark ? `${tint}26` : `${tint}1F`, borderColor: `${tint}55` },
          ]}
        >
          <AppText
            variant={size >= 56 ? 'h3' : size >= 36 ? 'captionStrong' : 'overline'}
            tint={tint}
          >
            {initials(name)}
          </AppText>
        </View>
      )}

      {online && (
        <View
          style={[
            styles.presence,
            {
              backgroundColor: theme.colors.profit,
              borderColor: theme.colors.bg,
              width: Math.max(8, size * 0.26),
              height: Math.max(8, size * 0.26),
              borderRadius: Math.max(8, size * 0.26) / 2,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  presence: { position: 'absolute', right: 0, bottom: 0, borderWidth: 2 },
});
