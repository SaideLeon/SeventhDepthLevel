"use client";

import React, { useState, useEffect } from "react";

interface TypewriterEffectProps {
  text: string;
  speed?: number; // Milliseconds per character
}

export default function TypewriterEffect({ text, speed = 50 }: TypewriterEffectProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDisplayedText(""); // Reset when text changes
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (!text) return;
    if (currentIndex < text.length) {
      const timeoutId = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timeoutId);
    }
  }, [currentIndex, text, speed]);

  // Render a non-breaking space if text is empty to maintain element height
  // and add a blinking cursor effect
  return (
    <>
      {displayedText || <>&nbsp;</>}
      {currentIndex < text.length && <span className="inline-block w-px h-4 bg-foreground animate-pulse ml-0.5" aria-hidden="true"></span>}
    </>
  );
}
