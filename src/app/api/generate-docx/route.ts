
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { Document, Paragraph, HeadingLevel, ImageRun, Packer, AlignmentType, TextRun, IImageOptions, Table, TableCell, TableRow, WidthType, BorderStyle, ShadingType } from 'docx';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: true, typographer: true, breaks: true });

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    if (url.startsWith('data:image')) {
      const base64Data = url.split(',')[1];
      if (!base64Data) {
        console.warn(`Dados base64 inválidos para URL: ${url.substring(0, 30)}...`);
        return null;
      }
      return Buffer.from(base64Data, 'base64');
    }

    const response = await axios({
      url,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.todamateria.com.br/'
      },
      timeout: 15000,
    });
    return Buffer.from(response.data);
  } catch (error) {
    let errorMessage = `Erro ao baixar imagem: ${url.substring(0,100)}. `;
    if (axios.isAxiosError(error)) {
      errorMessage += `Status: ${error.response?.status}. Mensagem: ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage += `Mensagem: ${error.message}`;
    }
    console.warn(errorMessage);
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
    const docChildren: (Paragraph | Table | any)[] = [];

    let currentParagraphRuns: TextRun[] = [];
    let currentHeadingStyleId: string | undefined = undefined; // Stores style ID like "Heading1"
    let isInsideList = false;
    let listLevel = 0;
    let inTable = false;
    let tableRows: TableRow[] = [];
    let currentRowCells: Paragraph[][] = [];
    let isInsideBlockquote = false;

    const headingStyleMap: { [key: string]: string } = {
      'h1': "Heading1", 'h2': "Heading2",
      'h3': "Heading3", 'h4': "Heading4",
      'h5': "Heading5", 'h6': "Heading6",
    };

    const flushParagraph = () => {
      if (currentParagraphRuns.length > 0) {
        const paragraphConfig: any = {
          children: [...currentParagraphRuns],
        };
        if (currentHeadingStyleId) {
          paragraphConfig.style = currentHeadingStyleId;
        } else if (isInsideList) {
          paragraphConfig.bullet = { level: listLevel };
          // Styling (font, size, alignment, spacing) for lists is handled by numbering configuration
        } else if (isInsideBlockquote) {
          paragraphConfig.style = "BlockquoteStyle";
        } else {
          paragraphConfig.style = "Normal";
        }
        docChildren.push(new Paragraph(paragraphConfig));
        currentParagraphRuns = [];
        currentHeadingStyleId = undefined;
      }
    };

    for (const token of tokens) {
      switch (token.type) {
        case 'heading_open':
          flushParagraph();
          currentHeadingStyleId = headingStyleMap[token.tag] || "Heading3";
          break;

        case 'paragraph_open':
          flushParagraph();
          break;

        case 'paragraph_close':
          flushParagraph();
          break;

        case 'inline':
          if (token.children) {
            for (const child of token.children) {
              let textRunOptions: any = {font: "Times New Roman", size: 24}; // Default to TNR 12pt

              if (child.type === 'text') {
                textRunOptions.text = child.content;
              } else if (child.type === 'strong_open') {
                const nextChild = token.children[token.children.indexOf(child) + 1];
                if (nextChild && nextChild.type === 'text') {
                  textRunOptions.text = nextChild.content;
                  textRunOptions.bold = true;
                  token.children.splice(token.children.indexOf(child) + 1, 1);
                }
              } else if (child.type === 'em_open') {
                const nextChild = token.children[token.children.indexOf(child) + 1];
                if (nextChild && nextChild.type === 'text') {
                  textRunOptions.text = nextChild.content;
                  textRunOptions.italics = true;
                  token.children.splice(token.children.indexOf(child) + 1, 1);
                }
              } else if (child.type === 'code_inline') {
                 textRunOptions.text = child.content;
                 // Font and size already set to TNR 12pt by default for textRunOptions
              }
              else if (child.type === 'image') {
                flushParagraph();
                const srcAttr = child.attrs.find(attr => attr[0] === 'src');
                const altAttr = child.attrs.find(attr => attr[0] === 'alt');
                const src = srcAttr ? srcAttr[1] : null;
                const alt = altAttr ? altAttr[1] || 'Imagem' : 'Imagem';

                if (src) {
                  const imageBuffer = await downloadImage(src);
                  if (imageBuffer) {
                    try {
                        const imageRunOptions: IImageOptions = {
                            data: imageBuffer,
                            transformation: { width: 450, height: 300 },
                        };
                        docChildren.push(new Paragraph({
                            children: [ new ImageRun(imageRunOptions) ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 120 },
                        }));
                        if (alt) {
                            docChildren.push(new Paragraph({
                              children: [new TextRun({ text: alt })], // TextRun content will be styled by ImageCaption
                              style: "ImageCaption",
                            }));
                        }
                    } catch (imgError) {
                        console.warn("Erro ao criar ImageRun: ", imgError);
                         docChildren.push(new Paragraph({ text: `[Imagem indisponível: ${alt}]`, style: "Normal", alignment: AlignmentType.CENTER}));
                    }
                  } else {
                     docChildren.push(new Paragraph({ text: `[Falha ao carregar imagem: ${alt}]`, style: "Normal", alignment: AlignmentType.CENTER }));
                  }
                }
                continue;
              } else if (child.type === 'link_open') {
                const hrefAttr = child.attrs.find(attr => attr[0] === 'href');
                const href = hrefAttr ? hrefAttr[1] : '#';
                let linkText = '';
                let k = token.children.indexOf(child) + 1;
                while(k < token.children.length && token.children[k].type !== 'link_close') {
                    if(token.children[k].type === 'text') {
                        linkText += token.children[k].content;
                    }
                    k++;
                }
                textRunOptions.text = linkText || href;
                textRunOptions.style = "Hyperlink"; // Character style

                if (k < token.children.length) token.children.splice(token.children.indexOf(child) + 1, k - (token.children.indexOf(child)));

              } else if (child.type === 'softbreak' || child.type === 'hardbreak') {
                textRunOptions.break = 1;
              }

              if(textRunOptions.text || textRunOptions.break){
                // Ensure explicit font for Hyperlink style character runs if needed, though DefaultParagraphFont should pick it up
                if (textRunOptions.style === "Hyperlink") {
                     currentParagraphRuns.push(new TextRun({...textRunOptions, font: "Times New Roman", size: 24}));
                } else {
                     currentParagraphRuns.push(new TextRun(textRunOptions));
                }
              }
            }
          }
          break;

        case 'bullet_list_open':
          flushParagraph();
          isInsideList = true;
          listLevel = 0;
          break;
        case 'bullet_list_close':
          flushParagraph();
          isInsideList = false;
          break;
        case 'list_item_open':
          flushParagraph();
          break;
        case 'list_item_close':
          flushParagraph();
          break;

        case 'code_block':
        case 'fence':
          flushParagraph();
          docChildren.push(new Paragraph({
            children: [new TextRun({ text: token.content })], // Text will be styled by CodeBlockStyle
            style: "CodeBlockStyle",
          }));
          break;

        case 'blockquote_open':
          flushParagraph();
          isInsideBlockquote = true;
          break;
        case 'blockquote_close':
          flushParagraph();
          isInsideBlockquote = false;
          break;

        case 'hr':
          flushParagraph();
          docChildren.push(new Paragraph({
            children: [new TextRun("___________________________")],
            style: "Normal",
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 240 }
          }));
          break;

        case 'table_open':
          flushParagraph();
          inTable = true;
          tableRows = [];
          break;
        case 'table_close':
          if (tableRows.length > 0) {
            docChildren.push(new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
              }
            }));
          }
          inTable = false;
          tableRows = [];
          break;
        case 'thead_open':
        case 'tbody_open':
          break;
        case 'thead_close':
        case 'tbody_close':
          break;
        case 'tr_open':
          currentRowCells = [];
          break;
        case 'tr_close':
          if (currentRowCells.length > 0) {
            tableRows.push(new TableRow({
              children: currentRowCells.map(cellParagraphs => new TableCell({ children: cellParagraphs }))
            }));
          }
          break;
        case 'th_open':
        case 'td_open':
          flushParagraph();
          currentParagraphRuns = [];
          break;
        case 'th_close':
        case 'td_close':
          flushParagraph(); // This will create paragraph with "Normal" style by default
          if (docChildren.length > 0 && docChildren[docChildren.length -1] instanceof Paragraph) {
             const cellPara = docChildren.pop() as Paragraph;
             currentRowCells.push([cellPara]);
          } else if (currentParagraphRuns.length > 0) {
             currentRowCells.push([new Paragraph({children: [...currentParagraphRuns], style: "Normal"})]);
             currentParagraphRuns = [];
          } else {
             currentRowCells.push([new Paragraph({text: "", style: "Normal"})]);
          }
          currentParagraphRuns = [];
          break;
      }
    }
    flushParagraph();

    const doc = new Document({
      sections: [{ children: docChildren }],
      styles: {
        default: { // Document defaults
          paragraph: {
            run: { font: "Times New Roman", size: 24 }, // 12pt
            spacing: { line: 360, after: 120 }, // 1.5 line spacing (12pt * 1.5 * 20 = 360), 6pt after
            alignment: AlignmentType.JUSTIFIED,
          },
        },
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            basedOn: "Normal", // Based on document default
            quickFormat: true,
            run: { font: "Times New Roman", size: 24 },
            paragraph: {
              alignment: AlignmentType.JUSTIFIED,
              spacing: { line: 360, after: 120 },
            },
          },
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal", // Will inherit TNR 12pt
            next: "Normal",
            quickFormat: true,
            run: { bold: true }, // Keep bold, font/size from basedOn or default
            paragraph: {
              alignment: AlignmentType.CENTER,
              spacing: { before: 240, after: 120, line: 360 }, // TNR 12pt, 1.5 line spacing
            },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { bold: true },
            paragraph: {
              alignment: AlignmentType.LEFT,
              spacing: { before: 240, after: 120, line: 360 },
            },
          },
          {
            id: "Heading3",
            name: "Heading 3",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { bold: true },
            paragraph: {
              alignment: AlignmentType.LEFT,
              spacing: { before: 120, after: 60, line: 360 },
            },
          },
          {
            id: "Heading4",
            name: "Heading 4",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { bold: true },
            paragraph: {
              alignment: AlignmentType.LEFT,
              spacing: { before: 120, after: 60, line: 360 },
            },
          },
          {
            id: "Heading5",
            name: "Heading 5",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { bold: true },
            paragraph: {
              alignment: AlignmentType.LEFT,
              spacing: { before: 120, after: 60, line: 360 },
            },
          },
          {
            id: "Heading6",
            name: "Heading 6",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { bold: true },
            paragraph: {
              alignment: AlignmentType.LEFT,
              spacing: { before: 120, after: 60, line: 360 },
            },
          },
          {
            id: "CodeBlockStyle",
            name: "Code Block Style",
            basedOn: "Normal", // Inherits TNR 12pt
            run: {}, // No specific run override, so uses Normal's run
            paragraph: {
              alignment: AlignmentType.LEFT, // Not justified for code
              spacing: { line: 240, after: 120 }, // Single line spacing
              shading: { type: ShadingType.CLEAR, fill: "F0F0F0" }, // Keep shading
            },
          },
          {
            id: "BlockquoteStyle",
            name: "Blockquote Style",
            basedOn: "Normal", // Inherits TNR 12pt, Justified, 1.5 spacing
            run: { italics: true }, // Add italics
            paragraph: {
              indent: {left: 720}, // Keep indent
              spacing: { after: 60 }, // Adjust after spacing
            },
          },
          {
            id: "ImageCaption",
            name: "Image Caption",
            basedOn: "Normal", // Inherits TNR 12pt, Justified, 1.5 spacing
            run: { size: 18, italics: true, font: "Times New Roman" }, // Override to 9pt italic TNR
            paragraph: {
              alignment: AlignmentType.CENTER, // Center captions
              spacing: { line: 240, after: 60 }, // Single line spacing for captions
            },
          },
        ],
        characterStyles: [
            {
              id: "Hyperlink",
              name: "Hyperlink",
              basedOn: "DefaultParagraphFont", // Will inherit TNR and 12pt from paragraph's run
              run: { color: "0563C1", underline: {}, font: "Times New Roman", size: 24 }, // Explicitly set font here too
            }
        ]
      },
       numbering: {
        config: [{
          reference: "default-numbering",
          levels: [{
            level: 0, format: "bullet", text: "•", alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: 720, hanging: 360 },
                spacing: { line: 360, after: 60 }, // 1.5 line, 3pt after
                alignment: AlignmentType.JUSTIFIED,
                run: { font: "Times New Roman", size: 24 }, // TNR 12pt
              }
            }
          },{
            level: 1, format: "bullet", text: "◦", alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: 1440, hanging: 360 },
                spacing: { line: 360, after: 60 },
                alignment: AlignmentType.JUSTIFIED,
                run: { font: "Times New Roman", size: 24 },
              }
            }
          }]
        }]
      }
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="documento_cognick.docx"`,
      },
    });

  } catch (error) {
    console.error('Erro ao gerar DOCX no servidor:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Falha ao gerar o arquivo DOCX.', details: errorMessage }, { status: 500 });
  }
}

    