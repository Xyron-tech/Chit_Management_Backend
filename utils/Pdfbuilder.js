const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');


const currency = (amt) => {
  return `Rs. ${(Number(amt) || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
};

const getOrdinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;

  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};


const fontsPath = path.join(__dirname, '../fonts');

const fontFiles = {
  regular: path.join(
    fontsPath,
    'Poppins-Regular.ttf'
  ),

  medium: path.join(
    fontsPath,
    'Poppins-Medium.ttf'
  ),

  semibold: path.join(
    fontsPath,
    'Poppins-SemiBold.ttf'
  ),
};

const hasPoppinsFonts =
  fs.existsSync(fontFiles.regular) &&
  fs.existsSync(fontFiles.medium) &&
  fs.existsSync(fontFiles.semibold);

const streamMonthStatementPdf = (
  res,
  filename,
  statement
) => {
  const {
    chit,
    monthNum,
    rows = [],
    paidCount = 0,
    pendingCount = 0,
    collected = 0,
    prized = null,
    prizeReceived = 0,
  } = statement;

  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    bufferPages: true,
  });


  res.setHeader(
    'Content-Type',
    'application/pdf'
  );

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"`
  );

  doc.pipe(res);


  if (hasPoppinsFonts) {
    doc.registerFont(
      'Poppins',
      fontFiles.regular
    );

    doc.registerFont(
      'Poppins-Medium',
      fontFiles.medium
    );

    doc.registerFont(
      'Poppins-SemiBold',
      fontFiles.semibold
    );
  }


  const font = (type = 'regular') => {
    if (!hasPoppinsFonts) {
      return type === 'semibold'
        ? 'Helvetica-Bold'
        : 'Helvetica';
    }

    if (type === 'semibold') {
      return 'Poppins-SemiBold';
    }

    if (type === 'medium') {
      return 'Poppins-Medium';
    }

    return 'Poppins';
  };

 
  const colors = {
    primary: '#111827',
    secondary: '#667085',
    border: '#E4E7EC',
    headerBg: '#F8FAFC',
    paid: '#027A48',
    pending: '#B54708',
    noPayment: '#667085',
    prize: '#8F6A2F',
    white: '#FFFFFF',
  };

  const pageLeft = 40;
  const pageRight = 40;

  const pageWidth =
    doc.page.width -
    pageLeft -
    pageRight;

  doc
    .font(font('semibold'))
    .fontSize(20)
    .fillColor(colors.primary)
    .text(
      chit?.chitName || 'Chit'
    );

  doc.moveDown(0.2);

  const chitType =
    chit?.chitType === 'auction'
      ? 'Auction Chit'
      : 'Tallu Chit';

  doc
    .font(font('medium'))
    .fontSize(11)
    .fillColor(colors.secondary)
    .text(
      `${chitType}  ·  ${getOrdinal(monthNum)} Month`
    );

  doc.moveDown(0.8);


  const summaryY = doc.y;
  const summaryHeight = 66;

  doc
    .roundedRect(
      pageLeft,
      summaryY,
      pageWidth,
      summaryHeight,
      6
    )
    .fillColor(colors.headerBg)
    .fill();


  doc
    .font(font('semibold'))
    .fontSize(9)
    .fillColor(colors.secondary)
    .text(
      'PAID',
      pageLeft + 15,
      summaryY + 12
    );

  doc
    .font(font('semibold'))
    .fontSize(16)
    .fillColor(colors.primary)
    .text(
      String(paidCount),
      pageLeft + 15,
      summaryY + 28
    );


  doc
    .font(font('semibold'))
    .fontSize(9)
    .fillColor(colors.secondary)
    .text(
      'PENDING',
      pageLeft + 120,
      summaryY + 12
    );

  doc
    .font(font('semibold'))
    .fontSize(16)
    .fillColor(colors.primary)
    .text(
      String(pendingCount),
      pageLeft + 120,
      summaryY + 28
    );


  doc
    .font(font('semibold'))
    .fontSize(9)
    .fillColor(colors.secondary)
    .text(
      'COLLECTED',
      pageLeft + 230,
      summaryY + 12
    );

  doc
    .font(font('semibold'))
    .fontSize(16)
    .fillColor(colors.primary)
    .text(
      currency(collected),
      pageLeft + 230,
      summaryY + 28
    );

  doc.y =
    summaryY +
    summaryHeight +
    18;


  if (prized) {
    const prizeText =
      `Prized this month: ${prized.memberName}` +
      `${prized.phone ? ` (${prized.phone})` : ''}` +
      `  ·  Received ${currency(prizeReceived)}`;

    doc
      .font(font('semibold'))
      .fontSize(10.5)
      .fillColor(colors.prize)
      .text(prizeText, pageLeft, doc.y, {
        width: pageWidth,
        align: 'left',
      });

    doc.moveDown(0.8);
  }


  const tableX = pageLeft;
  const tableWidth = pageWidth;

  const colWidths = [
    28,
    130,
    90,
    80,
    75,
    tableWidth -
      (28 + 130 + 90 + 80 + 75),
  ];

  const headers = [
    '#',
    'Member',
    'Phone',
    'Amount',
    'Status',
    'Paid On',
  ];


  const drawTableHeader = () => {
    const y = doc.y;
    const headerHeight = 34;

    // Header background
    doc
      .rect(
        tableX,
        y,
        tableWidth,
        headerHeight
      )
      .fillColor(colors.headerBg)
      .fill();

    let x = tableX;

    headers.forEach(
      (header, index) => {
        doc
          .font(font('semibold'))
          .fontSize(9.5)
          .fillColor(colors.primary)
          .text(
            header,
            x + 6,
            y + 12,
            {
              width:
                colWidths[index] - 12,

              align:
                index === 0
                  ? 'center'
                  : 'left',

              lineBreak: false,
            }
          );

        x += colWidths[index];
      }
    );

    doc
      .moveTo(
        tableX,
        y + headerHeight
      )
      .lineTo(
        tableX + tableWidth,
        y + headerHeight
      )
      .strokeColor(colors.border)
      .stroke();

    doc.y =
      y + headerHeight;
  };

  const drawTableRow = (
    row,
    index
  ) => {
    const rowHeight = 42;

    if (
      doc.y + rowHeight >
      doc.page.height - 60
    ) {
      doc.addPage();

      doc.y = 40;

      drawTableHeader();
    }

    const y = doc.y;

    let status = 'No payment';

    if (row.payment) {
      status =
        row.payment.status === 'paid'
          ? 'Paid'
          : 'Pending';
    }

    let paidOn = '-';

    if (row.payment?.paidAt) {
      paidOn = new Date(
        row.payment.paidAt
      ).toLocaleDateString(
        'en-IN'
      );
    }

    const memberName =
      row.member?.memberName ||
      '-';

    const displayName =
      memberName +
      (row.isPrized ? ' *' : '');

    const values = [
      index + 1,
      displayName,
      row.member?.phone || '-',
      currency(row.amt),
      status,
      paidOn,
    ];


    let x = tableX;

    values.forEach(
      (value, colIndex) => {
        let textColor =
          colors.primary;

        // Status color
        if (colIndex === 4) {
          if (status === 'Paid') {
            textColor =
              colors.paid;
          } else if (
            status === 'Pending'
          ) {
            textColor =
              colors.pending;
          } else {
            textColor =
              colors.noPayment;
          }
        }

        doc
          .font(
            colIndex === 4
              ? font('semibold')
              : colIndex === 1 || colIndex === 3
              ? font('medium')
              : font('regular')
          )
          .fontSize(9.5)
          .fillColor(textColor)
          .text(
            String(value),
            x + 6,
            y + 13,
            {
              width:
                colWidths[colIndex] - 12,

              align:
                colIndex === 0
                  ? 'center'
                  : 'left',

              ellipsis: true,
              lineBreak: false,
            }
          );

        x +=
          colWidths[colIndex];
      }
    );

    doc
      .moveTo(
        tableX,
        y + rowHeight
      )
      .lineTo(
        tableX + tableWidth,
        y + rowHeight
      )
      .strokeColor(colors.border)
      .stroke();

    doc.y =
      y + rowHeight;
  };

  drawTableHeader();

  rows.forEach(
    (row, index) => {
      drawTableRow(
        row,
        index
      );
    }
  );

  if (
    rows.some(
      (row) => row.isPrized
    )
  ) {
    doc.moveDown(0.7);
  }

  const range =
    doc.bufferedPageRange();

  for (
    let i = range.start;
    i < range.start + range.count;
    i++
  ) {
    doc.switchToPage(i);

    const originalBottomMargin =
      doc.page.margins.bottom;

    doc.page.margins.bottom = 0;

    const footerY =
      doc.page.height - 28;

    doc
      .font(font('medium'))
      .fontSize(8)
      .fillColor('#98A2B3')
      .text(
        `Generated by Multi Chit  ·  Page ${
          i + 1
        } of ${range.count}`,
        pageLeft,
        footerY,
        {
          width: pageWidth,
          align: 'center',
          lineBreak: false,
        }
      );

    doc.page.margins.bottom =
      originalBottomMargin;
  }

  doc.end();
};

module.exports = {
  streamMonthStatementPdf,
};