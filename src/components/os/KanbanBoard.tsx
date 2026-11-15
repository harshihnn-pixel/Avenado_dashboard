import React, { useState } from 'react';
import type { Row } from '@/lib/os/useLocalCollection';

export function KanbanBoard({
  columns, items, onMove, renderCard, cardTitleKey = 'title',
}: {
  columns: string[];
  items: Row[];
  onMove: (id: string, toColumn: string) => void;
  renderCard?: (row: Row) => React.ReactNode;
  cardTitleKey?: string;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  return (
    <div className="flex gap-4" style={{ overflowX: 'auto', paddingBottom: 8 }}>
      {columns.map((col) => {
        const colItems = items.filter((i) => i.stage === col);
        return (
          <div
            key={col}
            className={`kanban-col${overCol === col ? ' drag-over' : ''}`}
            style={{ flex: '0 0 272px' }}
            onDragOver={(e) => { e.preventDefault(); setOverCol(col); }}
            onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) onMove(dragId, col);
              setDragId(null);
              setOverCol(null);
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <strong className="text-sm">{col}</strong>
              <span className="badge badge-neutral">{colItems.length}</span>
            </div>
            {colItems.length === 0 && <div className="text-sm text-muted p-2">No items</div>}
            {colItems.map((item) => (
              <div
                key={item.id}
                className={`kanban-card${dragId === item.id ? ' dragging' : ''}`}
                draggable
                onDragStart={() => setDragId(item.id)}
                onDragEnd={() => { setDragId(null); setOverCol(null); }}
              >
                {renderCard ? renderCard(item) : <strong>{item[cardTitleKey]}</strong>}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
