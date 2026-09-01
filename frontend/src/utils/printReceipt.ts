/**
 * Dedicated POS Thermal Slip Printing Utility
 * Isolates the receipt HTML inside a headless 80mm/58mm printable frame,
 * preventing browser modal headers, gray backdrops, and full-page margins.
 */

export interface ThermalPrintOptions {
  paperWidth?: '80mm' | '58mm' | 'A4';
  title?: string;
}

export const printThermalElement = (elementId: string, options: ThermalPrintOptions = {}) => {
  const { paperWidth = '80mm', title = 'Receipt' } = options;
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  // Remove existing iframe if present to prevent cached/stale DOM
  const existingIframe = document.getElementById('pos-thermal-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  // Create isolated headless printable iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'pos-thermal-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-99999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  const htmlContent = element.outerHTML;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: ${paperWidth === 'A4' ? 'A4 portrait' : paperWidth === '58mm' ? '58mm auto' : '80mm auto'};
            margin: 0 !important;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            color: #000000 !important;
            font-weight: 700 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            width: 100% !important;
            max-width: ${paperWidth === 'A4' ? '210mm' : paperWidth === '58mm' ? '58mm' : '80mm'} !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 auto !important;
            padding: 3mm 2.5mm !important;
            font-family: 'Courier New', Courier, monospace, system-ui, sans-serif !important;
            font-size: ${paperWidth === '58mm' ? '11.5px' : paperWidth === 'A4' ? '14px' : '13px'} !important;
            font-weight: 700 !important;
            line-height: 1.4 !important;
            color: #000000 !important;
            background: #ffffff !important;
            -webkit-font-smoothing: antialiased !important;
          }
          .pos-thermal-receipt,
          #customer-statement-thermal-slip,
          #supplier-statement-thermal-slip,
          #po-thermal-slip,
          #customer-warranty-slip,
          #supplier-warranty-slip,
          #pos-receipt-print-area {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            page-break-after: auto !important;
            color: #000000 !important;
            font-weight: 700 !important;
            font-size: ${paperWidth === '58mm' ? '11.5px' : paperWidth === 'A4' ? '14px' : '13px'} !important;
          }
          table {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse;
            table-layout: fixed;
            word-wrap: break-word;
            page-break-inside: auto !important;
            font-weight: 700 !important;
          }
          th, td {
            color: #000000 !important;
            font-weight: 700 !important;
            overflow-wrap: break-word;
            word-break: break-word;
            font-size: inherit !important;
          }
          th {
            font-weight: 900 !important;
            border-bottom: 1.5px solid #000000 !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          h1, h2, h3, h4, strong, b {
            font-weight: 900 !important;
            color: #000000 !important;
          }
          img {
            max-width: 100%;
            height: auto;
            filter: contrast(150%) brightness(90%);
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
