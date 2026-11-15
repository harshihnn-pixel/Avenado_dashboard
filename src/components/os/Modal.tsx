import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { IconX } from './icons';

export function Modal({ title, onClose, children, width }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className="modal-panel"
          style={width ? { width: `min(${width}px, calc(100vw - 32px))` } : undefined}
          aria-describedby={undefined}
        >
          <div className="modal-head">
            <Dialog.Title className="modal-title">{title}</Dialog.Title>
            <Dialog.Close className="btn btn-ghost btn-icon btn-sm" aria-label="Close dialog">
              <IconX size={16} />
            </Dialog.Close>
          </div>
          <div className="modal-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" />
        <Dialog.Content className="drawer-panel" aria-describedby={undefined}>
          <div className="modal-head">
            <Dialog.Title className="modal-title">{title}</Dialog.Title>
            <Dialog.Close className="btn btn-ghost btn-icon btn-sm" aria-label="Close">
              <IconX size={16} />
            </Dialog.Close>
          </div>
          <div className="modal-body" style={{ flex: 1 }}>{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
