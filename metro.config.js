
// Expo SDK 54 enables Node's package-exports resolution by default. Firebase
// JS SDK v11 ships its React-Native build (with `getReactNativePersistence`)
// only via the legacy `main`/`module` resolution path — its `package.json`
// `exports` block doesn't declare a `react-native` condition. With package
// exports on, Metro never finds the RN entry → `getReactNativePersistence`
// is undefined at runtime → auth falls back to in-memory persistence → the
// user is logged out at every cold start.
//
// Disabling package exports flips Metro back to pre-Expo-53 resolution,
// which honours the `react-native` field that Firebase still publishes.
// Reference: https://github.com/firebase/firebase-js-sdk/issues/8580
//
// Trade-off: a few rare libraries rely on package-exports-only resolution;
// none in this dependency tree do today (verified on SDK 54 + RN 0.81).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
