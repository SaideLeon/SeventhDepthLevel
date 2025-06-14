
"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEME_STORAGE_KEY = "typewriterai_theme";

export default function ThemeToggleButton() {
  // Initialize state from a function to avoid hydration mismatch if localStorage is read directly
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === 'undefined') {
      return "light"; // Default for server-side rendering
    }
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as "light" | "dark" | null;
    if (storedTheme) {
      return storedTheme;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    // This effect runs only on the client after hydration
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
  }, []);


  useEffect(() => {
    // This effect applies the theme to the DOM and localStorage
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem(THEME_STORAGE_KEY, "light");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  // Prevent rendering on the server or before hydration completes
  if (typeof window === 'undefined') {
    return null;
  }
  
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
