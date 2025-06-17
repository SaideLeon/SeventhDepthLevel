
// markdown-to-docx.tsx
'use client';

import React from 'react';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ImageRun, // habilita suporte a imagens
  HeadingLevel, // Import HeadingLevel
} from 'docx';
import MarkdownIt from 'markdown-it';
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Use IRunOptions instead of ITextRunOptions (lint fix)
import type { IRunOptions, IParagraphOptions } from 'docx'; // Added IParagraphOptions

interface MarkdownToDocxProps {
  markdownContent: string | null;
  fileName?: string;
  disabled?: boolean;
}

const DEFAULT_FONT = 'Times New Roman';
const DEFAULT_FONT_SIZE = 24; // 12pt * 2 (half-points)
const CODE_FONT = 'Courier New';
const CODE_FONT_SIZE = 22; // 11pt * 2

// 1.5 line spacing in docx is 360 (240 = single, 480 = double)
const LINE_SPACING_1_5 = 360;

// Instância global do markdown-it (sem plugins por enquanto)
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
});

export default function MarkdownToDocx({ markdownContent, fileName = "documento_cabulador_ai", disabled = false }: MarkdownToDocxProps) {
  const { toast } = useToast();
  const [isConverting, setIsConverting] = React.useState(false);

  const gerarDoc = async () => {
    if (!markdownContent) {
      toast({
        title: "Sem Conteúdo",
        description: "Não há texto para converter para DOCX.",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);

    try {
      // Corrige listas numeradas em negrito (mesmo fix do marked)
      const corrigido = markdownContent.replace(/^(\d+)\.\s*\*\*(.*?)\*\*/gm, '**$1. $2**');
      // Converte markdown para HTML usando markdown-it
      const html = md.render(corrigido);

      // Parseia HTML para DOM
      const parser = new DOMParser();
      const docHTML = parser.parseFromString(html, 'text/html');
      const docxElements: (Paragraph | Table)[] = [];

      // Helper para parsear elementos inline (bold, italic, etc)
      const parseInlineElements = (node: ChildNode): IRunOptions[] => {
        const runsOptions: IRunOptions[] = [];
        node.childNodes.forEach(childNode => {
          if (childNode.nodeType === Node.TEXT_NODE) {
            runsOptions.push({ text: childNode.textContent || '', font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE });
          } else if (childNode.nodeType === Node.ELEMENT_NODE) {
            const element = childNode as HTMLElement;
            const tagName = element.tagName.toLowerCase();

            if (tagName === 'br') {
              // For <br>, ensure it's a break run. Text can be empty.
              runsOptions.push({ break: 1, font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE });
            } else if (tagName === 'strong' || tagName === 'b') {
              const childrenAsOptions: IRunOptions[] = parseInlineElements(element);
              runsOptions.push(...childrenAsOptions.map(opt => ({ ...opt, bold: true })));
            } else if (tagName === 'em' || tagName === 'i') {
              const childrenAsOptions: IRunOptions[] = parseInlineElements(element);
              runsOptions.push(...childrenAsOptions.map(opt => ({ ...opt, italics: true })));
            } else if (tagName === 'u') {
              const childrenAsOptions: IRunOptions[] = parseInlineElements(element);
              runsOptions.push(...childrenAsOptions.map(opt => ({ ...opt, underline: {} })));
            } else if (tagName === 'code') {
              const childrenAsOptions: IRunOptions[] = parseInlineElements(element);
              // Ensure text content for code, even if empty, to avoid issues with spreading potentially undefined text.
              runsOptions.push(...childrenAsOptions.map(opt => ({
                text: opt.text || '', // Ensure text is defined
                ...opt,
                font: CODE_FONT,
                size: CODE_FONT_SIZE
              })));
            } else if (tagName === 'span' && element.classList.contains('katex')) {
              // Futuro: aqui vamos converter a fórmula KaTeX em imagem e inserir via ImageRun
              // Por enquanto, insere o LaTeX como texto simples
              runsOptions.push({ text: element.textContent || '', font: CODE_FONT, size: CODE_FONT_SIZE });
            } else if (tagName === 'a') {
                const href = element.getAttribute('href');
                const linkText = element.textContent || href || '';
                // For links, docx handles them via Hyperlink type or specific styling.
                // For simplicity, we can make them blue and underlined.
                // Or use a character style if one is defined for Hyperlinks.
                // For now, let's process children and add link property or style.
                const childrenAsOptions: IRunOptions[] = parseInlineElements(element);
                 runsOptions.push(...childrenAsOptions.map(opt => ({ 
                    ...opt, 
                    style: "Hyperlink", // Assumes a character style "Hyperlink" is defined
                    // Alternatively, direct styling:
                    // color: "0000FF", 
                    // underline: {} 
                })));
                if (href && linkText !== href) {
                     // Add URL in parentheses if text differs from URL, not standard but informative
                    runsOptions.push({ text: ` (${href})`, font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE, color: "0000FF", italics: true });
                }

            } else {
              // Default: processa filhos recursivamente, ensuring text is present
              const childrenAsOptions: IRunOptions[] = parseInlineElements(element);
              runsOptions.push(...childrenAsOptions.map(opt => ({ text: opt.text || '', ...opt })));
            }
          }
        });
        return runsOptions;
      };

      // Helper para parsear uma <table> em docx Table
      const parseTable = (tableEl: HTMLTableElement): Table => {
        const rows: TableRow[] = [];
        const tableRows = Array.from(tableEl.querySelectorAll('tr'));
        tableRows.forEach((tr) => {
          const cells: TableCell[] = [];
          const cellEls = Array.from(tr.children) as HTMLElement[];
          cellEls.forEach((cellEl) => {
            const cellRuns = parseInlineElements(cellEl);
            cells.push(
              new TableCell({
                children: [
                  new Paragraph({
                    children: cellRuns.map(opt => new TextRun(opt)),
                    alignment: AlignmentType.LEFT,
                    spacing: { line: LINE_SPACING_1_5 },
                  }),
                ],
                verticalAlign: "center",
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                // Width can be tricky, ensure it's reasonable
                // width: { size: 5000, type: WidthType.DXA }, // Example width
              })
            );
          });
          rows.push(new TableRow({ children: cells }));
        });

        return new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          },
        });
      };

      // Main block-level parsing
      const fetchImageAsBuffer = async (url: string): Promise<ArrayBuffer | null> => {
        try {
          // Use a proxy for CORS issues if running in browser and fetching external images
          // For simplicity, direct fetch first.
          const response = await fetch(url);
          if (!response.ok) {
            console.warn(`Failed to fetch image: ${url}, status: ${response.status}`);
            return null;
          }
          return await response.arrayBuffer();
        } catch (error){
          console.error(`Error fetching image ${url}:`, error);
          return null;
        }
      };

      const parseImage = async (imgEl: HTMLImageElement): Promise<Paragraph | null> => {
        const src = imgEl.getAttribute('src');
        const alt = imgEl.getAttribute('alt') || '';
        if (!src) return null;

        const buffer = await fetchImageAsBuffer(src);
        if (!buffer) {
          // Fallback: insert alt text if image fails to load
          return new Paragraph({
            children: [new TextRun({ text: `[Image: ${alt || src}]`, italics: true, font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 }
          });
        }
        return new Paragraph({
          children: [
            new ImageRun({
              data: buffer,
              transformation: { width: 400, height: 250 }, // Adjust as needed
              altText: { name: alt || "image", description: alt || "image", title: alt || "image" },
            }),
            ...(alt ? [new TextRun({ text: alt, break: 1, italics: true, size: 20, font: DEFAULT_FONT })] : [])
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 }
        });
      };

      // Iterate over direct children of body, creating Paragraphs or Tables
      for (const node of Array.from(docHTML.body.childNodes)) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();

        const currentParagraphOptions: IParagraphOptions = { // Base options for paragraphs
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: LINE_SPACING_1_5, after: 120 }
        };

        if (tagName === 'img') {
          const imgParagraph = await parseImage(el as HTMLImageElement);
          if (imgParagraph) docxElements.push(imgParagraph);
        } else if (tagName.match(/^h[1-6]$/)) {
          const level = parseInt(tagName.substring(1), 10);
          
          let styleId: string = `Heading${level}`;
          // Ensure HeadingLevel enum mapping if needed elsewhere, but for style ID, string is fine
          // currentParagraphOptions.heading = styleId as any; // Assign style ID
          switch(level) {
            case 1: currentParagraphOptions.heading = HeadingLevel.HEADING_1; currentParagraphOptions.alignment = AlignmentType.CENTER; break;
            case 2: currentParagraphOptions.heading = HeadingLevel.HEADING_2; currentParagraphOptions.alignment = AlignmentType.LEFT; break;
            case 3: currentParagraphOptions.heading = HeadingLevel.HEADING_3; currentParagraphOptions.alignment = AlignmentType.LEFT; break;
            case 4: currentParagraphOptions.heading = HeadingLevel.HEADING_4; currentParagraphOptions.alignment = AlignmentType.LEFT; break;
            case 5: currentParagraphOptions.heading = HeadingLevel.HEADING_5; currentParagraphOptions.alignment = AlignmentType.LEFT; break;
            case 6: currentParagraphOptions.heading = HeadingLevel.HEADING_6; currentParagraphOptions.alignment = AlignmentType.LEFT; break;
          }


          // Specific spacing for headings based on user styles
          if (level <=2) {
              currentParagraphOptions.spacing = { line: LINE_SPACING_1_5, before: 240, after: 120 };
          } else {
              currentParagraphOptions.spacing = { line: LINE_SPACING_1_5, before: 120, after: 60 };
          }
          
          const headingRuns = parseInlineElements(el);
          if (headingRuns.length > 0 || el.textContent?.trim()) {
            // Apply heading-specific font sizes/styles if not fully handled by paragraph styles
            // For now, assuming paragraph styles ("Heading1", etc.) correctly define font size, bold, etc.
            docxElements.push(new Paragraph({
              ...currentParagraphOptions,
              children: headingRuns.map(opt => new TextRun(opt)),
            }));
          }
        } else if (tagName === 'p') {
          if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.ELEMENT_NODE && (el.childNodes[0] as HTMLElement).tagName.toLowerCase() === 'img') {
            const imgParagraph = await parseImage(el.childNodes[0] as HTMLImageElement);
            if (imgParagraph) docxElements.push(imgParagraph);
          } else {
            const paragraphRuns = parseInlineElements(el);
            // Add paragraph only if it has meaningful content or explicit breaks
            if (paragraphRuns.some(opt => (opt.text && opt.text.trim() !== '') || opt.break)) {
              docxElements.push(new Paragraph({
                ...currentParagraphOptions, // Use default paragraph options
                children: paragraphRuns.map(opt => new TextRun(opt)),
              }));
            } else if (el.innerHTML.trim() === '&nbsp;' || el.innerHTML.trim() === '') { // Handle empty paragraphs
              docxElements.push(new Paragraph({
                ...currentParagraphOptions,
                children: [new TextRun({ text: '', font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE })],
              }));
            }
          }
        } else if (tagName === 'ul' || tagName === 'ol') {
          Array.from(el.childNodes).forEach(liNode => {
            if (liNode.nodeType === Node.ELEMENT_NODE && (liNode as HTMLElement).tagName.toLowerCase() === 'li') {
              const listItem = liNode as HTMLElement;
              const listItemRuns = parseInlineElements(listItem);
              if (listItemRuns.length > 0) {
                docxElements.push(new Paragraph({
                  children: listItemRuns.map(opt => new TextRun(opt)),
                  bullet: tagName === 'ul' ? { level: 0 } : undefined, // Adjust level for nested lists if needed
                  numbering: tagName === 'ol' ? { reference: "default-numbering", level: 0 } : undefined, // Adjust level
                  alignment: AlignmentType.JUSTIFIED,
                  indent: { left: 720 }, // Basic indent for first level
                  spacing: { line: LINE_SPACING_1_5, after: 60 }
                }));
              }
            }
          });
        } else if (tagName === 'hr') {
          docxElements.push(new Paragraph({
            children: [new TextRun({ text: "___________________________", font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE })], // Simple horizontal line
            alignment: AlignmentType.CENTER,
            spacing: { line: LINE_SPACING_1_5, before: 240, after: 240 }
          }));
        } else if (tagName === 'table') {
          docxElements.push(parseTable(el as HTMLTableElement));
        } else if (tagName === 'blockquote') {
            const blockquoteRuns = parseInlineElements(el);
            if (blockquoteRuns.length > 0) {
                docxElements.push(new Paragraph({
                    children: blockquoteRuns.map(opt => new TextRun({...opt, italics: true })), // Style blockquotes as italic
                    indent: { left: 720 },
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { line: LINE_SPACING_1_5, after: 120 }
                }));
            }
        } else if (tagName === 'pre' && el.firstChild && (el.firstChild as HTMLElement).tagName?.toLowerCase() === 'code') {
            // Code blocks
            const codeContent = el.textContent || '';
            docxElements.push(new Paragraph({
                children: [new TextRun({ text: codeContent, font: CODE_FONT, size: CODE_FONT_SIZE })],
                style: "CodeBlock", // Assumes a paragraph style "CodeBlock" is defined
                alignment: AlignmentType.LEFT,
                spacing: { line: 240, after: 120 } // Single spacing for code
            }));
        }

      }

      const doc = new Document({
        sections: [{ children: docxElements }],
        numbering: {
          config: [
            {
              reference: "default-numbering",
              levels: [
                {
                  level: 0,
                  format: "decimal",
                  text: "%1.",
                  alignment: AlignmentType.LEFT,
                  style: {
                    paragraph: {
                      indent: { left: 720, hanging: 360 }, // Standard indent for numbered lists
                    },
                  },
                },
                // Add more levels here if nested ordered lists are needed
              ],
            },
          ],
        },
        styles: {
          paragraphStyles: [
            {
              id: "Normal",
              name: "Normal",
              run: { font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE },
              paragraph: { alignment: AlignmentType.JUSTIFIED, spacing: { line: LINE_SPACING_1_5, after: 120 } }
            },
            { // Style for code blocks
              id: "CodeBlock",
              name: "Code Block",
              basedOn: "Normal",
              run: { font: CODE_FONT, size: CODE_FONT_SIZE },
              paragraph: { alignment: AlignmentType.LEFT, spacing: { line: 240, after: 120 } } // Single spacing
            },
            {
              id: "Heading1",
              name: "Heading 1",
              basedOn: "Normal",
              next: "Normal",
              quickFormat: true,
              run: { size: 32, bold: true, font: DEFAULT_FONT }, // 16pt
              paragraph: { alignment: AlignmentType.CENTER, spacing: { line: LINE_SPACING_1_5, before: 240, after: 120 } }
            },
            {
              id: "Heading2",
              name: "Heading 2",
              basedOn: "Normal",
              next: "Normal",
              quickFormat: true,
              run: { size: 28, bold: true, font: DEFAULT_FONT }, // 14pt
              paragraph: { spacing: { line: LINE_SPACING_1_5, before: 240, after: 120 } } // Alignment default (left)
            },
            {
              id: "Heading3",
              name: "Heading 3",
              basedOn: "Normal",
              next: "Normal",
              quickFormat: true,
              run: { size: DEFAULT_FONT_SIZE, bold: true, font: DEFAULT_FONT }, // 12pt
              paragraph: { spacing: { line: LINE_SPACING_1_5, before: 120, after: 60 } }
            },
            {
              id: "Heading4",
              name: "Heading 4",
              basedOn: "Normal",
              next: "Normal",
              quickFormat: true,
              run: { size: DEFAULT_FONT_SIZE, bold: true, italics: true, font: DEFAULT_FONT }, // 12pt
              paragraph: { spacing: { line: LINE_SPACING_1_5, before: 120, after: 60 } }
            },
            {
              id: "Heading5",
              name: "Heading 5",
              basedOn: "Normal",
              next: "Normal",
              quickFormat: true,
              run: { size: DEFAULT_FONT_SIZE, italics: true, font: DEFAULT_FONT }, // 12pt
              paragraph: { spacing: { line: LINE_SPACING_1_5, before: 120, after: 60 } }
            },
            {
              id: "Heading6",
              name: "Heading 6",
              basedOn: "Normal",
              next: "Normal",
              quickFormat: true,
              run: { size: 22, italics: true, font: DEFAULT_FONT }, // 11pt
              paragraph: { spacing: { line: LINE_SPACING_1_5, before: 120, after: 60 } }
            },
          ],
          characterStyles: [ // For Hyperlinks
            { id: "Hyperlink", name: "Hyperlink", basedOn:"DefaultParagraphFont", run: { color: "0563C1", underline: {}}}
          ]
        },
      });

      const blob = await Packer.toBlob(doc);
      const urlBlob = URL.createObjectURL(blob); // Renamed to avoid conflict
      const a = document.createElement('a');
      a.href = urlBlob;
      a.download = `${fileName}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(urlBlob);

      toast({
        title: "DOCX Gerado",
        description: `${fileName}.docx foi baixado.`,
        variant: "default",
        className: "bg-accent text-accent-foreground",
      });

    } catch (error) {
      console.error("Erro ao gerar DOCX:", error);
      toast({
        title: "Falha na Geração do DOCX",
        description: "Ocorreu um erro ao criar o arquivo DOCX. Verifique o console para detalhes.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Button
      onClick={gerarDoc}
      disabled={!markdownContent || isConverting || disabled}
      variant="ghost" // Changed from default to ghost to match copy button
      size="icon"    // Changed to icon size
      className="h-7 w-7 text-muted-foreground hover:text-accent focus-visible:text-accent" // Match copy button style
      aria-label="Baixar como DOCX"
    >
      {isConverting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {/* Text removed for icon-only button */}
    </Button>
  );
}

