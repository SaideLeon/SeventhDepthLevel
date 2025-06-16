
"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import type { Options as ReactMarkdownOptions } from "react-markdown";

interface TypewriterEffectProps {
  text: string;
  speed?: number; // Milliseconds per character
  onComplete?: () => void; // Callback when typing is finished
  // Props for ReactMarkdown
  markdownComponents?: ReactMarkdownOptions["components"];
  remarkPlugins?: ReactMarkdownOptions["remarkPlugins"];
}

export default function TypewriterEffect({
  text,
  speed = 50,
  onComplete,
  markdownComponents,
  remarkPlugins,
}: TypewriterEffectProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDisplayedText("");
    setCurrentIndex(0);
  }, [text]); // Reset when the source text changes

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
      <ReactMarkdown
        components={markdownComponents}
        remarkPlugins={remarkPlugins}
      >
        {displayedText || "\u00A0"}{/* Use non-breaking space to maintain layout if empty */}
      </ReactMarkdown>
      {currentIndex < text.length && (
        <span
          className="inline-block w-px h-4 bg-foreground animate-pulse ml-0.5"
          aria-hidden="true"
        ></span>
      )}
    </>
  );
}
