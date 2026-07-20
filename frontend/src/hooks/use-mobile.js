// VoiceDiary useIsMobile hook — mirrors src/hooks/use-mobile.ts.
//
// The original used window.matchMedia. In React Native we use
// useWindowDimensions from react-native-safe-area-context, which is the
// idiomatic equivalent and re-renders on orientation change.

import * as React from "react";
import { useWindowDimensions } from "react-native";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const { width } = useWindowDimensions();
  return width < MOBILE_BREAKPOINT;
}
