// VoiceDiary AuthScreen — React Native port of src/components/auth/AuthScreen.tsx.
// Login + Register tabs. Uses react-hook-form + zod validation.
// Mirrors apps/mobile/src/screens/auth/*.

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { View, Text, ScrollView } from "react-native";
import { Loader2, Mic, NotebookPen } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Min 6 characters"),
});

const registerSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Min 6 characters"),
});

export function AuthScreen() {
  const { login, register, isAuthing, error, clearError } = useAuthStore();
  const [mode, setMode] = useState("login");

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", email: "", password: "" },
  });

  const onLogin = loginForm.handleSubmit(async (values) => {
    try {
      await login(values.email, values.password);
    } catch {
      /* error is in store */
    }
  });

  const onRegister = registerForm.handleSubmit(async (values) => {
    try {
      await register(values);
    } catch {
      /* error is in store */
    }
  });

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Decorative header */}
      <View className="relative overflow-hidden">
        <View className="mx-auto max-w-md px-6 py-10 items-center">
          <View className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <NotebookPen color="rgb(250, 246, 238)" size={28} />
          </View>
          <Text className="text-2xl font-semibold tracking-tight text-foreground text-center">
            VoiceDiary
          </Text>
          <Text className="mt-1.5 text-sm text-muted-foreground text-center">
            Capture your day with a voice note. Searchable. Exportable. Yours.
          </Text>
        </View>
      </View>

      <View className="flex-1 items-center justify-start px-4 py-8">
        <View className="w-full max-w-md">
          <View className="rounded-xl border border-border bg-card p-1 shadow-lg">
            <Tabs
              value={mode}
              onValueChange={(v) => {
                clearError();
                setMode(v);
              }}
            >
              <TabsList className="flex-row w-full">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="register">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="p-5 pt-6">
                <View className="flex flex-col gap-4">
                  <Field
                    label="Email"
                    error={loginForm.formState.errors.email?.message}
                  >
                    <Input
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={loginForm.watch("email")}
                      onChangeText={(t) => loginForm.setValue("email", t, { shouldValidate: true })}
                    />
                  </Field>
                  <Field
                    label="Password"
                    error={loginForm.formState.errors.password?.message}
                  >
                    <Input
                      secureTextEntry
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={loginForm.watch("password")}
                      onChangeText={(t) => loginForm.setValue("password", t, { shouldValidate: true })}
                    />
                  </Field>
                  <SubmitButton loading={isAuthing} label="Sign in" onPress={onLogin} />
                </View>
              </TabsContent>

              <TabsContent value="register" className="p-5 pt-6">
                <View className="flex flex-col gap-4">
                  <Field
                    label="Display name"
                    error={registerForm.formState.errors.displayName?.message}
                  >
                    <Input
                      autoCapitalize="words"
                      autoComplete="name"
                      placeholder="What should we call you?"
                      value={registerForm.watch("displayName")}
                      onChangeText={(t) => registerForm.setValue("displayName", t, { shouldValidate: true })}
                    />
                  </Field>
                  <Field
                    label="Email"
                    error={registerForm.formState.errors.email?.message}
                  >
                    <Input
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={registerForm.watch("email")}
                      onChangeText={(t) => registerForm.setValue("email", t, { shouldValidate: true })}
                    />
                  </Field>
                  <Field
                    label="Password"
                    error={registerForm.formState.errors.password?.message}
                    hint="At least 6 characters"
                  >
                    <Input
                      secureTextEntry
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={registerForm.watch("password")}
                      onChangeText={(t) => registerForm.setValue("password", t, { shouldValidate: true })}
                    />
                  </Field>
                  <SubmitButton loading={isAuthing} label="Create account" onPress={onRegister} />
                </View>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert variant="destructive" className="mx-5 mb-5 mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </View>

          <View className="mt-4 flex-row items-center justify-center gap-1.5">
            <Mic size={12} color="rgb(130, 110, 90)" />
            <Text className="text-xs text-muted-foreground">
              All recordings stay on this device.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function Field({ label, error, hint, children }) {
  return (
    <View className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {children}
      {error ? (
        <Text className="text-xs text-destructive">{error}</Text>
      ) : hint ? (
        <Text className="text-xs text-muted-foreground">{hint}</Text>
      ) : null}
    </View>
  );
}

function SubmitButton({ loading, label, onPress }) {
  return (
    <Button
      disabled={loading}
      onPress={onPress}
      className={cn(
        "w-full bg-primary text-primary-foreground",
        "h-10 font-medium"
      )}
    >
      {loading ? (
        <View className="flex-row items-center gap-2">
          <Loader2 size={16} color="rgb(250, 246, 238)" className="animate-spin" />
          <Text className="text-primary-foreground font-medium">{label}</Text>
        </View>
      ) : (
        <Text className="text-primary-foreground font-medium">{label}</Text>
      )}
    </Button>
  );
}
