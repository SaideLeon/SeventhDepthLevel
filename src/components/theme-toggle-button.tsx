
"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEME_STORAGE_KEY = "typewriterai_theme";

export default function ThemeToggleButton() {
  // Default theme for initial render and server-side.
  // Actual theme will be determined on the client after mount.
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after initial hydration.
    setIsClient(true); // Component has mounted on client.

    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    let initialTheme: "light" | "dark";
    if (storedTheme) {
      initialTheme = storedTheme;
    } else if (prefersDark) {
      initialTheme = "dark";
    } else {
      initialTheme = "light";
    }
    setTheme(initialTheme);
  }, []); // Empty dependency array ensures this runs once on mount.

  useEffect(() => {
    // This effect applies the theme to the DOM and localStorage.
    // Only run if on client and theme is determined.
    if (!isClient) return;

    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem(THEME_STORAGE_KEY, "light");
    }
  }, [theme, isClient]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  // On the server, or on the client before the first useEffect runs (isClient is false),
  // render nothing. This ensures the initial client render matches the server's output.
  if (!isClient) {
    return null;
  }
  
  // Now that isClient is true, we can safely render based on the determined theme.
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Mudar para modo escuro" : "Mudar para modo claro"}
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5 text-muted-foreground hover:text-accent" />
      ) : (
        <Sun className="h-5 w-5 text-muted-foreground hover:text-accent" />
      )}
    </Button>
  );
}
