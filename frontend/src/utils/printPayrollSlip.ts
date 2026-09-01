/**
 * Dedicated Professional Payroll / Salary Slip Printing Utility
 * Supports 80mm and 58mm Thermal Printers as well as A4 corporate format.
 */

import { SalarySlip } from '../types/employee';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  if (num % 1 === 0) {
    return num.toLocaleString();
  }
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export interface PayrollPrintOptions {
  paperWidth?: '80mm' | '58mm' | 'A4';
  storeName?: string;
  address?: string;
  phone?: string;
}

export const printPayrollSlip = (
  slip: SalarySlip,
  options: PayrollPrintOptions | string = 'ApexPOS Retail Financial Core'
) => {
  if (!slip) return;

  const config: PayrollPrintOptions =
    typeof options === 'string'
      ? { storeName: options, paperWidth: '80mm' }
      : { paperWidth: '80mm', storeName: 'ApexPOS Retail Financial Core', ...options };

  const paperWidth = config.paperWidth || '80mm';
  const isThermal = paperWidth === '80mm' || paperWidth === '58mm';
  const storeName = config.storeName || 'ApexPOS Retail Financial Core';

  // Create or reuse hidden print iframe
  let iframe = document.getElementById('payroll-slip-print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'payroll-slip-print-iframe';
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

  let htmlContent = '';

  if (isThermal) {
    // ----------------------------------------------------
    // 80mm / 58mm THERMAL RECEIPT FORMAT
    // ----------------------------------------------------
    const paymentsThermal =
      slip.payments && slip.payments.length > 0
        ? slip.payments
            .map(
              (p) => `
              <div style="display: flex; justify-content: space-between; font-size: 0.72rem; padding: 1px 0;">
                <span>${p.payment_number} (${p.date}):</span>
                <span style="font-family: monospace; font-weight: 700;">Rs. ${formatMoney(p.amount)}</span>
              </div>
            `
            )
            .join('')
        : '<div style="font-size: 0.7rem; color: #4b5563; text-align: center; font-style: italic;">No payment disbursements recorded yet.</div>';

    htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Salary Slip - ${slip.slip_number}</title>
          <style>
            @page {
              size: ${paperWidth} auto;
              margin: 0mm !important;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              color: #000000 !important;
              font-weight: 700 !important;
            }
            body {
              width: ${paperWidth};
              max-width: ${paperWidth};
              min-width: ${paperWidth};
              margin: 0 auto;
              padding: 2mm 3mm 8mm 3mm;
              font-family: 'Courier New', Courier, monospace, system-ui, sans-serif;
              font-size: ${paperWidth === '58mm' ? '11.5px' : '13px'};
              line-height: 1.4;
              color: #000000;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              -webkit-font-smoothing: antialiased;
            }
            .divider {
              border-top: 1.5px dashed #000000;
              margin: 6px 0;
            }
            .row {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
              font-size: inherit;
            }
            .title {
              text-align: center;
              font-weight: 900;
              font-size: ${paperWidth === '58mm' ? '14px' : '16px'};
              text-transform: uppercase;
              color: #000000;
            }
            .subtitle {
              text-align: center;
              font-size: ${paperWidth === '58mm' ? '10.5px' : '12px'};
              margin-top: 2px;
              color: #000000;
              font-weight: 700;
            }
            .badge {
              text-align: center;
              font-weight: 900;
              font-size: ${paperWidth === '58mm' ? '11.5px' : '13px'};
              margin: 4px 0;
              padding: 3px;
              border: 1.5px solid #000000;
              color: #000000;
            }
            .total-box {
              border-top: 2px solid #000000;
              border-bottom: 2px solid #000000;
              padding: 5px 0;
              margin: 5px 0;
              color: #000000;
            }
          </style>
        </head>
        <body>
          <div class="title">${storeName}</div>
          <div class="subtitle">Salary & Compensation Pay Slip</div>
          ${config.phone ? `<div class="subtitle">Tel: ${config.phone}</div>` : ''}

          <div class="badge">=== SALARY PAY SLIP ===</div>

          <div class="row"><span>Slip #:</span><span style="font-weight: 800;">${slip.slip_number}</span></div>
          <div class="row"><span>Period:</span><span style="font-weight: 800;">${slip.payroll_period}</span></div>
          <div class="row"><span>Date:</span><span>${slip.date}</span></div>

          <div class="divider"></div>

          <div class="row"><span>Staff Name:</span><span style="font-weight: 700;">${slip.employee_name}</span></div>
          <div class="row"><span>Staff ID:</span><span>${slip.employee_code}</span></div>
          <div class="row"><span>Designation:</span><span>${slip.job_title || 'N/A'}</span></div>
          <div class="row"><span>Department:</span><span>${slip.department || 'N/A'}</span></div>

          <div class="divider"></div>

          <div style="font-weight: 700; text-transform: uppercase; font-size: 11px; margin-bottom: 3px;">Earnings & Deductions</div>
          <div class="row">
            <span>Basic Base Salary:</span>
            <span style="font-weight: 700;">Rs. ${formatMoney(slip.basic_salary)}</span>
          </div>
          <div class="row">
            <span>Allowances / Bonus (+):</span>
            <span style="font-weight: 700;">+ Rs. ${formatMoney(slip.allowances)}</span>
          </div>
          <div class="row">
            <span>Deductions / Absences (-):</span>
            <span style="font-weight: 700;">- Rs. ${formatMoney(slip.deductions)}</span>
          </div>

          <div class="total-box">
            <div class="row" style="font-size: ${paperWidth === '58mm' ? '12px' : '14px'}; font-weight: 900;">
              <span>NET PAYABLE:</span>
              <span>Rs. ${formatMoney(slip.net_salary)}</span>
            </div>
          </div>

          <div class="row">
            <span>Amount Disbursed:</span>
            <span style="font-weight: 700;">Rs. ${formatMoney(slip.paid_amount)}</span>
          </div>
          <div class="row" style="font-weight: 700;">
            <span>Remaining Balance:</span>
            <span>Rs. ${formatMoney(slip.payable_amount)}</span>
          </div>

          ${slip.journal_entry_number ? `
          <div class="row" style="font-size: 9.5px; color: #333333; margin-top: 2px;">
            <span>GL Accrual Ref:</span>
            <span>${slip.journal_entry_number}</span>
          </div>` : ''}

          ${slip.payments && slip.payments.length > 0 ? `
          <div class="divider"></div>
          <div style="font-weight: 700; font-size: 10.5px; margin-bottom: 2px;">Disbursement Vouchers:</div>
          ${paymentsThermal}` : ''}

          ${slip.notes ? `
          <div class="divider"></div>
          <div style="font-size: 9.5px;"><strong>Note:</strong> ${slip.notes}</div>` : ''}

          <div class="divider"></div>

          <div style="margin-top: 20px; display: flex; justify-content: space-between; font-size: 10px;">
            <div style="text-align: center; width: 45%; border-top: 1px solid #000000; padding-top: 3px;">
              Prepared By
            </div>
            <div style="text-align: center; width: 45%; border-top: 1px solid #000000; padding-top: 3px;">
              Employee Signature
            </div>
          </div>

          <div style="text-align: center; margin-top: 10px; font-size: 9px; color: #444444;">
            System Generated • ApexPOS HR Core
            <div>Printed: ${new Date().toLocaleTimeString()}</div>
          </div>
        </body>
      </html>
    `;
  } else {
    // ----------------------------------------------------
    // A4 CORPORATE REPORT FORMAT
    // ----------------------------------------------------
    const paymentsHtml =
      slip.payments && slip.payments.length > 0
        ? slip.payments
            .map(
              (p) => `
              <tr>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${p.payment_number}</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${p.date}</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${(p as any).payment_method_display || p.payment_method}</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${p.payment_account_name || 'N/A'}</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #16a34a;">Rs. ${formatMoney(p.amount)}</td>
              </tr>
            `
            )
            .join('')
        : `<tr><td colspan="5" style="padding: 8px; text-align: center; color: #64748b; font-style: italic;">No payment disbursements recorded yet.</td></tr>`;

    htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Salary Slip - ${slip.slip_number}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
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
              font-size: 13px;
              line-height: 1.45;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              padding: 10px;
            }
            .slip-container {
              border: 2px solid #0f172a;
              border-radius: 8px;
              padding: 24px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 16px;
              margin-bottom: 18px;
            }
            .company-title {
              font-size: 22px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: -0.5px;
            }
            .company-sub {
              font-size: 12px;
              color: #475569;
              margin-top: 3px;
              font-weight: 500;
            }
            .slip-badge {
              display: inline-block;
              background: #0f172a;
              color: #ffffff;
              font-size: 12px;
              font-weight: 700;
              padding: 4px 10px;
              border-radius: 4px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              margin-bottom: 18px;
            }
            .info-card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 12px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 3px 0;
              font-size: 12.5px;
            }
            .info-label {
              color: #64748b;
              font-weight: 600;
            }
            .info-val {
              color: #0f172a;
              font-weight: 700;
            }
            .table-section {
              margin-bottom: 18px;
            }
            .table-title {
              font-size: 13px;
              font-weight: 700;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
              border-left: 3px solid #0f172a;
              padding-left: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12.5px;
            }
            th {
              background: #f1f5f9;
              color: #334155;
              font-weight: 700;
              padding: 8px 10px;
              border: 1px solid #cbd5e1;
              text-align: left;
            }
            td {
              padding: 8px 10px;
              border: 1px solid #e2e8f0;
            }
            .total-row {
              background: #f8fafc;
              font-weight: 800;
              font-size: 14px;
            }
            .net-payable-box {
              background: #f0fdf4;
              border: 2px solid #16a34a;
              border-radius: 6px;
              padding: 14px 18px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 18px;
            }
            .net-title {
              font-size: 14px;
              font-weight: 700;
              color: #166534;
              text-transform: uppercase;
            }
            .net-amount {
              font-size: 24px;
              font-weight: 900;
              color: #15803d;
              font-family: monospace;
            }
            .signatures {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
              margin-top: 36px;
              padding-top: 16px;
            }
            .sig-box {
              text-align: center;
              border-top: 1px dashed #94a3b8;
              padding-top: 8px;
              font-size: 11.5px;
              color: #475569;
              font-weight: 600;
            }
            .footer-note {
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              margin-top: 20px;
              border-top: 1px solid #f1f5f9;
              padding-top: 8px;
            }
          </style>
        </head>
        <body>
          <div class="slip-container">
            <div class="header">
              <div>
                <div class="company-title">${storeName}</div>
                <div class="company-sub">Human Resources & Payroll Management Department</div>
                <div class="company-sub">Official Salary & Compensation Pay Slip</div>
              </div>
              <div style="text-align: right;">
                <div class="slip-badge">${slip.status_display || slip.status}</div>
                <div style="font-size: 14px; font-weight: 800; font-family: monospace; color: #0f172a;">${slip.slip_number}</div>
                <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">Pay Period: <strong>${slip.payroll_period}</strong></div>
                <div style="font-size: 11.5px; color: #64748b;">Issued Date: <strong>${slip.date}</strong></div>
              </div>
            </div>

            <div class="grid-2">
              <div class="info-card">
                <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Employee Information</div>
                <div class="info-row"><span class="info-label">Full Name:</span><span class="info-val">${slip.employee_name}</span></div>
                <div class="info-row"><span class="info-label">Employee Code:</span><span class="info-val">${slip.employee_code}</span></div>
                <div class="info-row"><span class="info-label">Designation:</span><span class="info-val">${slip.job_title || 'N/A'}</span></div>
                <div class="info-row"><span class="info-label">Department:</span><span class="info-val">${slip.department || 'N/A'}</span></div>
              </div>

              <div class="info-card">
                <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Payroll & Accounting Meta</div>
                <div class="info-row"><span class="info-label">Payroll Month/Year:</span><span class="info-val">${slip.month} / ${slip.year}</span></div>
                <div class="info-row"><span class="info-label">GL Accrual Entry:</span><span class="info-val">${slip.journal_entry_number || 'N/A'}</span></div>
                <div class="info-row"><span class="info-label">Prepared By:</span><span class="info-val">${slip.created_by_name || 'System Administrator'}</span></div>
                <div class="info-row"><span class="info-label">Disbursement Status:</span><span class="info-val" style="color: ${slip.payable_amount > 0 ? '#dc2626' : '#16a34a'};">${slip.is_fully_paid ? 'CLEARED' : 'DUE / PARTIAL'}</span></div>
              </div>
            </div>

            <div class="table-section">
              <div class="table-title">Earnings & Deductions Statement</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 60%;">Description / Head</th>
                    <th style="text-align: right; width: 20%;">Type</th>
                    <th style="text-align: right; width: 20%;">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="font-weight: 600;">Basic Base Salary</td>
                    <td style="text-align: right; color: #3b82f6; font-weight: 600;">EARNING</td>
                    <td style="text-align: right; font-family: monospace; font-weight: 700;">Rs. ${formatMoney(slip.basic_salary)}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: 600;">Allowances, Overtime & Bonuses</td>
                    <td style="text-align: right; color: #16a34a; font-weight: 600;">ADDITION (+)</td>
                    <td style="text-align: right; font-family: monospace; font-weight: 700; color: #16a34a;">+ Rs. ${formatMoney(slip.allowances)}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: 600;">Tax, Absences & Salary Deductions</td>
                    <td style="text-align: right; color: #dc2626; font-weight: 600;">DEDUCTION (-)</td>
                    <td style="text-align: right; font-family: monospace; font-weight: 700; color: #dc2626;">- Rs. ${formatMoney(slip.deductions)}</td>
                  </tr>
                  <tr class="total-row">
                    <td colspan="2">Net Computed Salary</td>
                    <td style="text-align: right; font-family: monospace;">Rs. ${formatMoney(slip.net_salary)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="net-payable-box">
              <div>
                <div class="net-title">Net Salary Payable</div>
                <div style="font-size: 11.5px; color: #4b5563; margin-top: 2px;">
                  Amount Disbursed: <strong>Rs. ${formatMoney(slip.paid_amount)}</strong> &nbsp;|&nbsp; 
                  Remaining Balance: <strong style="color: ${slip.payable_amount > 0 ? '#dc2626' : '#16a34a'};">Rs. ${formatMoney(slip.payable_amount)}</strong>
                </div>
              </div>
              <div class="net-amount">Rs. ${formatMoney(slip.net_salary)}</div>
            </div>

            <div class="table-section">
              <div class="table-title">Disbursement / Settlement History</div>
              <table>
                <thead>
                  <tr>
                    <th>Voucher #</th>
                    <th>Date</th>
                    <th>Payment Mode</th>
                    <th>Account Paid From</th>
                    <th style="text-align: right;">Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  ${paymentsHtml}
                </tbody>
              </table>
            </div>

            ${slip.notes ? `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 12px; margin-bottom: 18px; font-size: 12px;">
              <strong>Notes / Remarks:</strong> ${slip.notes}
            </div>` : ''}

            <div class="signatures">
              <div class="sig-box">Prepared By / HR Officer</div>
              <div class="sig-box">Verified By / Finance Controller</div>
              <div class="sig-box">Employee Signature / Acknowledgment</div>
            </div>

            <div class="footer-note">
              This is a computer-generated official payroll voucher produced by ${storeName}. Valid without physical stamp if electronically authenticated.
            </div>
          </div>
        </body>
      </html>
    `;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.print();
    }
  }, 250);
};
