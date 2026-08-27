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
          html, body {
            width: ${paperWidth} !important;
            max-width: ${paperWidth} !important;
            min-width: ${paperWidth} !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 auto !important;
            padding: 2mm 2.5mm 10mm 2.5mm !important;
            font-family: 'Courier New', Courier, monospace, system-ui;
            font-size: ${paperWidth === '58mm' ? '9.5px' : '11px'};
            line-height: 1.35;
            color: #000000;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .pos-thermal-receipt,
          #customer-statement-thermal-slip,
          #supplier-statement-thermal-slip,
          #po-thermal-slip,
          #pos-receipt-print-area {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          table {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse;
            table-layout: fixed;
            word-wrap: break-word;
          }
          th, td {
            color: #000000;
            overflow-wrap: break-word;
            word-break: break-word;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
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
