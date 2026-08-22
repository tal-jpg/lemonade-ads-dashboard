/**
 * Demo mode.
 *
 * When enabled, the app runs entirely offline against an in-memory dataset:
 * no Firebase project, no network, no sign-in required. It exists so a test
 * build can be handed to someone and simply work.
 *
 * Enable by setting EXPO_PUBLIC_DEMO_MODE=1 at build time (see .env.example).
 * Expo inlines EXPO_PUBLIC_* at bundle time, so this is a compile-time constant
 * and the demo dataset is tree-shaken out of a production bundle.
 *
 * Every behaviour that would touch Firebase branches on this flag at the
 * repository layer, so screens, hooks and components are identical in both
 * modes — what you test in the demo build is the real UI.
 */
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === '1';

/** Shown in the UI so a demo build can never be mistaken for live data. */
export const DEMO_BANNER_TEXT = 'Demo build — sample data, no live prices or trades';
