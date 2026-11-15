// Generic, reusable data table — search, column sort, and pagination over
// an in-memory array (everything in this app is already loaded from
// localStorage synchronously, so there's no server-side paging to wire up;
// this is a real client-side implementation, not a mock of one).
//
// ListModule (the table underneath every GenericModules page: Site Visits,
// Collections, Expenses, Budgets, Targets, Documents, Marketing, Customers,
// Alerts, Messages, Commissions, Follow-ups…) renders through this, so every
// one of those tables gains search/sort/pagination for free. Hand-rolled
// tables (Employee Directory, Task/Report queues) opt in the same way.
import React, { useMemo, useState } from 'react';
import { IconSearch, IconChevronLeft, IconChevronRight } from './icons';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
  /** Value to sort by; defaults to row[key]. Pass `false` to disable sorting this column. */
  sortValue?: ((row: T) => string | number) | false;
}

type Row = Record<string, any> & { id: string };

export function DataTable<T extends Row>({
  columns, rows, searchKeys, searchPlaceholder = 'Search…', renderActions, actionsLabel = 'Actions',
  pageSize = 8, stickyHeader, emptyState, onRowClick,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** Fields to match against the search box. Omit to hide the search box entirely. */
  searchKeys?: string[];
  searchPlaceholder?: string;
  renderActions?: (row: T) => React.ReactNode;
  actionsLabel?: string;
  pageSize?: number;
  stickyHeader?: boolean;
  /** Shown when `rows` is empty (before any search/filter is applied). */
  emptyState: React.ReactNode;
  onRowClick?: (row: T) => void;
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!query.trim() || !searchKeys || searchKeys.length === 0) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
  }, [rows, query, searchKeys]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    const getValue = col?.sortValue !== false ? (col?.sortValue || ((r: T) => r[sort.key])) : null;
    if (!getValue) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = getValue(a); const bv = getValue(b);
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  const toggleSort = (key: string, sortable: boolean) => {
    if (!sortable) return;
    setPage(1);
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  if (rows.length === 0) return <>{emptyState}</>;

  return (
    <div>
      {searchKeys && searchKeys.length > 0 && (
        <div className="input-with-icon mb-3" style={{ width: '100%', maxWidth: 320 }}>
          <IconSearch size={15} />
          <input
            className="input"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            aria-label={searchPlaceholder}
          />
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="empty-state">No matches for "{query}".</div>
      ) : (
        <div className="table-wrap">
          <table className={`table table-row-hover${stickyHeader ? ' table-sticky-head' : ''}`}>
            <thead>
              <tr>
                {columns.map((c) => {
                  const sortable = c.sortValue !== false;
                  const active = sort?.key === c.key;
                  return (
                    <th
                      key={c.key}
                      style={c.align === 'right' ? { textAlign: 'right' } : undefined}
                      className={sortable ? 'th-sortable' : undefined}
                      onClick={() => toggleSort(c.key, sortable)}
                      aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : sortable ? 'none' : undefined}
                      tabIndex={sortable ? 0 : undefined}
                      role={sortable ? 'button' : undefined}
                      onKeyDown={sortable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort(c.key, sortable); } } : undefined}
                    >
                      <span className="th-sort-label">
                        {c.label}
                        {sortable && <span className={`th-sort-icon${active ? ' active' : ''}`}>{active ? (sort!.dir === 'asc' ? '↑' : '↓') : '↕'}</span>}
                      </span>
                    </th>
                  );
                })}
                {renderActions && <th style={{ textAlign: 'right' }}>{actionsLabel}</th>}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id} onClick={onRowClick ? () => onRowClick(row) : undefined} style={onRowClick ? { cursor: 'pointer' } : undefined}>
                  {columns.map((c) => (
                    <td key={c.key} style={c.align === 'right' ? { textAlign: 'right' } : undefined}>
                      {c.render ? c.render(row) : (row[c.key] ?? '—')}
                    </td>
                  ))}
                  {renderActions && <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>{renderActions(row)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sorted.length > pageSize && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-muted">
            Showing {(clampedPage - 1) * pageSize + 1}–{Math.min(clampedPage * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-icon btn-sm" disabled={clampedPage <= 1} onClick={() => setPage(clampedPage - 1)} aria-label="Previous page">
              <IconChevronLeft size={15} />
            </button>
            <span className="text-sm text-muted">{clampedPage} / {totalPages}</span>
            <button className="btn btn-ghost btn-icon btn-sm" disabled={clampedPage >= totalPages} onClick={() => setPage(clampedPage + 1)} aria-label="Next page">
              <IconChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
