import React, { useState } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { contactService } from '../../services/contactService';
import { ContactBulkImportResult } from '../../types/contact';
import { useSettings } from '../../context/SettingsContext';

interface SupplierBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SupplierBulkImportModal: React.FC<SupplierBulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currencySymbol } = useSettings();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ContactBulkImportResult | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const resetState = () => {
    setFile(null);
    setParsedRows([]);
    setLoading(false);
    setError(null);
    setResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const blob = await contactService.downloadSupplierTemplate();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Supplier_Bulk_Import_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      setError('Failed to download template. Please try again.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    parseSelectedFile(selectedFile);
  };

  const parseSelectedFile = (selectedFile: File) => {
    setError(null);
    setResult(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (!json || json.length < 2) {
          setError('The uploaded file is empty or does not contain data rows.');
          setParsedRows([]);
          return;
        }

        const headers = (json[0] || []).map((h: any) => String(h || '').trim().toLowerCase());

        const map: Record<string, number> = {};
        headers.forEach((h, idx) => {
          if (h.includes('company') || h.includes('business') || h.includes('firm') || h.includes('vendor')) map.company_name = idx;
          else if (h.includes('name') || h.includes('contact') || h.includes('person')) map.name = idx;
          else if (h.includes('code') || h.includes('id')) map.supplier_id = idx;
          else if (h.includes('phone') || h.includes('mobile') || h.includes('tel') || h.includes('cell')) map.phone = idx;
          else if (h.includes('email') || h.includes('mail')) map.email = idx;
          else if (h.includes('address') || h.includes('factory') || h.includes('office') || h.includes('city')) map.address = idx;
          else if (h.includes('tax') || h.includes('ntn') || h.includes('strn')) map.tax_id = idx;
          else if (h.includes('open') || h.includes('balance') || h.includes('payable')) map.opening_balance = idx;
          else if (h.includes('note') || h.includes('remark') || h.includes('term') || h.includes('desc')) map.notes = idx;
        });

        const rows: any[] = [];
        for (let i = 1; i < json.length; i++) {
          const rowData = json[i];
          if (!rowData || !rowData.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== '')) {
            continue;
          }
          const rowObj: any = {
            company_name: map.company_name !== undefined ? String(rowData[map.company_name] || '').trim() : '',
            name: map.name !== undefined ? String(rowData[map.name] || '').trim() : String(rowData[0] || '').trim(),
            supplier_id: map.supplier_id !== undefined ? String(rowData[map.supplier_id] || '').trim() : '',
            phone: map.phone !== undefined ? String(rowData[map.phone] || '').trim() : '',
            email: map.email !== undefined ? String(rowData[map.email] || '').trim() : '',
            address: map.address !== undefined ? String(rowData[map.address] || '').trim() : '',
            tax_id: map.tax_id !== undefined ? String(rowData[map.tax_id] || '').trim() : '',
            opening_balance: map.opening_balance !== undefined ? parseFloat(rowData[map.opening_balance]) || 0 : 0,
            notes: map.notes !== undefined ? String(rowData[map.notes] || '').trim() : '',
          };

          if (rowObj.name || rowObj.company_name) {
            if (!rowObj.name) rowObj.name = rowObj.company_name;
            rows.push(rowObj);
          }
        }

        if (rows.length === 0) {
          setError('No valid supplier rows found in the sheet. Please ensure column headers match the template.');
        }

        setParsedRows(rows);
      } catch (err: any) {
        setError(`Failed to read file: ${err?.message || 'Invalid format'}`);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleStartImport = async () => {
    if (parsedRows.length === 0) {
      setError('Please select a valid file containing supplier records.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res: ContactBulkImportResult = await contactService.bulkImportSuppliers(parsedRows);
      setResult(res);
      if (res.created_count > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Supplier bulk import failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Import Suppliers from Excel / CSV"
      maxWidth="850px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Step 1: Download Template Banner */}
        <div style={{
          padding: '0.875rem 1rem',
          backgroundColor: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '0.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <FileSpreadsheet size={20} color="var(--primary-400)" />
            <div style={{ fontSize: '0.8125rem' }}>
              <strong style={{ color: 'var(--text-main)' }}>Need the formatted supplier template?</strong>
              <div style={{ color: 'var(--text-muted)' }}>
                Download our sample Excel spreadsheet with pre-configured headers and example vendor rows.
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            icon={<Download size={14} />}
            loading={downloadingTemplate}
            onClick={handleDownloadTemplate}
          >
            Download Excel Template
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid var(--danger)',
            borderRadius: '0.5rem',
            color: 'var(--danger)',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Report State */}
        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              padding: '1.25rem',
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid var(--success)',
              borderRadius: '0.5rem',
              textAlign: 'center',
            }}>
              <CheckCircle2 size={36} color="var(--success)" style={{ margin: '0 auto 0.5rem auto' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                Import Completed!
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Successfully created <strong style={{ color: 'var(--success)' }}>{result.created_count}</strong> suppliers
                {result.skipped_count > 0 && <span> ({result.skipped_count} skipped/duplicates)</span>}.
              </p>
            </div>

            {result.errors.length > 0 && (
              <div style={{
                maxHeight: '150px',
                overflowY: 'auto',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-app)',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                color: 'var(--warning)',
              }}>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Skipped Items / Warnings:</strong>
                {result.errors.map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="primary" onClick={handleClose}>
                Done & View Suppliers
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* File Dropzone Area */}
            <div
              style={{
                border: '2px dashed var(--border-medium)',
                borderRadius: '0.75rem',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-app)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => document.getElementById('supplier-bulk-import-file-input')?.click()}
            >
              <input
                id="supplier-bulk-import-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Upload size={32} color="var(--primary-400)" style={{ margin: '0 auto 0.75rem auto' }} />
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                {file ? file.name : 'Click to select or drag & drop Excel / CSV file'}
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
              </p>
            </div>

            {/* Parsed Rows Preview Table */}
            {parsedRows.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Previewing {parsedRows.length} Supplier(s) to Import:
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary-400)' }}>
                    Sequential Supplier IDs (SUP-XXXXX) are generated automatically
                  </span>
                </div>

                <div style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.5rem',
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-medium)' }}>
                      <tr>
                        <th style={{ padding: '0.5rem' }}>#</th>
                        <th style={{ padding: '0.5rem' }}>Contact Name</th>
                        <th style={{ padding: '0.5rem' }}>Company Name</th>
                        <th style={{ padding: '0.5rem' }}>Phone</th>
                        <th style={{ padding: '0.5rem' }}>Email</th>
                        <th style={{ padding: '0.5rem' }}>Tax / NTN</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Opening Balance ({currencySymbol || 'Rs.'})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 50).map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.4rem 0.5rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>{row.name}</td>
                          <td style={{ padding: '0.4rem 0.5rem' }}>{row.company_name || '-'}</td>
                          <td style={{ padding: '0.4rem 0.5rem' }}>{row.phone || '-'}</td>
                          <td style={{ padding: '0.4rem 0.5rem' }}>{row.email || '-'}</td>
                          <td style={{ padding: '0.4rem 0.5rem' }}>{row.tax_id || '-'}</td>
                          <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: Number(row.opening_balance) > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                            {Number(row.opening_balance).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 50 && (
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                    Showing first 50 of {parsedRows.length} rows...
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={<Upload size={16} />}
                loading={loading}
                disabled={parsedRows.length === 0}
                onClick={handleStartImport}
              >
                Import {parsedRows.length > 0 ? `${parsedRows.length} Suppliers` : 'Suppliers'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
