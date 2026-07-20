// src/lib/nativewind-flatlist-fix.js
//
// NativeWind 4.0.x ships `react-native-css-interop` which calls
// `remapProps(FlatList, { className, columnWrapperClassName, ... })` at
// module-load time. The `remapProps` implementation ALWAYS writes the
// target prop on the underlying RN FlatList — even when no className is
// passed — producing `columnWrapperStyle = []` (empty array). Because
// `[]` is truthy, React Native's `FlatList._checkProps` throws:
//
//   "columnWrapperStyle not supported for single column lists"
//
// This breaks every `<FlatList>` render on web (and on native in DEV mode)
// the first time the user navigates to a screen that uses FlatList.
//
// Fix: re-register the FlatList interop via `cssInterop` (which has a
// proper `check()` that only runs when className is actually passed, and
// only writes target props that have associated className strings). We
// keep every mapping from the original registration EXCEPT
// `columnWrapperClassName` — that one is what triggers the invariant.
//
// This module MUST be imported after `./global.css` (which loads
// NativeWind) and before any component that renders a FlatList.
//
// Upstream issue:
//   https://github.com/marklawlor/nativewind/issues/1369
//   (affects nativewind 4.0.x; fixed in 4.1+)

import { FlatList } from "react-native";
import { cssInterop } from "nativewind";

cssInterop(FlatList, {
  className: "style",
  ListHeaderComponentClassName: "ListHeaderComponentStyle",
  ListFooterComponentClassName: "ListFooterComponentStyle",
  contentContainerClassName: "contentContainerStyle",
  indicatorClassName: "indicatorStyle",
});

export {};
