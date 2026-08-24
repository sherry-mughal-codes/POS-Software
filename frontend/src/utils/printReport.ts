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
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            font-size: 9.5pt;
            line-height: 1.4;
            padding: 14mm 14mm 14mm 14mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .report-header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .store-name {
            font-size: 15pt;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: -0.02em;
          }
          .store-contact {
            font-size: 8.5pt;
            color: #475569;
            margin-top: 2px;
          }
          .report-meta {
            text-align: right;
          }
          .report-title-badge {
            font-size: 11pt;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
          }
          .report-period {
            font-size: 8.5pt;
            color: #475569;
            margin-top: 2px;
          }
          .kpi-grid {
            display: flex;
            gap: 10px;
            margin-bottom: 12px;
          }
          .kpi-box {
            flex: 1;
            border: 1px solid #cbd5e1;
            background-color: #f8fafc;
            border-radius: 4px;
            padding: 7px 9px;
          }
          .kpi-title {
            font-size: 7.5pt;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
          }
          .kpi-value {
            font-size: 11.5pt;
            font-weight: 800;
            color: #0f172a;
            font-family: 'JetBrains Mono', 'Courier New', monospace;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 9pt;
          }
          th {
            background-color: #f1f5f9;
            color: #1e293b;
            font-weight: 700;
            text-align: left;
            padding: 6px 8px;
            border-top: 1px solid #cbd5e1;
            border-bottom: 1.5px solid #94a3b8;
            font-size: 8.5pt;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          td {
            padding: 5.5px 8px;
            border-bottom: 1px solid #e2e8f0;
            color: #1e293b;
          }
          tr:nth-child(even) td {
            background-color: #fafafa;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .font-mono {
            font-family: 'JetBrains Mono', 'Courier New', monospace;
          }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 7.5pt;
            font-weight: 700;
            border: 1px solid #cbd5e1;
          }
          .card-title-bar, .card-header h3, h3 {
            font-size: 10pt;
            font-weight: 700;
            color: #0f172a;
            border-bottom: 1px solid #e2e8f0;
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
