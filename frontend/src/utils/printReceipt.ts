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

  const htmlContent = element.outerHTML;
  const styles = `
    @page {
      size: ${paperWidth === 'A4' ? 'A4 portrait' : 'auto'};
      margin: 0 !important;
    }
    *, html, body, div, table, thead, tbody, tr, td, th {
      box-sizing: border-box !important;
      overflow: visible !important;
      max-height: none !important;
    }
    * {
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
      font-size: ${paperWidth === '58mm' ? '11px' : paperWidth === 'A4' ? '14px' : '12.5px'} !important;
      font-weight: 700 !important;
      line-height: 1.35 !important;
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
      min-height: 0 !important;
      max-height: none !important;
      overflow: visible !important;
      color: #000000 !important;
      font-weight: 700 !important;
    }
    table {
      width: 100% !important;
      max-width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
      page-break-inside: auto !important;
      break-inside: auto !important;
      font-weight: 700 !important;
    }
    thead {
      display: table-header-group !important;
    }
    tbody {
      display: table-row-group !important;
    }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    th, td {
      color: #000000 !important;
      font-weight: 700 !important;
      overflow-wrap: break-word !important;
      word-break: break-word !important;
      font-size: inherit !important;
    }
    th {
      font-weight: 900 !important;
      border-bottom: 1.5px solid #000000 !important;
    }
    h1, h2, h3, h4, strong, b {
      font-weight: 900 !important;
      color: #000000 !important;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    .no-print {
      display: none !important;
    }
  `;

  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>${styles}</style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `;

  // Strategy 1: Pop-up print window (bypasses all modal and iframe viewport boundaries)
  try {
    const widthPx = paperWidth === 'A4' ? 820 : paperWidth === '58mm' ? 300 : 400;
    const printWindow = window.open('', '_blank', `width=${widthPx},height=700,top=50,left=50,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`);
    
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(fullHtml);
      printWindow.document.close();

      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (e) {
          console.warn('Pop-up print error:', e);
        }
      }, 300);
      return;
    }
  } catch (e) {
    console.warn('Pop-up print blocked, falling back to hidden iframe:', e);
  }

  // Strategy 2: Headless iframe fallback
  const existingIframe = document.getElementById('pos-thermal-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'pos-thermal-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = paperWidth === 'A4' ? '210mm' : paperWidth === '58mm' ? '58mm' : '80mm';
  iframe.style.height = 'auto';
  iframe.style.border = '0';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(fullHtml);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      window.print();
    }
  }, 300);
};
