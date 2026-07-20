// VoiceDiary DropdownMenu — React Native port of src/components/ui/dropdown-menu.tsx.
// The original used Radix DropdownMenu primitives. We re-implement the
// same controlled API (DropdownMenuTrigger, DropdownMenuContent, items)
// using react-native-modal positioned to the trigger.

import * as React from "react";
import { Pressable, Text, View } from "react-native";
import Modal from "react-native-modal";

import { cn } from "@/lib/utils";

const DropdownMenuContext = React.createContext({
  open: false,
  setOpen: () => {},
  close: () => {},
});

function DropdownMenu({ children }) {
  const [open, setOpen] = React.useState(false);
  const ctx = React.useMemo(
    () => ({
      open,
      setOpen,
      close: () => setOpen(false),
    }),
    [open]
  );
  return (
    <DropdownMenuContext.Provider value={ctx}>
      {children}
    </DropdownMenuContext.Provider>
  );
}

function DropdownMenuTrigger({ asChild, children, ...props }) {
  const ctx = React.useContext(DropdownMenuContext);
  // We expect a single child Pressable; wrap it so we can toggle on press.
  return React.cloneElement(children, {
    onPress: (e) => {
      children.props.onPress?.(e);
      ctx.setOpen(true);
    },
  });
}

function DropdownMenuContent({ className, children, align = "end", ...props }) {
  const ctx = React.useContext(DropdownMenuContext);
  return (
    <Modal
      isVisible={ctx.open}
      onBackdropPress={ctx.close}
      onBackButtonPress={ctx.close}
      animationIn="fadeIn"
      animationOut="fadeOut"
      animationInTiming={150}
      animationOutTiming={120}
      backdropOpacity={0.25}
      style={{
        margin: 0,
        alignItems: align === "end" ? "flex-end" : "flex-start",
        justifyContent: "flex-start",
        paddingTop: 60,
        paddingRight: align === "end" ? 12 : 0,
        paddingLeft: align === "end" ? 0 : 12,
      }}
      useNativeDriver
      hideModalContentWhileAnimating
    >
      <View
        data-slot="dropdown-menu-content"
        className={cn(
          "bg-popover border border-border rounded-md p-1 shadow-md max-w-[14rem]",
          className
        )}
        {...props}
      >
        {children}
      </View>
    </Modal>
  );
}

function DropdownMenuItem({
  className,
  children,
  onPress,
  inset,
  variant = "default",
  ...props
}) {
  const ctx = React.useContext(DropdownMenuContext);
  return (
    <Pressable
      data-slot="dropdown-menu-item"
      onPress={(e) => {
        onPress?.(e);
        ctx.close();
      }}
      className={cn(
        "flex-row items-center gap-2 rounded-sm px-2 py-1.5",
        variant === "destructive" ? "text-destructive" : "text-foreground",
        className
      )}
      {...props}
    >
      {typeof children === "string" ? (
        <Text
          className={cn(
            "text-sm",
            variant === "destructive" ? "text-destructive" : "text-foreground"
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

function DropdownMenuLabel({ className, children, ...props }) {
  return (
    <View
      data-slot="dropdown-menu-label"
      className={cn("px-2 py-1.5", className)}
      {...props}
    >
      {typeof children === "string" ? (
        <Text className="text-sm font-medium text-foreground">{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

function DropdownMenuSeparator({ className, ...props }) {
  return (
    <View
      data-slot="dropdown-menu-separator"
      className={cn("h-px bg-border my-1 -mx-1", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, children, ...props }) {
  return (
    <Text
      data-slot="dropdown-menu-shortcut"
      className={cn("text-muted-foreground ml-auto text-xs tracking-widest", className)}
      {...props}
    >
      {children}
    </Text>
  );
}

// Stubs for less-used primitives (kept for API compatibility)
function DropdownMenuPortal({ children }) { return children; }
function DropdownMenuGroup({ children }) { return children; }
function DropdownMenuCheckboxItem() { return null; }
function DropdownMenuRadioGroup({ children }) { return children; }
function DropdownMenuRadioItem() { return null; }
function DropdownMenuSub({ children }) { return children; }
function DropdownMenuSubTrigger() { return null; }
function DropdownMenuSubContent() { return null; }

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
