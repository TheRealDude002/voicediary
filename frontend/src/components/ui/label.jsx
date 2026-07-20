// VoiceDiary Label — React Native port of src/components/ui/label.tsx.
// Uses Text instead of <label>.

import * as React from "react";
import { Text } from "react-native";

import { cn } from "@/lib/utils";

const Label = React.forwardRef(function Label({ className, children, ...props }, ref) {
  return (
    <Text
      ref={ref}
      data-slot="label"
      className={cn(
        "text-sm leading-none font-medium select-none text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </Text>
  );
});

export { Label };
