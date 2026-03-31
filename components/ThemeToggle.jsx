"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const activeTheme = resolvedTheme || theme || "light";

  return (
    <button
      className="themeToggle"
      suppressHydrationWarning
      onClick={() => setTheme(activeTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle Theme"
    >
      {activeTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
