const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// `inlineRem: false` keeps rem-based utilities (font sizes, spacing) as runtime
// values instead of baking them in at build time. That is what lets the Display
// settings screen scale the app through NativeWind's `rem` observable — see
// `hooks/use-display-preferences.ts`. NativeWind keeps its platform defaults
// (14 on native, 16 on web) as the 1x baseline.
module.exports = withNativeWind(config, { input: './src/global.css', inlineRem: false });
