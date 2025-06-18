
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { Document, Paragraph, HeadingLevel, ImageRun, Packer, AlignmentType, TextRun, IImageOptions, Table, TableCell, TableRow, WidthType, BorderStyle } from 'docx';
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
    let currentHeadingLevel: HeadingLevel | undefined = undefined;
    let isInsideList = false;
    let listLevel = 0;
    let inTable = false;
    let tableRows: TableRow[] = [];
    let currentRowCells: Paragraph[][] = [];


    const flushParagraph = () => {
      if (currentParagraphRuns.length > 0) {
        const paragraphConfig: any = {
          children: [...currentParagraphRuns],
          spacing: { after: 120, line: 360 }, 
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
          currentHeadingLevel = levelMap[token.tag] || HeadingLevel.HEADING_3; 
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
              let textRunOptions: {text?: string, bold?: boolean, italics?: boolean, font?: {name: string}, size?: number, break?: number, style?: string} = {};
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
                 textRunOptions.font = { name: 'Courier New' };
                 textRunOptions.size = 20; // 10pt
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
                         // Attempt to get actual dimensions for better scaling (optional)
                        // This part is tricky without a full image library on server, 
                        // so fixed size or client-provided dimensions are safer.
                        // For now, using fixed size for simplicity.
                        docChildren.push(new Paragraph({
                            children: [ new ImageRun(imageRunOptions) ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 120 },
                        }));
                        if (alt) {
                            docChildren.push(new Paragraph({
                            children: [new TextRun({ text: alt, italics: true, size: 18 })], // 9pt
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 60 },
                            }));
                        }
                    } catch (imgError) {
                        console.warn("Erro ao criar ImageRun: ", imgError);
                         docChildren.push(new Paragraph({ text: `[Imagem indisponível: ${alt}]` , alignment: AlignmentType.CENTER}));
                    }
                  } else {
                     docChildren.push(new Paragraph({ text: `[Falha ao carregar imagem: ${alt}]`, alignment: AlignmentType.CENTER }));
                  }
                }
                continue; // Image is a block element, don't add to currentParagraphRuns
              } else if (child.type === 'link_open') {
                const hrefAttr = child.attrs.find(attr => attr[0] === 'href');
                const href = hrefAttr ? hrefAttr[1] : '#';
                let linkText = '';
                let k = token.children.indexOf(child) + 1;
                while(k < token.children.length && token.children[k].type !== 'link_close') {
                    if(token.children[k].type === 'text') {
                        linkText += token.children[k].content;
                    }
                    // Could handle nested styling within links here if necessary
                    k++;
                }
                textRunOptions.text = linkText || href;
                textRunOptions.style = "Hyperlink";
                
                if (k < token.children.length) token.children.splice(token.children.indexOf(child) + 1, k - (token.children.indexOf(child)));

              } else if (child.type === 'softbreak' || child.type === 'hardbreak') {
                textRunOptions.break = 1;
              }
              
              if(textRunOptions.text || textRunOptions.break){
                currentParagraphRuns.push(new TextRun(textRunOptions));
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
            children: [new TextRun({ text: token.content, font: { name: 'Courier New' }, size: 20 })], // 10pt
            style: "CodeBlockStyle", 
            spacing: { after: 120 }
          }));
          break;
        
        case 'blockquote_open':
          flushParagraph();
          // For blockquotes, a common approach is to apply a style or indent.
          // The content of the blockquote will be in subsequent paragraph tokens.
          // We can set a flag or use a specific paragraph style.
          // For simplicity, we can add an indented paragraph if style is not defined.
           docChildren.push(new Paragraph({ // Placeholder, real content comes in next paragraph
             children: [new TextRun({text: "", italics: true})],
             indent: {left: 720},
             style: "BlockquoteStyle"
           }));
          break;
        case 'blockquote_close':
          flushParagraph();
          break;
          
        case 'hr':
          flushParagraph();
          docChildren.push(new Paragraph({
            children: [new TextRun("___________________________")], // Simple HR representation
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
          break; // markdown-it structure, docx builds rows directly
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
        case 'th_open': // Treat th like td for simplicity here
        case 'td_open':
          // Content for td/th will be in subsequent paragraph_open/inline/paragraph_close tokens
          // We need to collect these into Paragraph objects for the TableCell.
          // This requires a more complex state management or parsing ahead.
          // For a simpler approach, we'll assume text content is directly available or handle in 'inline'.
          // Let's assume content is collected into currentParagraphRuns and then pushed to currentRowCells
          flushParagraph(); // Flush anything before cell content
          currentParagraphRuns = []; // Start fresh for cell content
          break;
        case 'th_close':
        case 'td_close':
          flushParagraph(); // Ensure cell content is captured as a paragraph
          // The flushed paragraph(s) need to be added to currentRowCells
          // This part is tricky if multiple paragraphs are in one cell.
          // For now, let's assume one paragraph per cell based on currentParagraphRuns
          if (docChildren.length > 0 && docChildren[docChildren.length -1] instanceof Paragraph) {
             const cellPara = docChildren.pop() as Paragraph; // take the last paragraph generated
             currentRowCells.push([cellPara]);
          } else if (currentParagraphRuns.length > 0) { // Fallback if no paragraph was pushed to docChildren
             currentRowCells.push([new Paragraph({children: [...currentParagraphRuns]})]);
             currentParagraphRuns = [];
          } else {
             currentRowCells.push([new Paragraph("")]); // Empty cell
          }
          currentParagraphRuns = []; // Reset for next element outside cell
          break;
      }
    }
    flushParagraph(); 

    const doc = new Document({
      sections: [{ children: docChildren }],
      styles: {
        paragraphStyles: [
          { id: "Normal", name: "Normal", run: { font: "Times New Roman", size: 24 }, paragraph: { alignment: AlignmentType.JUSTIFIED, spacing: { line: 360, after: 120 }}},
          { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, font: "Times New Roman" }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 240, after: 120 }}},
          { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, font: "Times New Roman" }, paragraph: { spacing: { before: 240, after: 120 }}},
          { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: "Times New Roman" }, paragraph: { spacing: { before: 120, after: 60 }}},
          { id: "CodeBlockStyle", name: "Code Block Style", basedOn: "Normal", run: { font: "Courier New", size: 20 }, paragraph: { alignment: AlignmentType.LEFT, spacing: { line: 240, after: 120 }, sharding: {fill: "F0F0F0"} } }, // Added shading
          { id: "BlockquoteStyle", name: "Blockquote Style", basedOn: "Normal", run: { italics: true, color: "595959" }, paragraph: { indent: {left: 720}, spacing: {before: 60, after: 60} }},
        ],
        characterStyles: [
            { id: "Hyperlink", name: "Hyperlink", basedOn:"DefaultParagraphFont", run: { color: "0563C1", underline: {}}}
        ]
      },
       numbering: { 
        config: [{
          reference: "default-numbering",
          levels: [{
            level: 0, format: "bullet", text: "•", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } }
          },{
            level: 1, format: "bullet", text: "◦", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } }
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
