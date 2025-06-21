
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
    let currentHeadingStyleId: string | undefined = undefined;
    let isInsideList = false;
    let listLevel = 0;
    let inTable = false;
    let tableRows: TableRow[] = [];
    let currentRowCells: Paragraph[][] = [];
    let isInsideBlockquote = false;
    let addPageBreakBeforeNextPara = false;

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

        if (addPageBreakBeforeNextPara) {
          paragraphConfig.pageBreakBefore = true;
          addPageBreakBeforeNextPara = false;
        }
        
        if (currentHeadingStyleId) {
          paragraphConfig.style = currentHeadingStyleId;
        } else if (isInsideList) {
          paragraphConfig.bullet = { level: listLevel };
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

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      switch (token.type) {
        case 'heading_open':
          flushParagraph();

          const nextToken = tokens[i + 1];
          if (nextToken && nextToken.type === 'inline' && nextToken.content) {
            const headingText = nextToken.content.trim().toLowerCase();
            const pageBreakSections = [
              'resumo',
              'lista de abreviaturas e siglas',
              'introdução',
              'metodologia',
              'conclusão',
              'referências bibliográficas',
              'referencias bibliograficas'
            ];
            
            const normalizedHeading = headingText.replace(/^[\d.\s]*/, '');
            
            if (pageBreakSections.includes(normalizedHeading)) {
                addPageBreakBeforeNextPara = true;
            }
          }
          
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
              let textRunOptions: any = {font: "Times New Roman", size: 24};

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
                              children: [new TextRun({ text: alt })],
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
                textRunOptions.style = "Hyperlink";

                if (k < token.children.length) token.children.splice(token.children.indexOf(child) + 1, k - (token.children.indexOf(child)));

              } else if (child.type === 'softbreak' || child.type === 'hardbreak') {
                textRunOptions.break = 1;
              }

              if(textRunOptions.text || textRunOptions.break){
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
            children: [new TextRun({ text: token.content })],
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
          flushParagraph(); 
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
        default: {
          paragraph: {
            run: { font: "Times New Roman", size: 24 }, 
            spacing: { line: 360, after: 120 },
            alignment: AlignmentType.JUSTIFIED,
          },
        },
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            basedOn: "Normal",
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
            basedOn: "Normal", 
            next: "Normal",
            quickFormat: true,
            run: { bold: true },
            paragraph: {
              alignment: AlignmentType.CENTER,
              spacing: { before: 240, after: 120, line: 360 },
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
            basedOn: "Normal",
            run: {},
            paragraph: {
              alignment: AlignmentType.LEFT,
              spacing: { line: 240, after: 120 },
              shading: { type: ShadingType.CLEAR, fill: "F0F0F0" },
            },
          },
          {
            id: "BlockquoteStyle",
            name: "Blockquote Style",
            basedOn: "Normal",
            run: { italics: true },
            paragraph: {
              indent: {left: 720},
              spacing: { after: 60 },
            },
          },
          {
            id: "ImageCaption",
            name: "Image Caption",
            basedOn: "Normal",
            run: { size: 18, italics: true, font: "Times New Roman" },
            paragraph: {
              alignment: AlignmentType.CENTER,
              spacing: { line: 240, after: 60 },
            },
          },
        ],
        characterStyles: [
            {
              id: "Hyperlink",
              name: "Hyperlink",
              basedOn: "DefaultParagraphFont",
              run: { color: "0563C1", underline: {}, font: "Times New Roman", size: 24 },
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
                spacing: { line: 360, after: 60 },
                alignment: AlignmentType.JUSTIFIED,
                run: { font: "Times New Roman", size: 24 },
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
