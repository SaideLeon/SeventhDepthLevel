
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

// Define a maximum height for the textarea in pixels.
// 160px is roughly 10rem or 4-5 lines of text with the current styling.
const MAX_TEXTAREA_HEIGHT_PX = 160;

const adjustTextareaHeight = (textarea: HTMLTextAreaElement | null) => {
  if (!textarea) return;

  textarea.style.height = "auto"; // Reset height to correctly calculate scrollHeight based on content and min-height
  const scrollHeight = textarea.scrollHeight;

  if (scrollHeight > MAX_TEXTAREA_HEIGHT_PX) {
    textarea.style.height = `${MAX_TEXTAREA_HEIGHT_PX}px`;
    textarea.style.overflowY = "auto";
  } else {
    textarea.style.height = `${scrollHeight}px`;
    textarea.style.overflowY = "hidden";
  }
};

const Input = React.forwardRef<HTMLTextAreaElement, InputProps>(
  ({ className, onChange, value, ...props }, ref) => {
    const internalTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);

    React.useEffect(() => {
      // Adjust height when the value prop changes (e.g., programmatically or initial value)
      if (internalTextareaRef.current) {
        adjustTextareaHeight(internalTextareaRef.current);
      }
    }, [value]);

    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (onChange) {
        onChange(event);
      }
      // Immediate resize for typing responsiveness
      adjustTextareaHeight(event.currentTarget);
    };

    const composedRef = (instance: HTMLTextAreaElement | null) => {
      internalTextareaRef.current = instance;
      if (typeof ref === 'function') {
        ref(instance);
      } else if (ref) {
        ref.current = instance;
      }
      // Adjust height on initial mount if there's an initial value
      if (instance) {
        adjustTextareaHeight(instance);
      }
    };

    return (
      <textarea
        spellCheck={false}
        rows={1} // Start with a single row
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "min-h-[2.5rem]", // Minimum height (equivalent to h-10 for a single line)
          "resize-none",    // Prevent manual resize grips by the user
          // overflow-y is now handled by adjustTextareaHeight function
          className
        )}
        ref={composedRef}
        value={value}
        onChange={handleInputChange}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
