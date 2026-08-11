module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Must be last. Required for Reanimated / NativeWind production interop.
    plugins: ["react-native-reanimated/plugin"],
  };
};
