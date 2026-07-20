// VoiceDiary Input — React Native port of src/components/ui/input.tsx.
// Uses TextInput instead of <input>. The native style equivalent of the
// Tailwind rules is preserved as closely as NativeWind allows.

import * as React from "react";
import { TextInput } from "react-native";

import { cn } from "@/lib/utils";

const Input = React.forwardRef(function Input(
  { className, type, ...props },
  ref
) {
  return (
    <TextInput
      ref={ref}
      data-slot="input"
      className={cn(
        "border border-input bg-transparent flex h-9 w-full rounded-md px-3 py-1 text-base text-foreground",
        "placeholder:text-muted-foreground",
        "disabled:opacity-50",
        className
      )}
      placeholderTextColor="rgb(130, 110, 90)"
      {...props}
    />
  );
});

export { Input };
