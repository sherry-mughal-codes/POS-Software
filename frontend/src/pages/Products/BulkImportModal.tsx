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
import { productService } from '../../services/productService';
import { BulkImportResult } from '../../types/product';
import { useSettings } from '../../context/SettingsContext';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currencySymbol } = useSettings();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);
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
      const blob = await productService.downloadImportTemplate();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Product_Bulk_Import_Template.xlsx');
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
        
        // Map header column indices
        const map: Record<string, number> = {};
        headers.forEach((h, idx) => {
          if (h.includes('name') || h.includes('title') || h.includes('item')) map.name = idx;
          else if (h.includes('sku') || h.includes('code')) map.sku = idx;
          else if (h.includes('barcode') || h.includes('ean') || h.includes('upc')) map.barcode = idx;
          else if (h.includes('cat') || h.includes('group') || h.includes('dept')) map.category = idx;
          else if (h.includes('unit') || h.includes('uom')) map.unit = idx;
          else if (h.includes('purchase') || h.includes('cost') || h.includes('buy')) map.purchase_price = idx;
          else if (h.includes('sell') || h.includes('price') || h.includes('retail')) map.selling_price = idx;
          else if (h.includes('open') || h.includes('qty') || h.includes('quantity') || h.includes('stock')) map.opening_stock = idx;
          else if (h.includes('min') || h.includes('alert') || h.includes('threshold')) map.min_stock_level = idx;
          else if (h.includes('desc') || h.includes('note')) map.description = idx;
        });

        const rows: any[] = [];
        for (let i = 1; i < json.length; i++) {
          const rowData = json[i];
          if (!rowData || !rowData.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== '')) {
            continue;
          }
          const rowObj: any = {
            name: map.name !== undefined ? String(rowData[map.name] || '').trim() : String(rowData[0] || '').trim(),
            sku: map.sku !== undefined ? String(rowData[map.sku] || '').trim() : '',
            barcode: map.barcode !== undefined ? String(rowData[map.barcode] || '').trim() : '',
            category: map.category !== undefined ? String(rowData[map.category] || '').trim() : 'General',
            unit: map.unit !== undefined ? String(rowData[map.unit] || '').trim() : 'pcs',
            purchase_price: map.purchase_price !== undefined ? parseFloat(rowData[map.purchase_price]) || 0 : 0,
            selling_price: map.selling_price !== undefined ? parseFloat(rowData[map.selling_price]) || 0 : 0,
            opening_stock: map.opening_stock !== undefined ? parseFloat(rowData[map.opening_stock]) || 0 : 0,
            min_stock_level: map.min_stock_level !== undefined ? parseFloat(rowData[map.min_stock_level]) || 10 : 10,
            description: map.description !== undefined ? String(rowData[map.description] || '').trim() : '',
          };

          if (rowObj.name) {
            rows.push(rowObj);
          }
        }

        if (rows.length === 0) {
          setError('No valid product rows found in the sheet. Please ensure column headers match the template.');
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
      setError('Please select a valid file containing product rows.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res: BulkImportResult = await productService.bulkImport(parsedRows);
      setResult(res);
      if (res.created_count > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Bulk import failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Import Products from Excel / CSV"
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
              <strong style={{ color: 'var(--text-main)' }}>Need the formatted template?</strong>
              <div style={{ color: 'var(--text-muted)' }}>
                Download our sample Excel spreadsheet with pre-configured columns and examples.
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
                Successfully created <strong style={{ color: 'var(--success)' }}>{result.created_count}</strong> products
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
                Done & View Products
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
              onClick={() => document.getElementById('bulk-import-file-input')?.click()}
            >
              <input
                id="bulk-import-file-input"
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
                    Previewing {parsedRows.length} Product(s) to Import:
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary-400)' }}>
                    Auto-completes missing SKU, Category, and Unit
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
                        <th style={{ padding: '0.5rem' }}>Product Name</th>
                        <th style={{ padding: '0.5rem' }}>SKU</th>
                        <th style={{ padding: '0.5rem' }}>Category</th>
                        <th style={{ padding: '0.5rem' }}>Unit</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Cost ({currencySymbol || 'Rs.'})</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Price ({currencySymbol || 'Rs.'})</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Opening Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 50).map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.4rem 0.5rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>{row.name}</td>
                          <td style={{ padding: '0.4rem 0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--primary-400)' }}>
                            {row.sku || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Auto</span>}
                          </td>
                          <td style={{ padding: '0.4rem 0.5rem' }}>{row.category}</td>
                          <td style={{ padding: '0.4rem 0.5rem' }}>{row.unit}</td>
                          <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            {Number(row.purchase_price).toFixed(2)}
                          </td>
                          <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {Number(row.selling_price).toFixed(2)}
                          </td>
                          <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: Number(row.opening_stock) > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                            {row.opening_stock}
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
                Import {parsedRows.length > 0 ? `${parsedRows.length} Products` : 'Products'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
