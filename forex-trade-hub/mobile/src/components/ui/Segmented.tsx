import React from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from './AppText';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

export type SegmentedProps<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Renders as a horizontally scrolling chip row instead of a fixed control. */
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Filter control. Fixed segments for 2–3 options, scrolling chips beyond that.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  scrollable = false,
  style,
}: SegmentedProps<T>) {
  const theme = useTheme();

  const chip = (option: SegmentOption<T>, flexible: boolean) => {
    const active = option.value === value;
    return (
      <Pressable
        key={option.value}
        onPress={() => onChange(option.value)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        style={[
          styles.chip,
          flexible && styles.flex,
          {
            backgroundColor: active ? theme.colors.primaryMuted : 'transparent',
            borderColor: active ? theme.colors.primary : theme.colors.border,
            borderRadius: theme.radius.sm,
            paddingHorizontal: theme.spacing.md,
          },
        ]}
      >
        <AppText
          variant="captionStrong"
          color={active ? 'primary' : 'textSecondary'}
          numberOfLines={1}
        >
          {option.label}
          {option.count !== undefined ? `  ${option.count}` : ''}
        </AppText>
      </Pressable>
    );
  };

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollRow, style]}
      >
        {options.map((o) => chip(o, false))}
      </ScrollView>
    );
  }

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radius.md,
          padding: 4,
          borderWidth: theme.borderWidth.hairline,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      {options.map((o) => chip(o, true))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  scrollRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  flex: { flex: 1 },
  chip: {
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
