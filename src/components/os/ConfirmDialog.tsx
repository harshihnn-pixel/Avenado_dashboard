// A styled confirmation step for destructive actions (delete a record,
// reject a submission, reset all demo data) — built on the same Modal
// primitive so it inherits its focus trap / Escape-to-close / overlay
// click-to-dismiss behaviour, rather than a native window.confirm().
import React from 'react';
import { Modal } from './Modal';

export function ConfirmDialog({
  title, message, confirmLabel = 'Confirm', tone = 'danger', onConfirm, onCancel,
}: {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel} width={420}>
      <div className="text-sm" style={{ color: 'var(--av-text)' }}>{message}</div>
      <div className="flex justify-between mt-5">
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} autoFocus>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
