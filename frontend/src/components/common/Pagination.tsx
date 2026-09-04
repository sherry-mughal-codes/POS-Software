import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  style?: React.CSSProperties;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize = 50,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100, 200],
  className = '',
  style = {},
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startRecord = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(totalItems, safeCurrentPage * pageSize);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let start = Math.max(2, safeCurrentPage - 1);
      let end = Math.min(totalPages - 1, safeCurrentPage + 1);

      if (safeCurrentPage <= 3) {
        end = 4;
      } else if (safeCurrentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.625rem 0.75rem',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.78125rem',
        color: 'var(--text-muted)',
        ...style,
      }}
    >
      {/* Records count indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>
          Showing <strong style={{ color: 'var(--text-main)', fontWeight: 700 }}>{startRecord}</strong> to{' '}
          <strong style={{ color: 'var(--text-main)', fontWeight: 700 }}>{endRecord}</strong> of{' '}
          <strong style={{ color: 'var(--text-main)', fontWeight: 700 }}>{totalItems.toLocaleString()}</strong> records
        </span>

        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.5rem' }}>
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.25rem',
                padding: '0.15rem 0.35rem',
                fontSize: '0.75rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage === 1}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '28px',
            height: '28px',
            padding: '0 0.35rem',
            borderRadius: '0.375rem',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'transparent',
            color: safeCurrentPage === 1 ? 'var(--text-subtle)' : 'var(--text-main)',
            cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: safeCurrentPage === 1 ? 0.4 : 1,
            transition: 'all 0.15s ease',
          }}
          title="First Page"
        >
          <ChevronsLeft size={14} />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '28px',
            height: '28px',
            padding: '0 0.35rem',
            borderRadius: '0.375rem',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'transparent',
            color: safeCurrentPage === 1 ? 'var(--text-subtle)' : 'var(--text-main)',
            cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: safeCurrentPage === 1 ? 0.4 : 1,
            transition: 'all 0.15s ease',
          }}
          title="Previous Page"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Page Numbers */}
        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  minWidth: '24px',
                  textAlign: 'center',
                  color: 'var(--text-subtle)',
                  userSelect: 'none',
                }}
              >
                ...
              </span>
            );
          }

          const isCurrent = p === safeCurrentPage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(Number(p))}
              style={{
                minWidth: '28px',
                height: '28px',
                padding: '0 0.35rem',
                borderRadius: '0.375rem',
                border: isCurrent ? 'none' : '1px solid var(--border-subtle)',
                backgroundColor: isCurrent ? 'var(--primary-500)' : 'transparent',
                color: isCurrent ? '#ffffff' : 'var(--text-main)',
                fontWeight: isCurrent ? 800 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {p}
            </button>
          );
        })}

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '28px',
            height: '28px',
            padding: '0 0.35rem',
            borderRadius: '0.375rem',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'transparent',
            color: safeCurrentPage === totalPages ? 'var(--text-subtle)' : 'var(--text-main)',
            cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: safeCurrentPage === totalPages ? 0.4 : 1,
            transition: 'all 0.15s ease',
          }}
          title="Next Page"
        >
          <ChevronRight size={14} />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safeCurrentPage === totalPages}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '28px',
            height: '28px',
            padding: '0 0.35rem',
            borderRadius: '0.375rem',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'transparent',
            color: safeCurrentPage === totalPages ? 'var(--text-subtle)' : 'var(--text-main)',
            cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: safeCurrentPage === totalPages ? 0.4 : 1,
            transition: 'all 0.15s ease',
          }}
          title="Last Page"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
};
