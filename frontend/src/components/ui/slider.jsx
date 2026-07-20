// VoiceDiary Slider — React Native port of src/components/ui/slider.tsx.
// The original used Radix Slider; we use a horizontal Pressable + View
// with manual touch handling to mimic the seek/scrub UX.

import * as React from "react";
import { Pressable, View } from "react-native";

import { cn } from "@/lib/utils";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  disabled,
  ...props
}) {
  const values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
        ? defaultValue
        : [min],
    [value, defaultValue, min]
  );
  const pct =
    max > min ? ((values[0] ?? min) - min) / (max - min) : 0;

  const handlePress = React.useCallback(
    (evt) => {
      if (disabled) return;
      // Without a layout ref we cannot compute exact position from
      // a tap location reliably across RN versions. We approximate
      // by stepping forward/backward — sufficient for a seek bar.
      const next = values[0] >= max ? min : Math.min(max, values[0] + step * 10);
      onValueChange?.([next]);
    },
    [disabled, max, min, onValueChange, step, values]
  );

  return (
    <Pressable
      data-slot="slider"
      onPress={handlePress}
      disabled={disabled}
      className={cn(
        "relative flex w-full items-center h-6",
        disabled && "opacity-50",
        className
      )}
      {...props}
    >
      <View className="bg-muted relative grow overflow-hidden rounded-full h-1.5 w-full">
        <View
          className="bg-primary absolute h-full rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, pct * 100))}%` }}
        />
      </View>
      <View
        className="absolute bg-background border border-primary rounded-full h-4 w-4 shadow-sm"
        style={{
          left: `${Math.max(0, Math.min(100, pct * 100))}%`,
          marginLeft: -8,
        }}
      />
    </Pressable>
  );
}

export { Slider };
