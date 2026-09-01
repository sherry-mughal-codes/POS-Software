/**
 * Dedicated Executive Business Report Printing Utility (A4 / Letter Format).
 * Generates an isolated, headless printable document that guarantees
 * high-resolution, professional paper and PDF exports without browser header/footer clutter (no localhost / no URLs).
 */

export interface ReportPrintHeader {
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  reportTitle: string;
  periodLabel: string;
}

export const printReportElement = (
  elementId: string,
  header: ReportPrintHeader
) => {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  // Create isolated hidden iframe
  let iframe = document.getElementById('apexpos-report-print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'apexpos-report-print-iframe';
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
  const nowDateTimeStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ', ' + new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>&nbsp;</title>
        <style>
          /* Zero margin suppress browser's default headers (title/date) and footers (localhost URL) */
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            color: #000000 !important;
            font-weight: 700 !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #000000;
            background: #ffffff;
            font-size: 10.5pt;
            font-weight: 700;
            line-height: 1.45;
            padding: 14mm 14mm 14mm 14mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            -webkit-font-smoothing: antialiased !important;
          }
          .report-header {
            border-bottom: 2.5px solid #000000;
            padding-bottom: 8px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .store-name {
            font-size: 16pt;
            font-weight: 900;
            color: #000000;
            text-transform: uppercase;
            letter-spacing: -0.02em;
          }
          .store-contact {
            font-size: 9.5pt;
            color: #000000;
            font-weight: 700;
            margin-top: 2px;
          }
          .report-meta {
            text-align: right;
          }
          .report-title-badge {
            font-size: 12pt;
            font-weight: 900;
            color: #000000;
            text-transform: uppercase;
          }
          .report-period {
            font-size: 9.5pt;
            color: #000000;
            font-weight: 700;
            margin-top: 2px;
          }
          .kpi-grid {
            display: flex;
            gap: 10px;
            margin-bottom: 12px;
          }
          .kpi-box {
            flex: 1;
            border: 1.5px solid #000000;
            background-color: #ffffff;
            border-radius: 4px;
            padding: 8px 10px;
          }
          .kpi-title {
            font-size: 8.5pt;
            font-weight: 800;
            text-transform: uppercase;
            color: #000000;
          }
          .kpi-value {
            font-size: 13pt;
            font-weight: 900;
            color: #000000;
            font-family: 'JetBrains Mono', 'Courier New', monospace;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 10pt;
            font-weight: 700;
          }
          th {
            background-color: #f1f5f9;
            color: #000000;
            font-weight: 900;
            text-align: left;
            padding: 7px 9px;
            border-top: 1.5px solid #000000;
            border-bottom: 2px solid #000000;
            font-size: 9.5pt;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          td {
            padding: 6px 9px;
            border-bottom: 1px solid #000000;
            color: #000000;
            font-weight: 700;
          }
          tr:nth-child(even) td {
            background-color: #f8fafc;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .font-mono {
            font-family: 'JetBrains Mono', 'Courier New', monospace;
            font-weight: 700;
          }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 8.5pt;
            font-weight: 800;
            border: 1.5px solid #000000;
            color: #000000;
          }
          .card-title-bar, .card-header h3, h3 {
            font-size: 11pt;
            font-weight: 900;
            color: #000000;
            border-bottom: 1.5px solid #000000;
            padding-bottom: 4px;
            margin-bottom: 6px;
            margin-top: 8px;
          }
          /* Hide card subtitles, buttons, and footers from print */
          .card-subtitle,
          .card-header p,
          [class*="subtitle"],
          .report-footer,
          .no-print,
          button,
          nav,
          aside {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <div class="store-name">${header.companyName || 'APEX POS'}</div>
            <div class="store-contact">
              ${header.companyAddress ? `${header.companyAddress}` : 'Main Commercial Branch'}
              ${header.companyPhone ? ` • Phone: ${header.companyPhone}` : ''}
            </div>
          </div>
          <div class="report-meta">
            <div class="report-title-badge">${header.reportTitle}</div>
            <div class="report-period">
              Period: <strong>${header.periodLabel}</strong> (${nowDateTimeStr})
            </div>
          </div>
        </div>

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
      console.error('Print iframe error:', e);
      window.print();
    }
  }, 250);
};
