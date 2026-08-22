import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeProvider';
import { AmbientGlow } from './AmbientGlow';

export type ScreenProps = {
  children: React.ReactNode;
  /** Wraps content in a ScrollView. Turn off for screens with their own list. */
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  /** Adds bottom padding so content clears the tab bar. */
  tabBarPadding?: boolean;
  edges?: { top?: boolean; bottom?: boolean };
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Screen shell: safe-area handling, background colour and pull-to-refresh.
 *
 * Using this everywhere is what keeps horizontal padding and the tab-bar gap
 * identical across the app.
 */
export function Screen({
  children,
  scroll = false,
  refreshing = false,
  onRefresh,
  padded = true,
  tabBarPadding = false,
  edges = { top: true, bottom: false },
  style,
  contentStyle,
  testID,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const paddingTop = edges.top ? insets.top : 0;
  const paddingBottom =
    (edges.bottom ? insets.bottom : 0) + (tabBarPadding ? theme.layout.tabBarHeight + 16 : 0);

  const inner: StyleProp<ViewStyle> = [
    padded && { paddingHorizontal: theme.layout.screenPadding },
    contentStyle,
  ];

  if (scroll) {
    return (
      <View
        testID={testID}
        style={[styles.flex, { backgroundColor: theme.colors.bg, paddingTop }, style]}
      >
        <LinearGradient
          colors={theme.colors.bgGradient as unknown as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <AmbientGlow />
        <ScrollView
          contentContainerStyle={[inner, { paddingBottom: paddingBottom + theme.spacing.xl }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
                progressBackgroundColor={theme.colors.surface}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      testID={testID}
      style={[styles.flex, { backgroundColor: theme.colors.bg, paddingTop, paddingBottom }, style]}
    >
      <LinearGradient
        colors={theme.colors.bgGradient as unknown as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <AmbientGlow />
      <View style={[styles.flex, inner]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
