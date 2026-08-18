/**
 * Dedicated POS Thermal Slip Printing Utility
 * Isolates the receipt HTML inside a headless 80mm/58mm printable frame,
 * preventing browser modal headers, gray backdrops, and full-page margins.
 */

export interface ThermalPrintOptions {
  paperWidth?: '80mm' | '58mm';
  title?: string;
}

export const printThermalElement = (elementId: string, options: ThermalPrintOptions = {}) => {
  const { paperWidth = '80mm', title = 'Receipt' } = options;
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  // Create isolated hidden iframe
  let iframe = document.getElementById('pos-thermal-print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'pos-thermal-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  const htmlContent = element.innerHTML;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: ${paperWidth} auto;
            margin: 0mm !important;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            width: ${paperWidth};
            max-width: ${paperWidth};
            min-width: ${paperWidth};
            margin: 0 auto;
            padding: 2mm 3mm 8mm 3mm;
            font-family: 'Courier New', Courier, monospace, system-ui;
            font-size: ${paperWidth === '58mm' ? '10.5px' : '12px'};
            line-height: 1.35;
            color: #000000;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            color: #000000;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          .no-print {
            display: none !important;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      window.print();
    }
  }, 250);
};
