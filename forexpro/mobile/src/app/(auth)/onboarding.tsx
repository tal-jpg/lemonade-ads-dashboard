import React, { useCallback, useRef, useState } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { useSettingsStore } from '../../store/settingsStore';
import { DEMO_MODE } from '../../config/demo';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'pulse-outline' as const,
    title: 'Signals with the full picture',
    body: 'Entry, stop loss and every take-profit level — with the analysis behind the trade, not just an alert.',
  },
  {
    icon: 'bar-chart-outline' as const,
    title: 'Market analysis that lands',
    body: 'A daily brief, key levels and the events that move your pairs, published before the session opens.',
  },
  {
    icon: 'school-outline' as const,
    title: 'Learn the way pros trade',
    body: 'A complete course from the basics through SMC and ICT, plus risk management and trading psychology.',
  },
  {
    icon: 'people-outline' as const,
    title: 'A private trading floor',
    body: 'Discuss setups with serious traders, vote in daily polls, and review the day together.',
  },
];

/**
 * First-run onboarding. Four screens, skippable at any point — the goal is to
 * set expectations, not to detain the user.
 */
export default function Onboarding() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const setOnboardingSeen = useSettingsStore((s) => s.setOnboardingSeen);

  const finish = useCallback(() => {
    setOnboardingSeen(true);
    router.replace(DEMO_MODE ? '/(tabs)' : '/(auth)/register');
  }, [router, setOnboardingSeen]);

  const next = useCallback(() => {
    if (index >= SLIDES.length - 1) {
      finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true });
    setIndex(index + 1);
  }, [finish, index]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / width);
    if (page !== index) setIndex(page);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <LinearGradient
        colors={[theme.colors.primaryMuted, 'transparent']}
        style={styles.glow}
        pointerEvents="none"
      />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={finish}
          hitSlop={theme.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
        >
          <AppText variant="captionStrong" color="textTertiary">
            Skip
          </AppText>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={styles.flex}
      >
        {SLIDES.map((slide, i) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <Animated.View entering={FadeInDown.delay(60).duration(420)}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: theme.colors.primaryMuted, borderRadius: theme.radius.xxl },
                ]}
              >
                <Ionicons name={slide.icon} size={44} color={theme.colors.primary} />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(140).duration(420)}>
              <AppText variant="h1" center style={{ marginTop: theme.spacing.xxl }}>
                {slide.title}
              </AppText>
              <AppText
                variant="body"
                color="textSecondary"
                center
                style={{ marginTop: theme.spacing.md, maxWidth: 320 }}
              >
                {slide.body}
              </AppText>
            </Animated.View>

            {i === SLIDES.length - 1 && (
              <AppText
                variant="caption"
                color="textTertiary"
                center
                style={{ marginTop: theme.spacing.xl, maxWidth: 300 }}
              >
                Educational content only. Trading carries significant risk and no profit is
                guaranteed.
              </AppText>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing.lg }]}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide.title}
              style={[
                styles.dot,
                {
                  width: i === index ? 22 : 7,
                  backgroundColor: i === index ? theme.colors.primary : theme.colors.borderStrong,
                },
              ]}
            />
          ))}
        </View>

        <Button
          label={index === SLIDES.length - 1 ? 'Create your account' : 'Continue'}
          onPress={next}
          icon={index === SLIDES.length - 1 ? undefined : 'arrow-forward'}
          iconPosition="right"
        />

        <Pressable
          onPress={() => {
            setOnboardingSeen(true);
            router.replace(DEMO_MODE ? '/(tabs)' : '/(auth)/login');
          }}
          style={{ marginTop: theme.spacing.base }}
          accessibilityRole="button"
        >
          <AppText variant="bodySm" color="textSecondary" center>
            Already have an account? <AppText variant="bodyStrong" color="primary">Sign in</AppText>
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 340 },
  topBar: { alignItems: 'flex-end', paddingHorizontal: 20 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  iconWrap: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 24 },
  dot: { height: 7, borderRadius: 4 },
});
