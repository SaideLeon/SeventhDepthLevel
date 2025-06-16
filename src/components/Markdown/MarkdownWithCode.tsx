
// src/components/Markdown/MarkdownWithCode.tsx
import type { Options as ReactMarkdownOptions } from "react-markdown";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import VSCodeCodeBlock from "@/components/VSCodeCodeBlock/VSCodeCodeBlock";
import Image from "next/image";

const extractLanguage = (className: string | undefined): string => {
  const match = /language-(.*)/.exec(className || '');
  return match?.[1] || 'plaintext';
};

interface MarkdownWithCodeProps {
  content: string;
}

export function MarkdownWithCode({ content }: MarkdownWithCodeProps) {
  const components: ReactMarkdownOptions["components"] = {
    code({ node, inline, className, children, ...props }) {
      const lang = extractLanguage(className);
      if (inline) {
        return (
          <code className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm font-mono text-xs mx-0.5" {...props}>
            {children}
          </code>
        );
      }
      // react-markdown wraps block code in <pre> already.
      // Our VSCodeCodeBlock replaces the <code> inside <pre>.
      return (
        <VSCodeCodeBlock
          language={lang}
          code={String(children).replace(/\n$/, "")}
          // filename can be derived if needed
          {...props}
        />
      );
    },
    img: ({ node, ...props }: any) => ( // Ensure 'any' or proper type for props
      <span className="block my-3 rounded-lg overflow-hidden border shadow-sm">
        <Image
          src={props.src || "https://placehold.co/600x400.png"}
          alt={props.alt || "AI generated image"}
          width={700}
          height={400}
          layout="responsive"
          className="object-contain"
          data-ai-hint={props.alt && props.alt.toLowerCase().includes("diagram") ? "diagram illustration" : "image content"}
        />
      </span>
    ),
  };

  return (
    <Markdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </Markdown>
  );
}

// Default export can also be used if preferred, but named export matches current usage.
// export default MarkdownWithCode;
