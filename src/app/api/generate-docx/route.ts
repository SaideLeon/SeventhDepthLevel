
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { Document, Paragraph, HeadingLevel, ImageRun, Packer, AlignmentType, TextRun } from 'docx';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: true, typographer: true, breaks: true });

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    // Check if it's a base64 data URL
    if (url.startsWith('data:image')) {
      const base64Data = url.split(',')[1];
      if (!base64Data) return null;
      return Buffer.from(base64Data, 'base64');
    }

    // Otherwise, fetch as external URL
    const response = await axios({
      url,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        // 'Referer': 'https://www.todamateria.com.br/' // Referer can sometimes cause issues or might not be necessary. Test with and without.
      },
      timeout: 10000, // 10 second timeout
    });
    return Buffer.from(response.data);
  } catch (error) {
    let errorMessage = `Erro ao baixar imagem: ${url}. `;
    if (axios.isAxiosError(error)) {
      errorMessage += `Status: ${error.response?.status}. Mensagem: ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage += `Mensagem: ${error.message}`;
    }
    console.error(errorMessage);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { markdownContent } = await req.json();

    if (!markdownContent || typeof markdownContent !== 'string') {
      return NextResponse.json({ error: 'Conteúdo Markdown não fornecido ou inválido.' }, { status: 400 });
    }

    const tokens = md.parse(markdownContent, {});
    const docChildren: (Paragraph | any)[] = []; // Use 'any' for mixed types or define a more specific union

    let currentParagraphRuns: TextRun[] = [];
    let currentHeadingLevel: HeadingLevel | undefined = undefined;
    let isInsideList = false;
    let listLevel = 0;


    const flushParagraph = () => {
      if (currentParagraphRuns.length > 0) {
        const paragraphConfig: any = {
          children: [...currentParagraphRuns],
          spacing: { after: 120, line: 360 }, // Default spacing
        };
        if (currentHeadingLevel) {
          paragraphConfig.heading = currentHeadingLevel;
          paragraphConfig.alignment = currentHeadingLevel === HeadingLevel.HEADING_1 ? AlignmentType.CENTER : AlignmentType.LEFT;
        } else {
           paragraphConfig.alignment = AlignmentType.JUSTIFIED;
        }
        if (isInsideList) {
            paragraphConfig.bullet = { level: listLevel };
            paragraphConfig.indent = { left: 720 * (listLevel + 1), hanging: 360 };
        }
        docChildren.push(new Paragraph(paragraphConfig));
        currentParagraphRuns = [];
        currentHeadingLevel = undefined; 
      }
    };
    
    for (const token of tokens) {
      switch (token.type) {
        case 'heading_open':
          flushParagraph();
          const levelMap: { [key: string]: HeadingLevel } = {
            'h1': HeadingLevel.HEADING_1, 'h2': HeadingLevel.HEADING_2,
            'h3': HeadingLevel.HEADING_3, 'h4': HeadingLevel.HEADING_4,
            'h5': HeadingLevel.HEADING_5, 'h6': HeadingLevel.HEADING_6,
          };
          currentHeadingLevel = levelMap[token.tag] || HeadingLevel.HEADING_3; // Default to H3 if tag unknown
          break;

        case 'heading_close':
          // The text content is in the 'inline' token that follows 'heading_open'.
          // Paragraph is flushed when next block starts or at the end.
          break;

        case 'paragraph_open':
          flushParagraph(); // Flush previous paragraph/heading before starting a new one.
          break;
        
        case 'paragraph_close':
          flushParagraph();
          break;

        case 'inline':
          if (token.children) {
            for (const child of token.children) {
              if (child.type === 'text') {
                currentParagraphRuns.push(new TextRun(child.content));
              } else if (child.type === 'strong_open') {
                // Next text token will be bold. We need to manage a stack of styles.
                // For simplicity here, we'll just push a bold run if the next is text.
                // A more robust solution involves a style stack.
                const nextChild = token.children[token.children.indexOf(child) + 1];
                if (nextChild && nextChild.type === 'text') {
                  currentParagraphRuns.push(new TextRun({ text: nextChild.content, bold: true }));
                  token.children.splice(token.children.indexOf(child) + 1, 1); // Consume the text token
                }
              } else if (child.type === 'em_open') {
                const nextChild = token.children[token.children.indexOf(child) + 1];
                if (nextChild && nextChild.type === 'text') {
                  currentParagraphRuns.push(new TextRun({ text: nextChild.content, italics: true }));
                   token.children.splice(token.children.indexOf(child) + 1, 1);
                }
              } else if (child.type === 'code_inline') {
                 currentParagraphRuns.push(new TextRun({ text: child.content, font: { name: 'Courier New' }, size: 22 }));
              }
              // strong_close, em_close are implicitly handled by consuming the text.
              else if (child.type === 'image') {
                flushParagraph(); // Add text before image as separate paragraph
                const srcAttr = child.attrs.find(attr => attr[0] === 'src');
                const altAttr = child.attrs.find(attr => attr[0] === 'alt');
                const src = srcAttr ? srcAttr[1] : null;
                const alt = altAttr ? altAttr[1] : '';

                if (src) {
                  const imageBuffer = await downloadImage(src);
                  if (imageBuffer) {
                    try {
                        docChildren.push(new Paragraph({
                            children: [
                            new ImageRun({
                                data: imageBuffer,
                                transformation: { width: 450, height: 300 }, // Adjust size as needed
                            }),
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 120 },
                        }));
                        if (alt) {
                            docChildren.push(new Paragraph({
                            children: [new TextRun({ text: alt, italics: true, size: 20 })],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 60 },
                            }));
                        }
                    } catch (imgError) {
                        console.error("Error creating ImageRun: ", imgError);
                        // Fallback: add alt text if image processing fails
                         docChildren.push(new Paragraph({ text: `[Imagem indisponível: ${alt || src}]` , alignment: AlignmentType.CENTER}));
                    }
                  } else {
                     docChildren.push(new Paragraph({ text: `[Falha ao carregar imagem: ${alt || src}]`, alignment: AlignmentType.CENTER }));
                  }
                }
              } else if (child.type === 'link_open') {
                const hrefAttr = child.attrs.find(attr => attr[0] === 'href');
                const href = hrefAttr ? hrefAttr[1] : '#';
                // Find corresponding text. Link text is typically the next child or children until link_close.
                let linkText = '';
                let k = token.children.indexOf(child) + 1;
                while(k < token.children.length && token.children[k].type !== 'link_close') {
                    if(token.children[k].type === 'text') {
                        linkText += token.children[k].content;
                    }
                    k++;
                }
                currentParagraphRuns.push(new TextRun({text: linkText || href, style: "Hyperlink"}));
                // Advance past the link content and link_close
                if (k < token.children.length) token.children.splice(token.children.indexOf(child) + 1, k - (token.children.indexOf(child)));

              } else if (child.type === 'softbreak' || child.type === 'hardbreak') {
                currentParagraphRuns.push(new TextRun({break: 1}));
              }
            }
          }
          break;

        case 'bullet_list_open':
          flushParagraph();
          isInsideList = true;
          listLevel = 0; // Assuming no nested lists for simplicity in this pass
          break;
        case 'bullet_list_close':
          flushParagraph(); // Flush the last list item
          isInsideList = false;
          break;
        case 'list_item_open':
          flushParagraph(); // Ensure previous content is flushed
          // Prefix is handled by paragraph bullet property
          break;
        case 'list_item_close':
          flushParagraph(); // Flush the content of this list item
          break;
        
        case 'code_block':
        case 'fence':
          flushParagraph();
          docChildren.push(new Paragraph({
            children: [new TextRun({ text: token.content, font: { name: 'Courier New' }, size: 22 })],
            style: "CodeBlock", // Requires a "CodeBlock" style to be defined
            spacing: { after: 120 }
          }));
          break;
        
        case 'blockquote_open':
          flushParagraph();
          // For blockquotes, we might want to start a new paragraph with specific styling (e.g., indentation, italics)
          // This token usually precedes a paragraph_open token for the content.
          // A more complex handler would set a 'blockquote' state.
          break;
        case 'blockquote_close':
          flushParagraph();
          break;
          
        case 'hr':
          flushParagraph();
          docChildren.push(new Paragraph({
            children: [new TextRun("___________________________")],
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 240 }
          }));
          break;
      }
    }
    flushParagraph(); // Ensure any remaining content is flushed

    const doc = new Document({
      sections: [{ children: docChildren }],
      styles: {
        paragraphStyles: [
          { id: "Normal", name: "Normal", run: { font: "Times New Roman", size: 24 }, paragraph: { alignment: AlignmentType.JUSTIFIED, spacing: { line: 360, after: 120 }}},
          { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 240, after: 120 }}},
          { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true }, paragraph: { spacing: { before: 240, after: 120 }}},
          { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true }, paragraph: { spacing: { before: 120, after: 60 }}},
          { id: "CodeBlock", name: "Code Block", basedOn: "Normal", run: { font: "Courier New", size: 22 }, paragraph: { alignment: AlignmentType.LEFT, spacing: { line: 240, after: 120 } } },
        ],
        characterStyles: [
            { id: "Hyperlink", name: "Hyperlink", basedOn:"DefaultParagraphFont", run: { color: "0563C1", underline: {}}}
        ]
      },
       numbering: { // Basic numbering for ordered lists (if you add ol handling)
        config: [{
          reference: "default-numbering",
          levels: [{
            level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } }
          }]
        }]
      }
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="documento_cabulador.docx"`,
      },
    });

  } catch (error) {
    console.error('Erro ao gerar DOCX no servidor:', error);
    return NextResponse.json({ error: 'Falha ao gerar o arquivo DOCX.', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
