const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve .mjs and .cjs files
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  "mjs",
  "cjs",
];

// Ensure ESM packages are transpiled by Babel
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, {
  input: "./global.css",
  output: "./node_modules/.cache/nativewind/global.css",
  projectRoot: path.resolve(__dirname).replace(/\\/g, "/"),
});