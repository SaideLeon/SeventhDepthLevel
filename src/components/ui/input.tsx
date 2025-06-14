import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Input = React.forwardRef<HTMLTextAreaElement, InputProps>(
  ({ className, onChange, value, ...props }, ref) => {
    const internalTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);

    React.useEffect(() => {
      if (internalTextareaRef.current) {
        const textarea = internalTextareaRef.current;
        const previousHeight = textarea.style.height;
        textarea.style.height = "auto"; // Temporarily shrink to get the correct scrollHeight
        const newScrollHeight = textarea.scrollHeight;

        // Only update if the scrollHeight has actually changed to prevent potential flicker
        // or unnecessary re-renders if the height remains the same (e.g., after deleting characters)
        if (`${newScrollHeight}px` !== previousHeight) {
          textarea.style.height = `${newScrollHeight}px`;
        } else if (value === "") { // Explicitly reset if value is empty
           textarea.style.height = "auto"; // This will respect min-height from CSS
        } else {
           textarea.style.height = previousHeight; // Revert to previous if no change
        }
      }
    }, [value]); // Rerun when value changes

    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (onChange) {
        onChange(event);
      }
      // Immediate resize for typing responsiveness
      const textarea = event.currentTarget;
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    const composedRef = (instance: HTMLTextAreaElement | null) => {
      internalTextareaRef.current = instance;
      if (typeof ref === 'function') {
        ref(instance);
      } else if (ref) {
        ref.current = instance;
      }
    };

    return (
      <textarea
        spellCheck={false}
        rows={1}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "min-h-[2.5rem]", // Equivalent to h-10, allowing growth
          "resize-none",    // Prevent manual resize grips
          "overflow-y-hidden", // Crucial for scrollHeight to be calculated correctly based on content
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
