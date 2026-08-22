// Metro configuration.
// The `@/*` path alias is resolved from tsconfig.json — Expo's Metro config
// reads tsconfig `paths` natively, so no extra Babel plugin is required.
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Firebase JS interop ships .cjs modules; Metro needs them on the resolver list.
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = config;
