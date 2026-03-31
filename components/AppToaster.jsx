"use client";

import { Toaster } from "sonner";
import { useTheme } from "next-themes";

export default function AppToaster() {
  const { resolvedTheme, theme } = useTheme();
  const activeTheme = resolvedTheme || theme || "light";

  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      expand={false}
      theme={activeTheme === "dark" ? "dark" : "light"}
      toastOptions={{
        duration: 3500,
      }}
    />
  );
}
