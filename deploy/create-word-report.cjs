#!/usr/bin/env node
/**
 * create-word-report.cjs
 * Utility to generate professionally formatted Word (.docx) reports with embedded screenshots,
 * tables, headers, and callout boxes.
 */
const fs = require('fs');
const path = require('path');
const docx = require('docx');

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Header,
  Footer,
  PageNumber
} = docx;

// Parse input arguments
const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help')) {
  console.log(`
Usage:
  node create-word-report.cjs --input report-spec.json --output report.docx
  node create-word-report.cjs --quick "Báo cáo kiểm thử" --image ./screen1.png "Mô tả hình 1" --output report.docx
`);
  process.exit(0);
}

let inputFile = null;
let outputFile = 'report.docx';
let quickTitle = null;
let quickImages = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input' && args[i + 1]) {
    inputFile = args[i + 1];
    i++;
  } else if (args[i] === '--output' && args[i + 1]) {
    outputFile = args[i + 1];
    i++;
  } else if (args[i] === '--quick' && args[i + 1]) {
    quickTitle = args[i + 1];
    i++;
  } else if (args[i] === '--image' && args[i + 1]) {
    quickImages.push({ path: args[i + 1], caption: args[i + 2] || '' });
    i += 2;
  }
}

let spec = {
  title: quickTitle || 'BÁO CÁO HỆ THỐNG',
  subtitle: 'Tài liệu tự động tạo',
  author: 'Hệ thống tự động',
  date: new Date().toLocaleDateString('vi-VN'),
  sections: []
};

if (inputFile) {
  spec = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
} else if (quickImages.length > 0) {
  spec.sections.push({
    heading: '1. Danh sách ảnh chụp giao diện',
    paragraphs: ['Dưới đây là các ảnh chụp giao diện được thu thập tự động từ hệ thống:'],
    images: quickImages
  });
}

const docChildren = [];

// Title & Header Block
docChildren.push(
  new Paragraph({
    text: spec.title,
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 120 }
  })
);

if (spec.subtitle) {
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: spec.subtitle,
          italics: true,
          size: 24,
          color: '555555'
        })
      ],
      spacing: { after: 200 }
    })
  );
}

// Meta info (Author, Date)
if (spec.author || spec.date) {
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${spec.author ? `Người thực hiện: ${spec.author}  |  ` : ''}Ngày: ${spec.date || new Date().toLocaleDateString('vi-VN')}`,
          size: 20,
          color: '777777'
        })
      ],
      spacing: { after: 400 }
    })
  );
}

// Divider
docChildren.push(
  new Paragraph({
    border: { bottom: { color: '4B5563', space: 1, style: BorderStyle.SINGLE, size: 6 } },
    spacing: { after: 300 }
  })
);

// Process sections
(spec.sections || []).forEach((sec) => {
  if (sec.heading) {
    docChildren.push(
      new Paragraph({
        text: sec.heading,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 }
      })
    );
  }

  if (sec.paragraphs) {
    sec.paragraphs.forEach((pText) => {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: pText, size: 24 })],
          spacing: { after: 120 },
          alignment: AlignmentType.JUSTIFIED
        })
      );
    });
  }

  // Handle single image or array of images
  const images = sec.images || (sec.image ? [sec.image] : []);
  images.forEach((imgObj) => {
    if (fs.existsSync(imgObj.path)) {
      const imgBuffer = fs.readFileSync(imgObj.path);
      const width = imgObj.width || 560;
      const height = imgObj.height || Math.round((width * 9) / 16);

      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: imgBuffer,
              transformation: { width: width, height: height }
            })
          ],
          spacing: { before: 180, after: 60 }
        })
      );

      if (imgObj.caption) {
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: imgObj.caption,
                italics: true,
                size: 20,
                color: '666666'
              })
            ],
            spacing: { after: 200 }
          })
        );
      }
    }
  });

  // Handle table if provided
  if (sec.table && sec.table.headers && sec.table.rows) {
    const tableRows = [];

    // Header row
    tableRows.push(
      new TableRow({
        tableHeader: true,
        children: sec.table.headers.map(
          (hText) =>
            new TableCell({
              shading: { fill: '2563EB' },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: hText, bold: true, color: 'FFFFFF', size: 22 })]
                })
              ]
            })
        )
      })
    );

    // Data rows
    sec.table.rows.forEach((row, rIdx) => {
      tableRows.push(
        new TableRow({
          children: row.map(
            (cText) =>
              new TableCell({
                shading: { fill: rIdx % 2 === 0 ? 'F9FAFB' : 'FFFFFF' },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: String(cText), size: 20 })]
                  })
                ]
              })
          )
        })
      );
    });

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 200 } }));
  }
});

const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: 'Times New Roman'
        }
      }
    }
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: spec.title,
                  size: 16,
                  color: '888888',
                  italics: true
                })
              ]
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  children: ['Trang ', PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES],
                  size: 18,
                  color: '888888'
                })
              ]
            })
          ]
        })
      },
      children: docChildren
    }
  ]
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputFile, buffer);
  console.log(`[SUCCESS] Báo cáo Word đã được xuất thành công tại: ${path.resolve(outputFile)}`);
});
