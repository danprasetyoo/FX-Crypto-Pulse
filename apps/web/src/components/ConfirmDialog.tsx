import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Dialog konfirmasi wajib untuk aksi destruktif (Design System bagian 4). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Hapus',
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      if (typeof el.showModal === 'function') el.showModal();
      else el.setAttribute('open', '');
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="confirm"
      onClose={onCancel}
      data-testid="confirm-dialog"
      aria-labelledby="confirm-title"
    >
      <h3 id="confirm-title">{title}</h3>
      <p>{description}</p>
      <div className="form-actions">
        <button
          type="button"
          className="btn btn--danger"
          onClick={onConfirm}
          data-testid="confirm-yes"
        >
          {confirmText}
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Batal
        </button>
      </div>
    </dialog>
  );
}
