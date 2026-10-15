// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // NativeWind's native interop identity-checks these props on every render
      // and dispatches from inside the render body when the check fails, so an
      // inline object literal hangs the app on any state change. On web the
      // separate react-native-css-interop/web runtime never evaluates the guard,
      // which is why this only ever reproduces on device.
      //
      // Hoist static styles into StyleSheet.create, memoize dynamic ones, or
      // use contentContainerClassName for scroll/flat-list containers.
      "no-restricted-syntax": [
        "error",
        {
          // NativeWind remaps contentContainerClassName -> contentContainerStyle
          // on ScrollView/FlatList, so the interop identity-checks that prop too.
          selector:
            "JSXAttribute[name.name='contentContainerStyle'] > JSXExpressionContainer > ObjectExpression",
          message:
            "Inline contentContainerStyle={{...}} objects hang the app on native for the same reason. Use contentContainerClassName=\"p-5 gap-3\" instead.",
        },
        // Only core components, which NativeWind wraps. Third-party ones (expo-image's
        // Image, expo-symbols' SymbolView, Animated, Dialog internals) take a style
        // prop straight through to native and are not subject to the interop, so
        // flagging them would be noise.
        {
          selector:
            "JSXOpeningElement[name.name=/^(View|Text|TextInput|Pressable|TouchableOpacity|TouchableHighlight|SafeAreaView|ScrollView|FlatList|Switch|ActivityIndicator|Modal|StatusBar)$/] > JSXAttribute[name.name='style'] > JSXExpressionContainer > ObjectExpression",
          message:
            "Inline style={{...}} on a core component hangs the app on native for the same reason. Hoist to StyleSheet.create, or useMemo it if it depends on props/state.",
        },
      ],
    },
  },
]);
