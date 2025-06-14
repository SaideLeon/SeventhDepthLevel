
"use client";

import React, { useState, useEffect } from "react";

interface TypewriterEffectProps {
  text: string;
  speed?: number; // Milliseconds per character
  onComplete?: () => void; // Callback when typing is finished
}

export default function TypewriterEffect({ text, speed = 50, onComplete }: TypewriterEffectProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDisplayedText(""); 
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (!text) {
      if (onComplete) onComplete();
      return;
    }
    if (currentIndex < text.length) {
      const timeoutId = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timeoutId);
    } else {
      // Typing is complete
      if (onComplete) {
        onComplete();
      }
    }
  }, [currentIndex, text, speed, onComplete]);

  return (
    <>
      {displayedText || <>&nbsp;</>}
      {currentIndex < text.length && <span className="inline-block w-px h-4 bg-foreground animate-pulse ml-0.5" aria-hidden="true"></span>}
    </>
  );
}
