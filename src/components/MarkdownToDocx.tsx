
// src/components/MarkdownToDocx.tsx
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
  ImageRun,
  HeadingLevel,
} from 'docx';
import type { IRunOptions, IParagraphOptions } from 'docx';
import MarkdownIt from 'markdown-it';
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MarkdownToDocxProps {
  markdownContent: string | null;
  fileName?: string;
  disabled?: boolean;
}

const DEFAULT_FONT = 'Times New Roman';
const DEFAULT_FONT_SIZE = 24; // 12pt * 2 (half-points)
const CODE_FONT = 'Courier New';
const CODE_FONT_SIZE = 22; // 11pt * 2

const LINE_SPACING_1_5 = 360; // 1.5 line spacing

const md = new MarkdownIt({
  html: false, // Important: we parse markdown to tokens, not to HTML string first for DOCX
  linkify: true,
  typographer: true,
  breaks: true, // Convert '\n' in paragraphs into <br>
});

// Helper function to fetch image as ArrayBuffer
const fetchImageAsBuffer = async (url: string): Promise<ArrayBuffer | null> => {
  try {
    // Attempt to use a proxy if it's a relative URL or common placeholder
    // This is a common issue with `fetch` in client-side for external images due to CORS
    // A proper solution might involve a server-side proxy.
    // For now, we'll try direct fetch and accept it might fail for some external images.
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch image: ${url}, status: ${response.status}`);
      return null;
    }
    return await response.arrayBuffer();
  } catch (error) {
    console.error(`Error fetching image ${url}:`, error);
    return null;
  }
};


export default function MarkdownToDocx({ markdownContent, fileName = "documento_cabulador_ai", disabled = false }: MarkdownToDocxProps) {
  const { toast } = useToast();
  const [isConverting, setIsConverting] = React.useState(false);

  const generateDocxElements = async (tokens: any[]): Promise<(Paragraph | Table)[]> => {
    const docxElements: (Paragraph | Table)[] = [];
    let currentListLevel = -1;
    let listType: 'bullet' | 'ordered' | null = null;
    let tableRows: TableRow[] = [];
    let inTable = false;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const childrenRuns: IRunOptions[] = [];

      if (token.children && token.type !== 'image') {
        token.children.forEach((child: any) => {
          if (child.type === 'text') {
            childrenRuns.push({ text: child.content, font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE });
          } else if (child.type === 'code_inline') {
            childrenRuns.push({ text: child.content, font: CODE_FONT, size: CODE_FONT_SIZE });
          } else if (child.type === 'strong_open') {
            // Handled by parent token's style attribute or by looking ahead
          } else if (child.type === 'strong_close') {
            // Handled by parent
          } else if (child.type === 'em_open') {
            // Handled by parent
          } else if (child.type === 'em_close') {
            // Handled by parent
          } else if (child.type === 's_open') { // Strikethrough
            // Apply strikethrough to subsequent text runs
             if (token.children) {
                let k = token.children.indexOf(child) + 1;
                while (k < token.children.length && token.children[k].type !== 's_close') {
                    if (token.children[k].type === 'text') token.children[k].strike = true;
                    k++;
                }
            }
          }
           else if (child.type === 'link_open') {
            const href = child.attrGet('href');
            // We'll collect text for the link from subsequent 'text' tokens until 'link_close'
            let linkText = "";
            let k = token.children.indexOf(child) + 1;
            while(k < token.children.length && token.children[k].type !== 'link_close') {
                if (token.children[k].type === 'text') {
                    linkText += token.children[k].content;
                }
                k++;
            }
            if (href) {
                 // For DOCX, links are often best as simple text runs with the URL appended or as a hyperlink field.
                 // docx.js Hyperlink support is a bit more involved. For simplicity, we can show text and URL.
                 childrenRuns.push({ text: linkText || href, font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE, style: "Hyperlink" });
                 if(linkText && linkText !== href) {
                    childrenRuns.push({ text: ` (${href})`, font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE, color: "0000FF", underline: {} });
                 }
            }
          }
        });
      }

       // Apply bold/italics based on token type if not handled by children traversal (simple cases)
        if (token.type.includes('strong')) {
            childrenRuns.forEach(r => r.bold = true);
        }
        if (token.type.includes('em')) {
            childrenRuns.forEach(r => r.italics = true);
        }


      const paragraphOptions: IParagraphOptions = {
        spacing: { line: LINE_SPACING_1_5, after: 120 },
        alignment: AlignmentType.JUSTIFIED,
      };

      if (token.type === 'heading_open') {
        const level = parseInt(token.tag.substring(1), 10);
        const headingText = tokens[i + 1]?.content || "";
        const runs: TextRun[] = [new TextRun({ text: headingText, font: DEFAULT_FONT, bold: true })];
        
        if (level === 1) {
            runs.forEach(r => r.options.size = 32); // 16pt
            paragraphOptions.heading = HeadingLevel.HEADING_1;
            paragraphOptions.alignment = AlignmentType.CENTER;
        } else if (level === 2) {
            runs.forEach(r => r.options.size = 28); // 14pt
            paragraphOptions.heading = HeadingLevel.HEADING_2;
        } else if (level === 3) {
            runs.forEach(r => r.options.size = DEFAULT_FONT_SIZE); // 12pt
            paragraphOptions.heading = HeadingLevel.HEADING_3;
        } else if (level === 4) {
            runs.forEach(r => { r.options.size = DEFAULT_FONT_SIZE; r.options.italics = true; });
            paragraphOptions.heading = HeadingLevel.HEADING_4;
        } else { // H5, H6
            runs.forEach(r => { r.options.size = 22; r.options.italics = true; }); // 11pt
            paragraphOptions.heading = level === 5 ? HeadingLevel.HEADING_5 : HeadingLevel.HEADING_6;
        }
        docxElements.push(new Paragraph({...paragraphOptions, children: runs}));
        i++; // Skip text token
      } else if (token.type === 'paragraph_open') {
        // Collect all inline children for this paragraph
        const currentParagraphRuns: IRunOptions[] = [];
        let j = i + 1;
        while(j < tokens.length && tokens[j].type !== 'paragraph_close') {
            const inlineToken = tokens[j];
            if(inlineToken.type === 'text') {
                currentParagraphRuns.push({ text: inlineToken.content, font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE });
            } else if (inlineToken.type === 'code_inline') {
                currentParagraphRuns.push({ text: inlineToken.content, font: CODE_FONT, size: CODE_FONT_SIZE });
            } else if (inlineToken.type === 'strong_open') {
                // look ahead for text and strong_close
                if(tokens[j+1] && tokens[j+1].type === 'text' && tokens[j+2] && tokens[j+2].type === 'strong_close') {
                    currentParagraphRuns.push({ text: tokens[j+1].content, bold: true, font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE });
                    j += 2;
                }
            } else if (inlineToken.type === 'em_open') {
                 if(tokens[j+1] && tokens[j+1].type === 'text' && tokens[j+2] && tokens[j+2].type === 'em_close') {
                    currentParagraphRuns.push({ text: tokens[j+1].content, italics: true, font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE });
                    j += 2;
                }
            } else if (inlineToken.type === 'link_open') {
                const href = inlineToken.attrGet('href');
                let linkText = "";
                let k = j + 1;
                while(k < tokens.length && tokens[k].type !== 'link_close') {
                     if (tokens[k].type === 'text') linkText += tokens[k].content;
                     k++;
                }
                 if(href) {
                    currentParagraphRuns.push({ text: linkText || href, font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE, style: "Hyperlink" });
                     if(linkText && linkText !== href) {
                        currentParagraphRuns.push({ text: ` (${href})`, font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE, color: "0000FF", underline: {} });
                     }
                 }
                j = k; // Move past link_close
            } else if (inlineToken.type === 'image') {
                // This will be handled as a separate paragraph if image is on its own line.
                // If it's inline, it's more complex. For now, assume block images.
            } else if (inlineToken.type === 'softbreak' || inlineToken.type === 'hardbreak') {
                 currentParagraphRuns.push({ break: 1 });
            }
            j++;
        }
        if (currentParagraphRuns.length > 0) {
            docxElements.push(new Paragraph({...paragraphOptions, children: currentParagraphRuns.map(opt => new TextRun(opt))}));
        }
        i = j; // Move past paragraph_close
      } else if (token.type === 'bullet_list_open') {
        listType = 'bullet';
        currentListLevel++;
      } else if (token.type === 'ordered_list_open') {
        listType = 'ordered';
        currentListLevel++;
      } else if (token.type === 'list_item_open') {
        const itemTextToken = tokens[i+1]; // Usually paragraph_open then inline then text
        let itemText = "";
        const itemRuns: IRunOptions[] = [];

        let k = i + 1; // Start after list_item_open
        if (tokens[k] && tokens[k].type === 'paragraph_open') k++; // Skip paragraph_open

        while(k < tokens.length && tokens[k].type !== 'list_item_close') {
            const inlineToken = tokens[k];
             if(inlineToken.type === 'text') {
                itemRuns.push({ text: inlineToken.content, font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE });
            } else if (inlineToken.type === 'code_inline') {
                itemRuns.push({ text: inlineToken.content, font: CODE_FONT, size: CODE_FONT_SIZE });
            } else if (inlineToken.type === 'strong_open') {
                 if(tokens[k+1] && tokens[k+1].type === 'text' && tokens[k+2] && tokens[k+2].type === 'strong_close') {
                    itemRuns.push({ text: tokens[k+1].content, bold: true, font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE });
                    k += 2;
                }
            } else if (inlineToken.type === 'em_open') {
                 if(tokens[k+1] && tokens[k+1].type === 'text' && tokens[k+2] && tokens[k+2].type === 'em_close') {
                    itemRuns.push({ text: tokens[k+1].content, italics: true, font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE });
                    k += 2;
                }
            }
            // Add other inline elements if needed
            k++;
        }
        i = k; // Move i past list_item_close

        if (itemRuns.length > 0) {
          docxElements.push(new Paragraph({
            children: itemRuns.map(opt => new TextRun(opt)),
            bullet: listType === 'bullet' ? { level: currentListLevel } : undefined,
            numbering: listType === 'ordered' ? { reference: "default-numbering", level: currentListLevel } : undefined,
            ...paragraphOptions,
            indent: { left: 720 * (currentListLevel + 1) }
          }));
        }
      } else if (token.type === 'bullet_list_close' || token.type === 'ordered_list_close') {
        currentListLevel--;
        if (currentListLevel === -1) listType = null;
      } else if (token.type === 'hr') {
        docxElements.push(new Paragraph({ children: [new TextRun("____________________")], alignment: AlignmentType.CENTER, spacing: {before: 240, after: 240}}));
      } else if (token.type === 'code_block' || token.type === 'fence') {
        docxElements.push(new Paragraph({
          children: [new TextRun({ text: token.content, font: CODE_FONT, size: CODE_FONT_SIZE })],
          spacing: { line: 240, after: 120 }, // Single spacing for code blocks
          style: "CodeBlock" // Apply a custom style if defined
        }));
      } else if (token.type === 'image') {
        const src = token.attrGet('src');
        const alt = token.content || '';
        if (src) {
          const buffer = await fetchImageAsBuffer(src);
          if (buffer) {
            docxElements.push(new Paragraph({
              children: [
                new ImageRun({
                  data: buffer,
                  transformation: { width: 400, height: 250 }, // Adjust as needed
                  altText: { name: alt || "image", description: alt || "image", title: alt || "image" },
                }),
                ...(alt ? [new TextRun({ text: alt, break: 1, italics: true, size: 20 })] : [])
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 }
            }));
          } else {
             childrenRuns.push({text: `[Image: ${alt || src}]`, font:DEFAULT_FONT, size: DEFAULT_FONT_SIZE, italics: true});
             if(childrenRuns.length > 0) docxElements.push(new Paragraph({...paragraphOptions, children: childrenRuns.map(opt => new TextRun(opt))}));
          }
        }
      } else if (token.type === 'table_open') {
        inTable = true;
        tableRows = [];
      } else if (token.type === 'table_close') {
        inTable = false;
        if (tableRows.length > 0) {
          docxElements.push(new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            },
          }));
        }
      } else if (token.type === 'tr_open' && inTable) {
        const cells: TableCell[] = [];
        let j = i + 1;
        while(tokens[j] && tokens[j].type !== 'tr_close'){
            if(tokens[j].type === 'th_open' || tokens[j].type === 'td_open') {
                const cellRuns: IRunOptions[] = [];
                let k = j + 1; // Start after th_open/td_open
                if (tokens[k] && tokens[k].type === 'paragraph_open') k++; // Skip paragraph_open

                while(tokens[k] && tokens[k].type !== (tokens[j].type === 'th_open' ? 'th_close' : 'td_close')) {
                    const inlineToken = tokens[k];
                    if(inlineToken.type === 'text') {
                        cellRuns.push({ text: inlineToken.content, font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE, bold: tokens[j].type === 'th_open' });
                    }
                    // Add other inline processing if needed (strong, em, etc.)
                    k++;
                }
                j = k; // Move j past th_close/td_close
                 cells.push(new TableCell({
                    children: [new Paragraph({ children: cellRuns.map(opt => new TextRun(opt)) })],
                    verticalAlign: "center",
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                }));
            }
            j++;
        }
        i = j; // Move i past tr_close
        tableRows.push(new TableRow({ children: cells }));
      }


      // If after all specific handlers, we have unpushed runs from generic token.children parsing
      if (childrenRuns.length > 0 && ! (token.type.endsWith('_open') || token.type.endsWith('_close') || token.type === 'inline')) {
         docxElements.push(new Paragraph({...paragraphOptions, children: childrenRuns.map(opt => new TextRun(opt))}));
      }
    }
    return docxElements;
  };


  const gerarDoc = async () => {
    if (!markdownContent) {
      toast({ title: "Sem Conteúdo", description: "Não há texto para converter para DOCX.", variant: "destructive" });
      return;
    }
    setIsConverting(true);

    try {
      const tokens = md.parse(markdownContent, {});
      const docxElements = await generateDocxElements(tokens);

      const doc = new Document({
        sections: [{ children: docxElements }],
        numbering: {
          config: [{
            reference: "default-numbering",
            levels: [{
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 }}},
            },{
              level: 1,
              format: "lowerLetter",
              text: "%2)",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1440, hanging: 360 }}},
            }],
          }],
        },
        styles: {
          paragraphStyles: [
            { id: "Normal", name: "Normal", run: { font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE }, paragraph: { alignment: AlignmentType.JUSTIFIED, spacing: { line: LINE_SPACING_1_5, after: 120 }}},
            { id: "CodeBlock", name: "Code Block", basedOn: "Normal", run: { font: CODE_FONT, size: CODE_FONT_SIZE }, paragraph: { alignment: AlignmentType.LEFT, spacing: { line: 240, after: 120 }}},
            { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, font: DEFAULT_FONT }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 240, after: 120 }}},
            { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, font: DEFAULT_FONT }, paragraph: { spacing: { before: 240, after: 120 }}},
            { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: DEFAULT_FONT_SIZE, bold: true, font: DEFAULT_FONT }, paragraph: { spacing: { before: 120, after: 60 }}},
            { id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: DEFAULT_FONT_SIZE, bold: true, italics: true, font: DEFAULT_FONT }, paragraph: { spacing: { before: 120, after: 60 }}},
            { id: "Heading5", name: "Heading 5", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: DEFAULT_FONT_SIZE, italics: true, font: DEFAULT_FONT }, paragraph: { spacing: { before: 120, after: 60 }}},
            { id: "Heading6", name: "Heading 6", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, italics: true, font: DEFAULT_FONT }, paragraph: { spacing: { before: 120, after: 60 }}},
          ],
          characterStyles: [ // For Hyperlinks
            { id: "Hyperlink", name: "Hyperlink", basedOn:"DefaultParagraphFont", run: { color: "0563C1", underline: {}}}
          ]
        },
      });

      const blob = await Packer.toBlob(doc);
      const urlBlob = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlBlob;
      a.download = `${fileName}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(urlBlob);

      toast({ title: "DOCX Gerado", description: `${fileName}.docx foi baixado.`, variant: "default", className: "bg-accent text-accent-foreground" });
    } catch (error) {
      console.error("Erro ao gerar DOCX:", error);
      toast({ title: "Falha na Geração do DOCX", description: "Ocorreu um erro ao criar o arquivo DOCX.", variant: "destructive" });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Button
      onClick={gerarDoc}
      disabled={!markdownContent || isConverting || disabled}
      variant="ghost" // Changed from default to ghost to be less prominent initially
      size="sm" // Make it a bit smaller
      className="text-muted-foreground hover:text-accent focus-visible:text-accent group-hover:opacity-100 transition-opacity focus-within:opacity-100" // classes for hover effect
      aria-label="Baixar como DOCX"
    >
      {isConverting ? (
        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-1 h-4 w-4" />
      )}
      {isConverting ? "Convertendo..." : "DOCX"}
    </Button>
  );
}

